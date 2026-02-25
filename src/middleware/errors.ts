/**
 * Application Error Types
 *
 * Centralised error definitions. Controllers throw these; the global
 * error handler (errorHandler.middleware.ts) serialises them to JSON.
 *
 * HTTP status → error code convention:
 *   400  VALIDATION_ERROR, BAD_REQUEST
 *   401  UNAUTHORIZED, TOKEN_EXPIRED, TOKEN_INVALID
 *   403  FORBIDDEN, NOT_VERIFIED, ACCOUNT_SUSPENDED, ACCOUNT_BANNED
 *   404  NOT_FOUND
 *   409  CONFLICT (duplicate email, already quoted, job already awarded)
 *   410  GONE (job no longer accepting quotes)
 *   422  UNPROCESSABLE (invalid state transition)
 *   429  RATE_LIMIT_EXCEEDED
 *   500  INTERNAL_ERROR
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Factory shortcuts ────────────────────────────────────────────────────────

export const Errors = {
  // 400
  badRequest: (msg: string, details?: Record<string, unknown>) =>
    new AppError(400, 'BAD_REQUEST', msg, details),

  // 401
  unauthorized: (msg = 'Authentication required') =>
    new AppError(401, 'UNAUTHORIZED', msg),
  tokenExpired: () =>
    new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh.'),
  tokenInvalid: () =>
    new AppError(401, 'TOKEN_INVALID', 'Token is invalid or malformed.'),

  // 403
  forbidden: (msg = 'You do not have permission to perform this action') =>
    new AppError(403, 'FORBIDDEN', msg),
  notVerified: (msg = 'Your account must be verified to perform this action') =>
    new AppError(403, 'NOT_VERIFIED', msg),
  emailNotVerified: () =>
    new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address first.'),
  accountSuspended: (until?: Date) =>
    new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      until
        ? `Your account is suspended until ${until.toISOString()}.`
        : 'Your account has been suspended indefinitely.',
      until ? { suspended_until: until.toISOString() } : undefined
    ),
  accountBanned: () =>
    new AppError(403, 'ACCOUNT_BANNED', 'Your account has been permanently banned.'),

  // 404
  notFound: (resource = 'Resource') =>
    new AppError(404, 'NOT_FOUND', `${resource} not found.`),

  // 409
  emailTaken: () =>
    new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.'),
  alreadyQuoted: () =>
    new AppError(409, 'ALREADY_QUOTED', 'You have already submitted a quote for this job.'),
  jobAlreadyAwarded: () =>
    new AppError(409, 'JOB_ALREADY_AWARDED', 'This job has already been awarded.'),
  reviewAlreadyExists: () =>
    new AppError(409, 'REVIEW_ALREADY_EXISTS', 'You have already reviewed this job.'),

  // 410
  jobNotAcceptingQuotes: () =>
    new AppError(410, 'JOB_NOT_ACCEPTING_QUOTES', 'This job is no longer accepting quotes.'),

  // 422
  invalidStatusTransition: (from: string, to: string) =>
    new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition job from '${from}' to '${to}'.`
    ),
  invalidOTP: () =>
    new AppError(422, 'INVALID_OTP', 'The OTP is incorrect or has expired.'),
  invalidResetToken: () =>
    new AppError(422, 'INVALID_RESET_TOKEN', 'The password reset link is invalid or has expired.'),
  invalidVerifyToken: () =>
    new AppError(422, 'INVALID_VERIFY_TOKEN', 'The verification link is invalid or has expired.'),

  // 429
  rateLimitExceeded: (action: string, retryAfterSeconds?: number) =>
    new AppError(
      429,
      'RATE_LIMIT_EXCEEDED',
      `Too many ${action} requests. Please try again later.`,
      retryAfterSeconds ? { retry_after_seconds: retryAfterSeconds } : undefined
    ),

  // 500
  internal: (msg = 'An internal error occurred') =>
    new AppError(500, 'INTERNAL_ERROR', msg),
} as const;
