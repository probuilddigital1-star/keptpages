/**
 * Claude Sonnet integration for fallback/reprocessing of document extraction.
 * Used when Gemini Flash results are low-confidence or when a user requests
 * reprocessing with the higher-quality model.
 */

import { arrayBufferToBase64 } from './gemini.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const MULTI_PAGE_PROMPT_PREFIX = `You are analyzing multiple pages/images of the SAME document. Combine all content into a single unified extraction. For recipes, merge all ingredients into one list and all instructions into one sequential list. For letters or documents, combine the text in page order into one continuous document.

`;

/**
 * Build the extraction prompt, optionally including context from a prior
 * Gemini result that had issues.
 */
function buildPrompt(previousResult, isMultiPage) {
  let prompt = '';

  if (isMultiPage) {
    prompt += MULTI_PAGE_PROMPT_PREFIX;
  }

  prompt += `You are an expert document analyzer specializing in recipes, handwritten notes, and printed text.

Analyze this image carefully and extract all text content into structured JSON format.`;

  if (previousResult) {
    prompt += `

A previous AI extraction attempt produced the following result, but it may have errors or low confidence. Use it as a reference but re-analyze the image from scratch:

Previous result:
${JSON.stringify(previousResult, null, 2)}

Please correct any errors and fill in any missing information.`;
  }

  prompt += `

Determine the document type and extract accordingly:

For RECIPES, return:
{
  "type": "recipe",
  "title": "Recipe name",
  "ingredients": [
    { "item": "ingredient name", "amount": "quantity", "unit": "measurement unit" }
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "notes": "Any additional notes, tips, or commentary",
  "servings": "Number of servings if mentioned",
  "prepTime": "Prep time if mentioned",
  "cookTime": "Cook time if mentioned",
  "content": "Full raw text as transcribed",
  "confidence": 0.95,
  "warnings": []
}

For GENERAL DOCUMENTS (letters, notes, lists, etc.), return:
{
  "type": "document",
  "title": "Document title or first line",
  "content": "Full transcribed text preserving paragraphs and formatting",
  "notes": "Context about the document",
  "confidence": 0.90,
  "warnings": []
}

Important guidelines:
- Preserve original spelling and formatting where possible
- If text is partially illegible, include your best guess in [brackets] and add a warning
- Set confidence between 0.0 and 1.0 based on text clarity
- Add warnings for any issues
- For recipes, carefully separate ingredients from instructions
- Return ONLY valid JSON, no markdown or other formatting`;

  return prompt;
}

/**
 * Send one or more images to Claude Sonnet for text extraction.
 * This is the higher-quality fallback model used for reprocessing.
 *
 * @param {Array<{buffer: ArrayBuffer, mimeType: string}>} images - Array of image data
 * @param {object|null} previousResult - Previous Gemini result for context
 * @param {object} env - Worker environment bindings
 * @returns {Promise<object>} Parsed extraction result
 */
export async function sendToClaude(images, previousResult, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Validate supported media types for Claude
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  for (const img of images) {
    if (!supportedTypes.includes(img.mimeType)) {
      throw new Error(`Unsupported image type for Claude: ${img.mimeType}. Supported: ${supportedTypes.join(', ')}`);
    }
  }

  const isMultiPage = images.length > 1;
  const prompt = buildPrompt(previousResult, isMultiPage);

  // Build content array: image blocks then text
  const contentParts = images.map((img) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mimeType,
      data: arrayBufferToBase64(img.buffer),
    },
  }));

  contentParts.push({
    type: 'text',
    text: prompt,
  });

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: isMultiPage ? 8192 : 4096,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Extract text from Claude's response
  const textBlock = result.content?.find((block) => block.type === 'text');
  if (!textBlock?.text) {
    throw new Error('No text content in Claude response');
  }

  // Parse the JSON response
  try {
    let cleaned = textBlock.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    return {
      type: parsed.type || 'document',
      title: parsed.title || 'Untitled',
      ingredients: parsed.ingredients || [],
      instructions: parsed.instructions || [],
      notes: parsed.notes || '',
      content: parsed.content || '',
      servings: parsed.servings || null,
      prepTime: parsed.prepTime || null,
      cookTime: parsed.cookTime || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      source: 'claude-sonnet',
    };
  } catch (parseErr) {
    throw new Error(`Failed to parse Claude response as JSON: ${parseErr.message}`);
  }
}
