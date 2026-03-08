/**
 * Tests for the validate middleware.
 * @see ../middleware/validate.js
 */

import { validate } from '../middleware/validate.js';

function createMockContext(body = {}) {
  const ctx = {
    req: {
      json: vi.fn().mockResolvedValue(body),
    },
    json: vi.fn((data, status) => ({ data, status })),
    set: vi.fn(),
    get: vi.fn(),
  };
  return ctx;
}

describe('validate middleware', () => {
  // ---------- required field ----------
  describe('required fields', () => {
    it('returns 400 when a required field is missing', async () => {
      const schema = { name: { required: true, type: 'string' } };
      const middleware = validate(schema);
      const ctx = createMockContext({}); // no "name" field
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining(['name is required']),
        }),
        400
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when a required field is empty string', async () => {
      const schema = { name: { required: true, type: 'string' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ name: '' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining(['name is required']),
        }),
        400
      );
    });

    it('returns 400 when a required field is null', async () => {
      const schema = { name: { required: true, type: 'string' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ name: null });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining(['name is required']),
        }),
        400
      );
    });
  });

  // ---------- type checks ----------
  describe('type validation', () => {
    it('returns 400 when field has wrong type (expected string, got number)', async () => {
      const schema = { name: { type: 'string' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ name: 123 });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining(['name must be a string']),
        }),
        400
      );
    });

    it('returns 400 when field has wrong type (expected number, got string)', async () => {
      const schema = { age: { type: 'number' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ age: 'twenty' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['age must be a number']),
        }),
        400
      );
    });

    it('returns 400 when field has wrong type (expected boolean, got string)', async () => {
      const schema = { active: { type: 'boolean' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ active: 'true' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['active must be a boolean']),
        }),
        400
      );
    });

    it('returns 400 when field has wrong type (expected array, got object)', async () => {
      const schema = { items: { type: 'array' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ items: {} });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['items must be an array']),
        }),
        400
      );
    });

    it('returns 400 when field has wrong type (expected object, got array)', async () => {
      const schema = { meta: { type: 'object' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ meta: [1, 2] });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['meta must be an object']),
        }),
        400
      );
    });

    it('returns 400 for NaN when type is number', async () => {
      const schema = { amount: { type: 'number' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ amount: NaN });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['amount must be a number']),
        }),
        400
      );
    });
  });

  // ---------- maxLength ----------
  describe('maxLength', () => {
    it('returns 400 when string exceeds maxLength', async () => {
      const schema = { name: { type: 'string', maxLength: 5 } };
      const middleware = validate(schema);
      const ctx = createMockContext({ name: 'toolong' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['name must be at most 5 characters']),
        }),
        400
      );
    });
  });

  // ---------- minLength ----------
  describe('minLength', () => {
    it('returns 400 when string is below minLength', async () => {
      const schema = { password: { type: 'string', minLength: 8 } };
      const middleware = validate(schema);
      const ctx = createMockContext({ password: 'short' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['password must be at least 8 characters']),
        }),
        400
      );
    });
  });

  // ---------- max ----------
  describe('max (number)', () => {
    it('returns 400 when number exceeds max', async () => {
      const schema = { quantity: { type: 'number', max: 100 } };
      const middleware = validate(schema);
      const ctx = createMockContext({ quantity: 150 });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['quantity must be at most 100']),
        }),
        400
      );
    });
  });

  // ---------- min ----------
  describe('min (number)', () => {
    it('returns 400 when number is below min', async () => {
      const schema = { quantity: { type: 'number', min: 1 } };
      const middleware = validate(schema);
      const ctx = createMockContext({ quantity: 0 });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['quantity must be at least 1']),
        }),
        400
      );
    });
  });

  // ---------- email ----------
  describe('email validation', () => {
    it('returns 400 for invalid email format', async () => {
      const schema = { email: { type: 'email' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ email: 'not-an-email' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['email must be a valid email address']),
        }),
        400
      );
    });

    it('returns 400 for email missing @ symbol', async () => {
      const schema = { email: { type: 'email' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ email: 'userdomain.com' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['email must be a valid email address']),
        }),
        400
      );
    });

    it('passes valid email addresses', async () => {
      const schema = { email: { type: 'email' } };
      const middleware = validate(schema);
      const ctx = createMockContext({ email: 'user@example.com' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ---------- enum ----------
  describe('enum validation', () => {
    it('returns 400 when value not in enum list', async () => {
      const schema = { status: { type: 'string', enum: ['active', 'inactive', 'pending'] } };
      const middleware = validate(schema);
      const ctx = createMockContext({ status: 'deleted' });
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            'status must be one of: active, inactive, pending',
          ]),
        }),
        400
      );
    });
  });

  // ---------- valid data ----------
  describe('valid data', () => {
    it('passes valid data and attaches body to context', async () => {
      const schema = {
        name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
        age: { type: 'number', min: 0, max: 150 },
      };
      const body = { name: 'Alice', age: 30 };
      const middleware = validate(schema);
      const ctx = createMockContext(body);
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('body', body);
      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
    });

    it('skips optional fields that are missing without error', async () => {
      const schema = {
        name: { required: true, type: 'string' },
        nickname: { type: 'string' },
      };
      const body = { name: 'Bob' };
      const middleware = validate(schema);
      const ctx = createMockContext(body);
      const next = vi.fn();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.json).not.toHaveBeenCalled();
    });
  });

  // ---------- missing Content-Type / invalid JSON ----------
  describe('missing Content-Type / invalid JSON', () => {
    it('handles missing Content-Type gracefully by returning 400 for invalid JSON', async () => {
      const schema = { name: { required: true, type: 'string' } };
      const middleware = validate(schema);
      const ctx = {
        req: {
          json: vi.fn().mockRejectedValue(new Error('Failed to parse JSON')),
        },
        json: vi.fn((data, status) => ({ data, status })),
        set: vi.fn(),
        get: vi.fn(),
      };
      const next = vi.fn();

      await middleware(ctx, next);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Invalid JSON in request body' },
        400
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- multiple errors ----------
  describe('multiple errors at once', () => {
    it('returns all validation errors in a single response', async () => {
      const schema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'email' },
        age: { type: 'number', min: 0 },
      };
      const body = { age: -5 }; // missing name, missing email, age below min
      const middleware = validate(schema);
      const ctx = createMockContext(body);
      const next = vi.fn();

      await middleware(ctx, next);

      const response = ctx.json.mock.calls[0];
      const [data, status] = response;

      expect(status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveLength(3);
      expect(data.details).toContain('name is required');
      expect(data.details).toContain('email is required');
      expect(data.details).toContain('age must be at least 0');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
