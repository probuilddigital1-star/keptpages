/**
 * Input validation middleware factory.
 * Validates request body against a simple schema definition.
 *
 * Schema format:
 * {
 *   fieldName: {
 *     required: boolean,
 *     type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email',
 *     maxLength: number (for strings),
 *     minLength: number (for strings),
 *     min: number (for numbers),
 *     max: number (for numbers),
 *     enum: string[] (allowed values),
 *   }
 * }
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a single field value against its schema definition.
 * Returns an array of error messages (empty if valid).
 */
function validateField(fieldName, value, rules) {
  const errors = [];

  // Check required
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors; // No point checking further if missing
  }

  // If the value is not provided and not required, skip other checks
  if (value === undefined || value === null) {
    return errors;
  }

  // Type checks
  if (rules.type) {
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push(`${fieldName} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${fieldName} must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${fieldName} must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${fieldName} must be an object`);
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
          errors.push(`${fieldName} must be a valid email address`);
        }
        break;
      default:
        break;
    }
  }

  // String length checks
  if (typeof value === 'string') {
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }
  }

  // Number range checks
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max}`);
    }
  }

  // Enum check
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
  }

  return errors;
}

/**
 * Validation middleware factory.
 * Returns a Hono middleware that validates the JSON request body.
 *
 * Usage:
 *   app.post('/endpoint', validate({ name: { required: true, type: 'string' } }), handler)
 */
export function validate(schema) {
  return async (c, next) => {
    let body;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }

    const allErrors = [];

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = body[fieldName];
      const fieldErrors = validateField(fieldName, value, rules);
      allErrors.push(...fieldErrors);
    }

    if (allErrors.length > 0) {
      return c.json(
        {
          error: 'Validation failed',
          details: allErrors,
        },
        400
      );
    }

    // Attach parsed body to context for downstream handlers
    c.set('body', body);
    await next();
  };
}
