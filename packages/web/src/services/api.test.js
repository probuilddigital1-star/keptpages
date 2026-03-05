vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

vi.mock('@/config/env', () => ({
  config: {
    apiUrl: 'http://test-api.com',
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
}));

globalThis.fetch = vi.fn();

// Import after mocks are set up
const { api } = await import('./api');
const { supabase } = await import('@/services/supabase');

function mockFetchResponse(data, ok = true, status = 200) {
  globalThis.fetch.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    json: vi.fn().mockResolvedValueOnce(data),
  });
}

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the default getSession mock
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  describe('api.get', () => {
    it('makes GET request with auth header', async () => {
      mockFetchResponse({ data: 'ok' });

      await api.get('/users');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://test-api.com/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('returns parsed JSON response', async () => {
      mockFetchResponse({ id: 1, name: 'test' });

      const result = await api.get('/users/1');

      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('api.post', () => {
    it('makes POST request with JSON body', async () => {
      mockFetchResponse({ id: 1 });

      await api.post('/users', { name: 'Alice' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://test-api.com/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({ name: 'Alice' }),
        })
      );
    });
  });

  describe('api.put', () => {
    it('makes PUT request with JSON body', async () => {
      mockFetchResponse({ id: 1, name: 'Bob' });

      await api.put('/users/1', { name: 'Bob' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://test-api.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Bob' }),
        })
      );
    });
  });

  describe('api.delete', () => {
    it('makes DELETE request', async () => {
      mockFetchResponse({ success: true });

      await api.delete('/users/1');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://test-api.com/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('does not include body for delete', async () => {
      mockFetchResponse({ success: true });

      await api.delete('/users/1');

      const callArgs = globalThis.fetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws error on non-OK response', async () => {
      mockFetchResponse({ message: 'Not found' }, false, 404);

      await expect(api.get('/missing')).rejects.toThrow('Not found');
    });

    it('parses error message from response body', async () => {
      mockFetchResponse(
        { message: 'Validation failed: email is required' },
        false,
        422
      );

      await expect(
        api.post('/users', { name: 'NoEmail' })
      ).rejects.toThrow('Validation failed: email is required');
    });

    it('falls back to statusText if JSON parse fails', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValueOnce(new Error('not json')),
      });

      await expect(api.get('/broken')).rejects.toThrow(
        'Internal Server Error'
      );
    });

    it('falls back to "Request failed" if no message in error body', async () => {
      mockFetchResponse({}, false, 400);

      await expect(api.get('/bad')).rejects.toThrow('Request failed');
    });
  });

  describe('public requests', () => {
    it('skips auth header when isPublic is true', async () => {
      mockFetchResponse({ data: 'public' });

      await api.get('/public/data', { isPublic: true });

      expect(supabase.auth.getSession).not.toHaveBeenCalled();

      const headers = globalThis.fetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('still includes Content-Type header for public requests', async () => {
      mockFetchResponse({ data: 'public' });

      await api.get('/public/data', { isPublic: true });

      const headers = globalThis.fetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('auth session handling', () => {
    it('sends no Authorization header when session is null', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });

      mockFetchResponse({ data: 'ok' });

      await api.get('/resource');

      const headers = globalThis.fetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
