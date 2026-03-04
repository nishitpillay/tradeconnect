/**
 * AppError / Errors factory unit tests
 *
 * Pure logic — no DB, Redis, or HTTP needed.
 */

import { AppError, Errors } from '../errors';

// ── AppError ──────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('constructs with correct properties', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toBeUndefined();
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AppError).toBe(true);
  });

  it('stores optional details', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Bad', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

// ── Errors factory ────────────────────────────────────────────────────────────

describe('Errors.badRequest', () => {
  it('creates a 400 AppError', () => {
    const err = Errors.badRequest('Missing field');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Missing field');
  });
});

describe('Errors.unauthorized', () => {
  it('uses default message', () => {
    const err = Errors.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('accepts a custom message', () => {
    const err = Errors.unauthorized('Custom auth error');
    expect(err.message).toBe('Custom auth error');
  });
});

describe('Errors.tokenExpired', () => {
  it('creates a 401 TOKEN_EXPIRED error', () => {
    const err = Errors.tokenExpired();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('TOKEN_EXPIRED');
  });
});

describe('Errors.forbidden', () => {
  it('uses default message', () => {
    const err = Errors.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('Errors.notFound', () => {
  it('includes the resource name in the message', () => {
    const err = Errors.notFound('Job');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Job');
  });
});

describe('Errors.emailTaken', () => {
  it('creates a 409 conflict error', () => {
    const err = Errors.emailTaken();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('Errors.invalidStatusTransition', () => {
  it('includes from/to states in message', () => {
    const err = Errors.invalidStatusTransition('draft', 'completed');
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('draft');
    expect(err.message).toContain('completed');
  });
});

describe('Errors.rateLimitExceeded', () => {
  it('creates a 429 error', () => {
    const err = Errors.rateLimitExceeded('login', 60);
    expect(err.statusCode).toBe(429);
    expect(err.details).toEqual({ retry_after_seconds: 60 });
  });

  it('omits details when no retry_after provided', () => {
    const err = Errors.rateLimitExceeded('login');
    expect(err.details).toBeUndefined();
  });
});

describe('Errors.accountSuspended', () => {
  it('uses indefinite message when no date given', () => {
    const err = Errors.accountSuspended();
    expect(err.message).toContain('indefinitely');
    expect(err.details).toBeUndefined();
  });

  it('includes suspended_until in details when date given', () => {
    const until = new Date('2026-06-01T00:00:00Z');
    const err = Errors.accountSuspended(until);
    expect(err.details?.suspended_until).toBe(until.toISOString());
  });
});
