/**
 * Tests for the confidence scoring service.
 * @see ../services/confidence.js
 */

import { calculateConfidence } from '../services/confidence.js';

describe('calculateConfidence', () => {
  // ---------- AI-reported confidence ----------
  describe('AI-reported confidence', () => {
    it('returns the AI-reported confidence when all data is present', () => {
      const data = {
        confidence: 0.92,
        type: 'recipe',
        title: 'Chocolate Cake',
        ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
        instructions: ['Mix flour and sugar', 'Bake at 350F'],
        content: 'A'.repeat(600), // over 500 chars to earn bonus
        warnings: [],
      };

      const result = calculateConfidence(data);

      // 0.92 + 0.05 (recipe bonus) + 0.05 (detailed content bonus) = 1.02, clamped to 1.0
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.score).toBeGreaterThan(0.9);
    });

    it('defaults confidence to 0.5 when not a number', () => {
      const data = {
        confidence: 'high',
        title: 'Something',
        content: 'A'.repeat(100),
      };

      const result = calculateConfidence(data);
      // 0.5 base, no recipe penalties
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('defaults confidence to 0.5 when confidence field is missing', () => {
      const data = {
        title: 'Something',
        content: 'A'.repeat(100),
      };

      const result = calculateConfidence(data);
      expect(result.score).toBe(0.5);
    });
  });

  // ---------- Penalties ----------
  describe('penalties', () => {
    it('penalizes missing title (-0.1)', () => {
      const withTitle = calculateConfidence({
        confidence: 0.8,
        title: 'My Recipe',
        content: 'A'.repeat(100),
      });
      const withoutTitle = calculateConfidence({
        confidence: 0.8,
        title: '',
        content: 'A'.repeat(100),
      });

      expect(withTitle.score - withoutTitle.score).toBeCloseTo(0.1, 2);
    });

    it('penalizes "Untitled" as missing title', () => {
      const result = calculateConfidence({
        confidence: 0.8,
        title: 'Untitled',
        content: 'A'.repeat(100),
      });

      expect(result.warnings).toContain('No title could be identified');
    });

    it('penalizes recipe without ingredients (-0.25)', () => {
      const withIngredients = calculateConfidence({
        confidence: 0.8,
        type: 'recipe',
        title: 'Soup',
        ingredients: [{ item: 'water' }],
        instructions: ['Boil'],
        content: 'A'.repeat(100),
      });
      const withoutIngredients = calculateConfidence({
        confidence: 0.8,
        type: 'recipe',
        title: 'Soup',
        ingredients: [],
        instructions: ['Boil'],
        content: 'A'.repeat(100),
      });

      // withIngredients gets +0.05 bonus; withoutIngredients gets -0.25 penalty (no bonus)
      // Difference should be 0.25 + 0.05 = 0.30
      expect(withIngredients.score - withoutIngredients.score).toBeCloseTo(0.3, 2);
    });

    it('penalizes recipe without instructions (-0.2)', () => {
      const withInstructions = calculateConfidence({
        confidence: 0.8,
        type: 'recipe',
        title: 'Soup',
        ingredients: [{ item: 'water' }],
        instructions: ['Boil water'],
        content: 'A'.repeat(100),
      });
      const withoutInstructions = calculateConfidence({
        confidence: 0.8,
        type: 'recipe',
        title: 'Soup',
        ingredients: [{ item: 'water' }],
        instructions: [],
        content: 'A'.repeat(100),
      });

      // withInstructions gets +0.05 bonus; withoutInstructions gets -0.2 penalty (no bonus)
      // Difference should be 0.2 + 0.05 = 0.25
      expect(withInstructions.score - withoutInstructions.score).toBeCloseTo(0.25, 2);
    });

    it('penalizes very short content (-0.15)', () => {
      const longContent = calculateConfidence({
        confidence: 0.8,
        title: 'Note',
        content: 'A'.repeat(100),
      });
      const shortContent = calculateConfidence({
        confidence: 0.8,
        title: 'Note',
        content: 'Short',
      });

      expect(longContent.score - shortContent.score).toBeCloseTo(0.15, 2);
    });

    it('penalizes missing content field', () => {
      const result = calculateConfidence({
        confidence: 0.8,
        title: 'Note',
      });

      expect(result.warnings).toContain(
        'Extracted content is very short, may be incomplete'
      );
    });
  });

  // ---------- Bonuses ----------
  describe('bonuses', () => {
    it('applies bonus for recipe with ingredients + instructions (+0.05)', () => {
      const base = calculateConfidence({
        confidence: 0.8,
        type: 'document',
        title: 'Doc',
        content: 'A'.repeat(100),
      });
      const withRecipeBonus = calculateConfidence({
        confidence: 0.8,
        type: 'recipe',
        title: 'Recipe',
        ingredients: [{ item: 'flour' }],
        instructions: ['Mix'],
        content: 'A'.repeat(100),
      });

      // Recipe with both ingredients and instructions gets +0.05
      expect(withRecipeBonus.score - base.score).toBeCloseTo(0.05, 2);
    });

    it('applies bonus for detailed content over 500 chars (+0.05)', () => {
      const shortDoc = calculateConfidence({
        confidence: 0.8,
        title: 'Doc',
        content: 'A'.repeat(100),
      });
      const longDoc = calculateConfidence({
        confidence: 0.8,
        title: 'Doc',
        content: 'A'.repeat(600),
      });

      expect(longDoc.score - shortDoc.score).toBeCloseTo(0.05, 2);
    });
  });

  // ---------- Clamping ----------
  describe('clamping', () => {
    it('clamps score to minimum of 0 (never negative)', () => {
      const result = calculateConfidence({
        confidence: 0.1,
        type: 'recipe',
        title: '',
        ingredients: [],
        instructions: [],
        content: '',
      });

      expect(result.score).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('clamps score to maximum of 1 (never above 1)', () => {
      const result = calculateConfidence({
        confidence: 0.99,
        type: 'recipe',
        title: 'Perfect Recipe',
        ingredients: [{ item: 'flour' }],
        instructions: ['Step 1'],
        content: 'A'.repeat(600),
      });

      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  // ---------- Warnings ----------
  describe('warnings', () => {
    it('returns appropriate warning messages for each penalty', () => {
      const result = calculateConfidence({
        confidence: 0.9,
        type: 'recipe',
        title: '',
        ingredients: [],
        instructions: [],
        content: 'tiny',
      });

      expect(result.warnings).toContain('No title could be identified');
      expect(result.warnings).toContain('No ingredients detected for recipe');
      expect(result.warnings).toContain('No instructions detected for recipe');
      expect(result.warnings).toContain(
        'Extracted content is very short, may be incomplete'
      );
    });

    it('returns empty warnings for perfect data', () => {
      const result = calculateConfidence({
        confidence: 0.95,
        type: 'recipe',
        title: 'Great Recipe',
        ingredients: [{ item: 'flour' }],
        instructions: ['Mix'],
        content: 'A'.repeat(600),
        warnings: [],
      });

      expect(result.warnings).toHaveLength(0);
    });

    it('preserves existing warnings from extracted data', () => {
      const result = calculateConfidence({
        confidence: 0.8,
        title: 'My Doc',
        content: 'A'.repeat(100),
        warnings: ['Handwriting difficult to read in section 3'],
      });

      expect(result.warnings).toContain(
        'Handwriting difficult to read in section 3'
      );
    });
  });

  // ---------- Null/undefined handling ----------
  describe('null/undefined handling', () => {
    it('handles null fields gracefully', () => {
      const result = calculateConfidence({
        confidence: null,
        title: null,
        ingredients: null,
        instructions: null,
        content: null,
        warnings: null,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('handles undefined fields gracefully', () => {
      const result = calculateConfidence({});

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('handles completely empty object', () => {
      expect(() => calculateConfidence({})).not.toThrow();
    });
  });

  // ---------- Non-recipe documents ----------
  describe('non-recipe documents', () => {
    it('does not apply recipe-specific penalties to letters', () => {
      const result = calculateConfidence({
        confidence: 0.85,
        type: 'letter',
        title: 'Letter to Grandma',
        content: 'A'.repeat(200),
      });

      // Should not have recipe warnings
      expect(result.warnings).not.toContain('No ingredients detected for recipe');
      expect(result.warnings).not.toContain('No instructions detected for recipe');
      expect(result.score).toBe(0.85);
    });

    it('does not apply recipe-specific penalties to journal entries', () => {
      const result = calculateConfidence({
        confidence: 0.9,
        type: 'journal',
        title: 'My Journal Entry',
        content: 'A'.repeat(600),
      });

      // 0.9 + 0.05 (content bonus) = 0.95
      expect(result.score).toBe(0.95);
      expect(result.warnings).toHaveLength(0);
    });

    it('does not apply recipe-specific penalties to artwork documents', () => {
      const result = calculateConfidence({
        confidence: 0.7,
        type: 'artwork',
        title: 'Landscape Painting',
        content: 'A'.repeat(100),
      });

      expect(result.warnings).not.toContain('No ingredients detected for recipe');
      expect(result.score).toBe(0.7);
    });

    it('does not apply recipe-specific penalties to generic documents', () => {
      const result = calculateConfidence({
        confidence: 0.88,
        type: 'document',
        title: 'Meeting Notes',
        content: 'A'.repeat(300),
      });

      expect(result.score).toBe(0.88);
    });
  });
});
