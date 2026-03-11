/**
 * Tests for the Gemini service.
 * @see ../services/gemini.js
 */

import { sendToGemini } from '../services/gemini.js';

// Save original fetch so we can restore it
const originalFetch = globalThis.fetch;

describe('sendToGemini', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const fakeEnv = { GEMINI_API_KEY: 'test-gemini-key' };
  const fakeImageBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer; // PNG header bytes
  const fakeMimeType = 'image/png';

  /**
   * Helper: create a successful Gemini API response.
   */
  function mockGeminiResponse(content) {
    return {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(content) }],
            },
          },
        ],
      }),
      text: vi.fn().mockResolvedValue(''),
    };
  }

  // ---------- Calls API with correct URL and payload ----------
  describe('API call', () => {
    it('calls Gemini API with correct URL and payload', async () => {
      const responseData = {
        type: 'recipe',
        title: 'Test Recipe',
        ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
        instructions: ['Mix well'],
        content: 'Test recipe content',
        confidence: 0.9,
        warnings: [],
      };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(responseData));

      await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('generativelanguage.googleapis.com');
      expect(url).toContain('gemini-2.5-flash');
      expect(url).toContain('key=test-gemini-key');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
    });
  });

  // ---------- Sends image as base64 ----------
  describe('base64 image encoding', () => {
    it('sends image as base64 in the request', async () => {
      const responseData = {
        type: 'document',
        title: 'Test',
        content: 'Content',
        confidence: 0.8,
      };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(responseData));

      await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);

      const inlineData = body.contents[0].parts[0].inlineData;
      expect(inlineData.mimeType).toBe('image/png');
      expect(typeof inlineData.data).toBe('string');
      // Verify it is valid base64 (no error decoding)
      expect(() => atob(inlineData.data)).not.toThrow();
    });
  });

  // ---------- Parses structured JSON response ----------
  describe('response parsing', () => {
    it('parses structured JSON response correctly', async () => {
      const responseData = {
        type: 'recipe',
        title: 'Chocolate Chip Cookies',
        ingredients: [
          { item: 'flour', amount: '2', unit: 'cups' },
          { item: 'sugar', amount: '1', unit: 'cup' },
        ],
        instructions: ['Preheat oven', 'Mix ingredients', 'Bake for 12 minutes'],
        notes: 'Best served warm',
        servings: '24 cookies',
        prepTime: '15 min',
        cookTime: '12 min',
        content: 'Full recipe text here',
        confidence: 0.95,
        warnings: [],
      };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(responseData));

      const result = await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(result.type).toBe('recipe');
      expect(result.title).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
      expect(result.notes).toBe('Best served warm');
      expect(result.servings).toBe('24 cookies');
      expect(result.prepTime).toBe('15 min');
      expect(result.cookTime).toBe('12 min');
      expect(result.content).toBe('Full recipe text here');
      expect(result.confidence).toBe(0.95);
      expect(result.warnings).toEqual([]);
      expect(result.source).toBe('gemini-2.5-flash');
    });

    it('handles response wrapped in markdown code fences', async () => {
      const responseData = {
        type: 'document',
        title: 'Test Doc',
        content: 'Some content',
        confidence: 0.8,
      };
      // Response wrapped in ```json ... ```
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n' + JSON.stringify(responseData) + '\n```',
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(result.type).toBe('document');
      expect(result.title).toBe('Test Doc');
    });
  });

  // ---------- Normalizes missing fields ----------
  describe('field normalization', () => {
    it('normalizes missing fields with defaults', async () => {
      const sparseResponse = { title: 'Sparse' };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(sparseResponse));

      const result = await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(result.type).toBe('document');
      expect(result.title).toBe('Sparse');
      expect(result.ingredients).toEqual([]);
      expect(result.instructions).toEqual([]);
      expect(result.notes).toBe('');
      expect(result.content).toBe('');
      expect(result.servings).toBeNull();
      expect(result.prepTime).toBeNull();
      expect(result.cookTime).toBeNull();
      expect(result.confidence).toBe(0.5);
      expect(result.warnings).toEqual([]);
      expect(result.source).toBe('gemini-2.5-flash');
    });

    it('defaults confidence to 0.5 when not a number', async () => {
      const data = { confidence: 'high', title: 'Test' };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(data));

      const result = await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(result.confidence).toBe(0.5);
    });

    it('defaults title to Untitled when missing', async () => {
      const data = { content: 'some text' };
      globalThis.fetch.mockResolvedValue(mockGeminiResponse(data));

      const result = await sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv);

      expect(result.title).toBe('Untitled');
    });
  });

  // ---------- Throws on API error response ----------
  describe('API errors', () => {
    it('throws on API error response', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('API key invalid'),
      });

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('Gemini API error (403): API key invalid');
    });

    it('throws when no candidates are returned', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ candidates: [] }),
      });

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('No candidates returned from Gemini');
    });

    it('throws when response has no text content', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{}] } }],
        }),
      });

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('No text content in Gemini response');
    });

    it('throws when response text is not valid JSON', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            { content: { parts: [{ text: 'This is not JSON at all' }] } },
          ],
        }),
      });

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('Failed to parse Gemini response as JSON');
    });

    it('throws when GEMINI_API_KEY is not configured', async () => {
      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], {})
      ).rejects.toThrow('GEMINI_API_KEY is not configured');
    });
  });

  // ---------- Network errors ----------
  describe('network errors', () => {
    it('throws on network failure', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network request failed'));

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('Network request failed');
    });

    it('throws on timeout', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Request timed out'));

      await expect(
        sendToGemini([{ buffer: fakeImageBuffer, mimeType: fakeMimeType }], fakeEnv)
      ).rejects.toThrow('Request timed out');
    });
  });
});
