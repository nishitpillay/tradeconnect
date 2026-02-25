/**
 * Role-Based Access Control Middleware
 *
 * Guards routes by user role. Must be used AFTER requireAuth or requireActive.
 *
 * Usage:
 *   router.post('/jobs',        requireActive, requireRole('customer'), ...)
 *   router.get('/admin/users',  requireActive, requireRole('admin'), ...)
 *   router.post('/quotes/:id',  requireActive, requireRole('provider'), requireVerified, ...)
 */

import { Request, Response, NextFunction } from 'express';

type Role = 'customer' | 'provider' | 'admin';

/** Allow only users with one of the specified roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        error: {
          code:    'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}.`,
        },
      });
      return;
    }
    next();
  };
}

/** Provider must have identity_verified = true in JWT to submit quotes.
 *
 *  The identity_verified flag is embedded in the JWT at login time and
 *  refreshed when verification status changes (new token issued).
 *  This avoids a DB hit on every quote submission.
 */
export function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }
  if (!req.user.identity_verified) {
    res.status(403).json({
      error: {
        code:    'NOT_VERIFIED',
        message: 'Your identity must be verified before you can submit quotes. ' +
                 'Please complete verification in the Verification Centre.',
      },
    });
    return;
  }
  next();
}

/** Email must be verified to post jobs. */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }
  if (!req.user.email_verified) {
    res.status(403).json({
      error: {
        code:    'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before posting jobs.',
      },
    });
    return;
  }
  next();
}
