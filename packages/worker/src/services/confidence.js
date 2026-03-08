/**
 * Confidence scoring service.
 * Takes AI-extracted data and adjusts the confidence score based on
 * heuristic checks for completeness and quality.
 */

/**
 * Calculate an adjusted confidence score with warnings.
 *
 * @param {object} extractedData - The data returned from Gemini or Claude
 * @returns {{ score: number, warnings: string[] }}
 */
export function calculateConfidence(extractedData) {
  const warnings = [...(extractedData.warnings || [])];

  // Start from AI-reported confidence
  let score = typeof extractedData.confidence === 'number' ? extractedData.confidence : 0.5;

  const isRecipe = extractedData.type === 'recipe';

  // --- Penalties ---

  // Missing title
  if (!extractedData.title || extractedData.title === 'Untitled' || extractedData.title.trim() === '') {
    score -= 0.1;
    warnings.push('No title could be identified');
  }

  // Recipe without ingredients
  if (isRecipe && (!extractedData.ingredients || extractedData.ingredients.length === 0)) {
    score -= 0.25;
    warnings.push('No ingredients detected for recipe');
  }

  // Recipe without instructions
  if (isRecipe && (!extractedData.instructions || extractedData.instructions.length === 0)) {
    score -= 0.2;
    warnings.push('No instructions detected for recipe');
  }

  // Very short content (less than 50 chars suggests poor extraction)
  if (!extractedData.content || extractedData.content.length < 50) {
    score -= 0.15;
    warnings.push('Extracted content is very short, may be incomplete');
  }

  // --- Bonuses ---

  // Recipe with both ingredients and instructions (well-structured)
  if (
    isRecipe &&
    extractedData.ingredients &&
    extractedData.ingredients.length > 0 &&
    extractedData.instructions &&
    extractedData.instructions.length > 0
  ) {
    score += 0.05;
  }

  // Detailed content (over 500 chars suggests thorough extraction)
  if (extractedData.content && extractedData.content.length > 500) {
    score += 0.05;
  }

  // Clamp score to [0, 1]
  score = Math.max(0, Math.min(1, score));

  // Round to 2 decimal places
  score = Math.round(score * 100) / 100;

  return { score, warnings };
}
