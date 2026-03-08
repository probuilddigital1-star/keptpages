/**
 * Scan pipeline routes.
 * Handles image uploads, AI processing (Gemini + Claude fallback),
 * and scan result management.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { sendToGemini } from '../services/gemini.js';
import { sendToClaude } from '../services/claude.js';
import { calculateConfidence } from '../services/confidence.js';

const scan = new Hono();

/**
 * Helper to get a Supabase client from the worker environment.
 */
function getSupabase(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * GET /scan
 * List all scans for the authenticated user (most recent first).
 */
scan.get('/', async (c) => {
  const user = c.get('user');
  const supabase = getSupabase(c.env);

  const { data: scans, error } = await supabase
    .from('scans')
    .select('id, title, document_type, confidence_score, original_filename, status, created_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch scans:', error);
    return c.json({ error: 'Failed to fetch scans' }, 500);
  }

  return c.json({
    scans: (scans || []).map((s) => ({
      id: s.id,
      title: s.title,
      documentType: s.document_type,
      confidence: s.confidence_score,
      originalFilename: s.original_filename,
      status: s.status,
      createdAt: s.created_at,
    })),
  });
});

/**
 * POST /scan
 * Accept a multipart image upload, store it in R2, and create a scan record.
 */
scan.post('/', async (c) => {
  const user = c.get('user');
  const env = c.env;
  const supabase = getSupabase(env);

  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400);
  }

  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Missing "image" field in upload' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` },
      400
    );
  }

  // Validate file size (max 20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large. Maximum size is 20MB.' }, 400);
  }

  // Generate a unique key for R2
  const timestamp = Date.now();
  const ext = file.name?.split('.').pop() || 'jpg';
  const r2Key = `${user.id}/${timestamp}-${crypto.randomUUID()}.${ext}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.UPLOADS.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      userId: user.id,
      originalName: file.name || 'upload',
    },
  });

  // Create scan record in Supabase
  const { data: scanRecord, error: dbError } = await supabase
    .from('scans')
    .insert({
      user_id: user.id,
      r2_key: r2Key,
      original_filename: file.name || 'upload',
      mime_type: file.type,
      file_size: file.size,
      status: 'uploaded',
    })
    .select()
    .single();

  if (dbError) {
    // Roll back the R2 upload to avoid orphaned objects
    await env.UPLOADS.delete(r2Key).catch(() => {});
    console.error('Failed to create scan record:', dbError);
    return c.json({ error: 'Failed to create scan record' }, 500);
  }

  return c.json(
    {
      id: scanRecord.id,
      status: scanRecord.status,
      r2Key,
      originalFilename: scanRecord.original_filename,
      createdAt: scanRecord.created_at,
    },
    201
  );
});

/**
 * POST /scan/:id/process
 * Fetch the uploaded image from R2 and send it to Gemini Flash for extraction.
 */
scan.post('/:id/process', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Fetch the scan record
  const { data: scanRecord, error: fetchError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !scanRecord) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  // Atomic claim: only transition to 'processing' if not already processing
  const { data: claimed, error: claimError } = await supabase
    .from('scans')
    .update({ status: 'processing', processed_at: null })
    .eq('id', scanId)
    .neq('status', 'processing')
    .select('id')
    .single();

  if (claimError || !claimed) {
    return c.json({ error: 'Scan is already being processed' }, 409);
  }

  try {
    // Fetch image from R2
    const r2Object = await env.UPLOADS.get(scanRecord.r2_key);
    if (!r2Object) {
      await supabase.from('scans').update({ status: 'error', error_message: 'Image not found in storage' }).eq('id', scanId);
      return c.json({ error: 'Image not found in storage' }, 404);
    }

    const imageBuffer = await r2Object.arrayBuffer();

    // Send to Gemini Flash
    const extractedData = await sendToGemini(imageBuffer, scanRecord.mime_type, env);

    // Calculate adjusted confidence
    const { score: confidenceScore, warnings } = calculateConfidence(extractedData);

    // Store processed image in PROCESSED bucket if needed
    const processedKey = `${user.id}/processed/${scanId}.json`;
    await env.PROCESSED.put(processedKey, JSON.stringify(extractedData), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Update scan record with results
    const { data: updated, error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        extracted_data: extractedData,
        document_type: extractedData.type,
        title: extractedData.title,
        confidence_score: confidenceScore,
        warnings,
        ai_model: 'gemini-2.5-flash',
        processed_key: processedKey,
        processed_at: new Date().toISOString(),
      })
      .eq('id', scanId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update scan record:', updateError);
      return c.json({ error: 'Failed to save extraction results' }, 500);
    }

    return c.json({
      id: updated.id,
      status: updated.status,
      documentType: extractedData.type,
      title: extractedData.title,
      confidence: confidenceScore,
      warnings,
      extractedData,
      aiModel: 'gemini-2.5-flash',
      processedAt: updated.processed_at,
    });
  } catch (err) {
    console.error('Processing error:', err);

    await supabase
      .from('scans')
      .update({
        status: 'error',
        error_message: err.message,
      })
      .eq('id', scanId);

    return c.json({ error: 'Processing failed', details: err.message }, 500);
  }
});

/**
 * POST /scan/:id/reprocess
 * Re-process using Claude Sonnet as a higher-quality fallback.
 */
scan.post('/:id/reprocess', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  // Fetch the scan record (must exist and belong to user)
  const { data: scanRecord, error: fetchError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !scanRecord) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  // Atomic claim: only transition to 'reprocessing' if not already in progress
  const { data: claimed, error: claimError } = await supabase
    .from('scans')
    .update({ status: 'reprocessing' })
    .eq('id', scanId)
    .neq('status', 'processing')
    .neq('status', 'reprocessing')
    .select('id')
    .single();

  if (claimError || !claimed) {
    return c.json({ error: 'Scan is already being processed' }, 409);
  }

  try {
    // Fetch image from R2
    const r2Object = await env.UPLOADS.get(scanRecord.r2_key);
    if (!r2Object) {
      await supabase.from('scans').update({ status: 'error', error_message: 'Image not found in storage' }).eq('id', scanId);
      return c.json({ error: 'Image not found in storage' }, 404);
    }

    const imageBuffer = await r2Object.arrayBuffer();

    // Previous result for context
    const previousResult = scanRecord.extracted_data || null;

    // Send to Claude Sonnet
    const extractedData = await sendToClaude(imageBuffer, scanRecord.mime_type, previousResult, env);

    // Calculate adjusted confidence
    const { score: confidenceScore, warnings } = calculateConfidence(extractedData);

    // Store updated results
    const processedKey = `${user.id}/processed/${scanId}-reprocessed.json`;
    await env.PROCESSED.put(processedKey, JSON.stringify(extractedData), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Update scan record
    const { data: updated, error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        extracted_data: extractedData,
        document_type: extractedData.type,
        title: extractedData.title,
        confidence_score: confidenceScore,
        warnings,
        ai_model: 'claude-sonnet',
        processed_key: processedKey,
        processed_at: new Date().toISOString(),
      })
      .eq('id', scanId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update scan record:', updateError);
      return c.json({ error: 'Failed to save reprocessing results' }, 500);
    }

    return c.json({
      id: updated.id,
      status: updated.status,
      documentType: extractedData.type,
      title: extractedData.title,
      confidence: confidenceScore,
      warnings,
      extractedData,
      aiModel: 'claude-sonnet',
      processedAt: updated.processed_at,
    });
  } catch (err) {
    console.error('Reprocessing error:', err);

    await supabase
      .from('scans')
      .update({
        status: 'error',
        error_message: err.message,
      })
      .eq('id', scanId);

    return c.json({ error: 'Reprocessing failed', details: err.message }, 500);
  }
});

/**
 * GET /scan/:id
 * Get a scan record with its extracted data.
 */
scan.get('/:id', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { data: scanRecord, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (error || !scanRecord) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  return c.json({
    id: scanRecord.id,
    status: scanRecord.status,
    documentType: scanRecord.document_type,
    title: scanRecord.title,
    originalFilename: scanRecord.original_filename,
    mimeType: scanRecord.mime_type,
    fileSize: scanRecord.file_size,
    confidence: scanRecord.confidence_score,
    warnings: scanRecord.warnings,
    extractedData: scanRecord.extracted_data,
    aiModel: scanRecord.ai_model,
    errorMessage: scanRecord.error_message,
    createdAt: scanRecord.created_at,
    processedAt: scanRecord.processed_at,
  });
});

/**
 * GET /scan/:id/image
 * Serve the original scan image from R2.
 */
scan.get('/:id/image', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const env = c.env;
  const supabase = getSupabase(env);

  const { data: scanRecord, error } = await supabase
    .from('scans')
    .select('r2_key, mime_type')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (error || !scanRecord) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  const r2Object = await env.UPLOADS.get(scanRecord.r2_key);
  if (!r2Object) {
    return c.json({ error: 'Image not found in storage' }, 404);
  }

  return new Response(r2Object.body, {
    headers: {
      'Content-Type': scanRecord.mime_type || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

/**
 * PUT /scan/:id
 * Update extracted text fields (user corrections).
 */
scan.put('/:id', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const supabase = getSupabase(c.env);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // First verify the scan belongs to the user
  const { data: existing, error: fetchError } = await supabase
    .from('scans')
    .select('id, extracted_data')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  // Merge user edits into the extracted data
  const updatedData = { ...(existing.extracted_data || {}) };

  // Allow updating specific fields
  const editableFields = ['title', 'content', 'ingredients', 'instructions', 'notes', 'type', 'servings', 'prepTime', 'cookTime'];
  for (const field of editableFields) {
    if (body[field] !== undefined) {
      updatedData[field] = body[field];
    }
  }

  // Recalculate confidence after edits
  const { score: confidenceScore, warnings } = calculateConfidence(updatedData);

  const updatePayload = {
    extracted_data: updatedData,
    confidence_score: confidenceScore,
    warnings,
    updated_at: new Date().toISOString(),
  };

  // Also update top-level fields if provided
  if (body.title !== undefined) {
    updatePayload.title = body.title;
  }
  if (body.type !== undefined) {
    updatePayload.document_type = body.type;
  }

  const { data: updated, error: updateError } = await supabase
    .from('scans')
    .update(updatePayload)
    .eq('id', scanId)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update scan:', updateError);
    return c.json({ error: 'Failed to update scan' }, 500);
  }

  return c.json({
    id: updated.id,
    status: updated.status,
    documentType: updated.document_type,
    title: updated.title,
    confidence: updated.confidence_score,
    warnings: updated.warnings,
    extractedData: updated.extracted_data,
    updatedAt: updated.updated_at,
  });
});

/**
 * DELETE /scan/:id
 * Soft-delete a scan (sets deleted_at timestamp).
 */
scan.delete('/:id', async (c) => {
  const user = c.get('user');
  const scanId = c.req.param('id');
  const supabase = getSupabase(c.env);

  // Verify ownership
  const { data: scanRecord, error: fetchError } = await supabase
    .from('scans')
    .select('id, r2_key')
    .eq('id', scanId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (fetchError || !scanRecord) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  // Remove from any collections first
  await supabase
    .from('collection_items')
    .delete()
    .eq('scan_id', scanId);

  // Soft-delete the scan
  const { error: deleteError } = await supabase
    .from('scans')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', scanId);

  if (deleteError) {
    console.error('Failed to delete scan:', deleteError);
    return c.json({ error: 'Failed to delete scan' }, 500);
  }

  return c.json({ success: true });
});

export default scan;
