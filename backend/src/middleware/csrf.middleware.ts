import { Request, Response, NextFunction } from 'express';

/**
 * Enforce CSRF for browser cookie-based refresh calls.
 * Mobile/native clients sending refresh token in JSON body are not blocked.
 */
export function requireRefreshCsrf(req: Request, res: Response, next: NextFunction): void {
  const hasCookieRefresh = typeof req.cookies?.refresh_token === 'string';
  if (!hasCookieRefresh) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf_token as string | undefined;
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'CSRF validation failed.',
      },
    });
    return;
  }

  next();
}
