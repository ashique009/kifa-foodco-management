/**
 * Canonical idempotency key generator.
 * Uses standard crypto.randomUUID when available, with timestamp fallback.
 */

export const generateIdempotencyKey = (prefix: string = 'key'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
