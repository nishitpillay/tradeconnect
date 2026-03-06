import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { Errors } from './errors';
import { redis } from '../config/redis';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

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
    // ignore for optional auth
  }
  next();
}

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

  let payload;
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
    // Redis failures should not block auth.
  }

  req.user = payload;
  next();
}
