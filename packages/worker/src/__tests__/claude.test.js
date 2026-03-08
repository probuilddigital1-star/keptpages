/**
 * Tests for the Claude service.
 * @see ../services/claude.js
 */

import { sendToClaude } from '../services/claude.js';

const originalFetch = globalThis.fetch;

describe('sendToClaude', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const fakeEnv = { ANTHROPIC_API_KEY: 'test-anthropic-key' };
  const fakeImageBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer; // JPEG magic bytes
  const fakeMimeType = 'image/jpeg';

  /**
   * Helper: create a successful Claude API response.
   */
  function mockClaudeResponse(content) {
    return {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(content),
          },
        ],
      }),
      text: vi.fn().mockResolvedValue(''),
    };
  }

  // ---------- Calls API with correct URL and headers ----------
  describe('API call', () => {
    it('calls Anthropic API with correct URL and headers', async () => {
      const responseData = {
        type: 'recipe',
        title: 'Test Recipe',
        content: 'Recipe content',
        confidence: 0.9,
      };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['x-api-key']).toBe('test-anthropic-key');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
    });

    it('sends the correct model in the request body', async () => {
      const responseData = { type: 'document', title: 'Test', confidence: 0.8 };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(4096);
    });
  });

  // ---------- Sends image as base64 with correct media type ----------
  describe('base64 image encoding', () => {
    it('sends image as base64 with correct media type', async () => {
      const responseData = { type: 'document', title: 'Test', confidence: 0.8 };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      await sendToClaude(fakeImageBuffer, 'image/png', null, fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      const imageBlock = body.messages[0].content[0];

      expect(imageBlock.type).toBe('image');
      expect(imageBlock.source.type).toBe('base64');
      expect(imageBlock.source.media_type).toBe('image/png');
      expect(typeof imageBlock.source.data).toBe('string');
      // Verify it is valid base64
      expect(() => atob(imageBlock.source.data)).not.toThrow();
    });

    it('rejects unsupported MIME types', async () => {
      await expect(
        sendToClaude(fakeImageBuffer, 'image/tiff', null, fakeEnv)
      ).rejects.toThrow('Unsupported image type for Claude: image/tiff');
    });

    it('accepts all supported MIME types', async () => {
      const responseData = { type: 'document', title: 'Test', confidence: 0.8 };

      for (const mime of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
        globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));
        await expect(
          sendToClaude(fakeImageBuffer, mime, null, fakeEnv)
        ).resolves.toBeDefined();
      }
    });
  });

  // ---------- Includes previous result as context ----------
  describe('previous result context', () => {
    it('includes previous result as context when provided', async () => {
      const responseData = { type: 'recipe', title: 'Fixed Recipe', confidence: 0.95 };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      const previousResult = {
        type: 'recipe',
        title: 'Bad Recipe',
        confidence: 0.4,
        warnings: ['Could not read ingredient list'],
      };

      await sendToClaude(fakeImageBuffer, fakeMimeType, previousResult, fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      const textBlock = body.messages[0].content[1];

      expect(textBlock.type).toBe('text');
      expect(textBlock.text).toContain('previous AI extraction attempt');
      expect(textBlock.text).toContain('Bad Recipe');
      expect(textBlock.text).toContain('Could not read ingredient list');
    });

    it('handles missing previous result gracefully', async () => {
      const responseData = { type: 'document', title: 'Fresh Scan', confidence: 0.85 };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      const textBlock = body.messages[0].content[1];

      // When no previous result, the prompt should NOT contain the "previous" context
      expect(textBlock.text).not.toContain('previous AI extraction attempt');
    });

    it('handles undefined previous result gracefully', async () => {
      const responseData = { type: 'document', title: 'Test', confidence: 0.8 };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      // Pass undefined explicitly
      await sendToClaude(fakeImageBuffer, fakeMimeType, undefined, fakeEnv);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      const textBlock = body.messages[0].content[1];

      expect(textBlock.text).not.toContain('previous AI extraction attempt');
    });
  });

  // ---------- Parses response correctly ----------
  describe('response parsing', () => {
    it('parses response correctly', async () => {
      const responseData = {
        type: 'recipe',
        title: 'Banana Bread',
        ingredients: [
          { item: 'bananas', amount: '3', unit: '' },
          { item: 'flour', amount: '1.5', unit: 'cups' },
        ],
        instructions: ['Mash bananas', 'Mix with flour', 'Bake at 350F for 60 min'],
        notes: 'Overripe bananas work best',
        servings: '1 loaf',
        prepTime: '10 min',
        cookTime: '60 min',
        content: 'Full banana bread recipe transcription',
        confidence: 0.92,
        warnings: [],
      };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(responseData));

      const result = await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      expect(result.type).toBe('recipe');
      expect(result.title).toBe('Banana Bread');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
      expect(result.notes).toBe('Overripe bananas work best');
      expect(result.servings).toBe('1 loaf');
      expect(result.prepTime).toBe('10 min');
      expect(result.cookTime).toBe('60 min');
      expect(result.confidence).toBe(0.92);
      expect(result.source).toBe('claude-sonnet');
    });

    it('normalizes missing fields with defaults', async () => {
      const sparseData = { title: 'Minimal' };
      globalThis.fetch.mockResolvedValue(mockClaudeResponse(sparseData));

      const result = await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      expect(result.type).toBe('document');
      expect(result.title).toBe('Minimal');
      expect(result.ingredients).toEqual([]);
      expect(result.instructions).toEqual([]);
      expect(result.notes).toBe('');
      expect(result.content).toBe('');
      expect(result.servings).toBeNull();
      expect(result.prepTime).toBeNull();
      expect(result.cookTime).toBeNull();
      expect(result.confidence).toBe(0.5);
      expect(result.warnings).toEqual([]);
      expect(result.source).toBe('claude-sonnet');
    });

    it('handles response wrapped in markdown code fences', async () => {
      const responseData = { type: 'document', title: 'Fenced', confidence: 0.85 };
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: '```json\n' + JSON.stringify(responseData) + '\n```',
            },
          ],
        }),
      });

      const result = await sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv);

      expect(result.title).toBe('Fenced');
      expect(result.confidence).toBe(0.85);
    });
  });

  // ---------- Throws on API error ----------
  describe('API errors', () => {
    it('throws on API error', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      });

      await expect(
        sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv)
      ).rejects.toThrow('Claude API error (429): Rate limit exceeded');
    });

    it('throws when no text content in response', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'image', data: 'something' }],
        }),
      });

      await expect(
        sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv)
      ).rejects.toThrow('No text content in Claude response');
    });

    it('throws when response text is not valid JSON', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'I cannot parse this image.' }],
        }),
      });

      await expect(
        sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv)
      ).rejects.toThrow('Failed to parse Claude response as JSON');
    });

    it('throws when ANTHROPIC_API_KEY is not configured', async () => {
      await expect(
        sendToClaude(fakeImageBuffer, fakeMimeType, null, {})
      ).rejects.toThrow('ANTHROPIC_API_KEY is not configured');
    });
  });

  // ---------- Network errors ----------
  describe('network errors', () => {
    it('throws on network failure', async () => {
      globalThis.fetch.mockRejectedValue(new Error('fetch failed'));

      await expect(
        sendToClaude(fakeImageBuffer, fakeMimeType, null, fakeEnv)
      ).rejects.toThrow('fetch failed');
    });
  });
});
