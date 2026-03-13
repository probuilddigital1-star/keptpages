/**
 * Gemini 2.0 Flash integration for fast document/recipe extraction.
 * Sends one or more images to the Gemini API with a structured prompt
 * and returns parsed JSON extraction results.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const EXTRACTION_PROMPT = `You are an expert document analyzer specializing in recipes, handwritten notes, and printed text.

Analyze this image and extract all text content into structured JSON format.

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
  "notes": "Context about the document (e.g., appears to be a letter from the 1960s)",
  "confidence": 0.90,
  "warnings": []
}

Important guidelines:
- Preserve original spelling and formatting where possible
- If text is partially illegible, include your best guess in [brackets] and add a warning
- Set confidence between 0.0 and 1.0 based on text clarity
- Add warnings for any issues (e.g., "Partially obscured text in bottom-right", "Handwriting difficult to read in section 3")
- For recipes, try to separate ingredients from instructions even if they are not clearly delineated
- Return ONLY valid JSON, no markdown or other formatting`;

const MULTI_PAGE_PROMPT_PREFIX = `You are analyzing multiple pages/images of the SAME document. Combine all content into a single unified extraction. For recipes, merge all ingredients into one list and all instructions into one sequential list. For letters or documents, combine the text in page order into one continuous document.

`;

/**
 * Convert an ArrayBuffer to a base64 string.
 */
export function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Send one or more images to Gemini 2.5 Flash for text extraction.
 *
 * @param {Array<{buffer: ArrayBuffer, mimeType: string}>} images - Array of image data
 * @param {object} env - Worker environment bindings
 * @returns {Promise<object>} Parsed extraction result
 */
export async function sendToGemini(images, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Build image parts
  const imageParts = images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: arrayBufferToBase64(img.buffer),
    },
  }));

  const isMultiPage = images.length > 1;
  const prompt = isMultiPage
    ? MULTI_PAGE_PROMPT_PREFIX + EXTRACTION_PROMPT
    : EXTRACTION_PROMPT;

  const requestBody = {
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: isMultiPage ? 8192 : 4096,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Extract the text content from Gemini's response
  const candidates = result.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates returned from Gemini');
  }

  const textContent = candidates[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('No text content in Gemini response');
  }

  // Parse the JSON response
  try {
    // Clean up potential markdown code fences
    let cleaned = textContent.trim();
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

    // Ensure required fields exist
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
      source: 'gemini-2.5-flash',
    };
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini response as JSON: ${parseErr.message}`);
  }
}
