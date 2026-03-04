/**
 * Authentication Middleware
 *
 * Extracts and verifies the JWT access token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 *
 * Uses:
 *   requireAuth  — any valid token; user may be in any status
 *   requireActive — valid token + user status must be 'active'
 *
 * Token format:  Authorization: Bearer <access_token>
 *
 * Does NOT query the database on every request (stateless JWT).
 * User status checks (banned/suspended) happen in requireActive, which
 * reads from a lightweight Redis cache refreshed on status change.
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService, JWTPayload } from '../services/jwt.service';
import { Errors } from './errors';
import { redis } from '../config/redis';

// ─── Type augmentation ────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      requestId?: string;
    }
  }
}

// ─── Request ID middleware (attach first in app.ts) ───────────────────────────

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
  next();
}

// ─── Core JWT verification ─────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

/** Attach user to req if valid token; passes through if no token. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = jwtService.verifyAccessToken(token);
  } catch {
    // silently ignore for optional auth
  }
  next();
}

/** Require a valid access token. Returns 401 if missing/invalid/expired. */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  try {
    req.user = jwtService.verifyAccessToken(token);
    next();
  } catch (err) {
    const isExpiry = err instanceof Error && err.message.includes('expired');
    res.status(401).json({
      error: isExpiry
        ? { code: 'TOKEN_EXPIRED', message: 'Access token has expired. Please refresh.' }
        : { code: 'TOKEN_INVALID', message: 'Token is invalid or malformed.' },
    });
  }
}

/** Require valid token + user must be active (not banned/suspended).
 *  Checks a Redis key set on account status change — avoids DB round-trip. */
export async function requireActive(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  let payload: JWTPayload;
  try {
    payload = jwtService.verifyAccessToken(token);
  } catch (err) {
    const isExpiry = err instanceof Error && err.message.includes('expired');
    res.status(401).json({
      error: isExpiry
        ? { code: 'TOKEN_EXPIRED', message: 'Access token has expired.' }
        : { code: 'TOKEN_INVALID', message: 'Token is invalid.' },
    });
    return;
  }

  // Check Redis for account status override (set when admin suspends/bans)
  // Key format: "user-status:<userId>"  Value: "suspended" | "banned"
  try {
    const statusOverride = await redis.get(`user-status:${payload.userId}`);
    if (statusOverride === 'banned') {
      next(Errors.accountBanned());
      return;
    }
    if (statusOverride === 'suspended') {
      const suspendedUntilStr = await redis.get(`user-suspended-until:${payload.userId}`);
      const suspendedUntil = suspendedUntilStr ? new Date(suspendedUntilStr) : undefined;
      next(Errors.accountSuspended(suspendedUntil));
      return;
    }
  } catch {
    // Redis failure: fall through (don't block the request)
  }

  req.user = payload;
  next();
}
