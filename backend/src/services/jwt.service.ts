import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JWTPayload = {
  userId: string;
  role: 'customer' | 'provider' | 'admin';
  email_verified: boolean;
  identity_verified: boolean;
};

type JWTClaims = JWTPayload & { iat: number; exp: number };

// ── Access Token ──────────────────────────────────────────────────────────────

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}

export function verifyAccessToken(token: string): JWTClaims {
  return jwt.verify(token, env.JWT_SECRET) as JWTClaims;
}

// ── Refresh Token ─────────────────────────────────────────────────────────────
// Opaque token: raw bytes sent to client, SHA-256 hash stored in DB.

export async function signRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex'); // 96-char hex string
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.query(
    `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at)
     VALUES ($1, $2, 'refresh', $3)`,
    [userId, hash, expiresAt]
  );

  return raw;
}

/**
 * Rotate: mark old token as used, issue new pair.
 * Implements refresh-token reuse detection — if a token is presented again
 * after being used, ALL tokens for that user are revoked (compromise assumed).
 */
export async function rotateRefreshToken(oldRaw: string): Promise<{
  accessToken: string;
  refreshToken: string;
  payload: JWTPayload;
}> {
  const oldHash = hashToken(oldRaw);

  const { rows } = await db.query<{
    user_id: string;
    role: 'customer' | 'provider' | 'admin';
    email_verified: boolean;
    identity_verified: boolean | null;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT at.user_id, at.expires_at, at.used_at,
            u.role, u.email_verified,
            pp.identity_verified
     FROM auth_tokens at
     JOIN users u ON u.id = at.user_id
     LEFT JOIN provider_profiles pp ON pp.user_id = u.id
     WHERE at.token_hash = $1 AND at.token_type = 'refresh'`,
    [oldHash]
  );

  if (rows.length === 0) throw new TokenError('Refresh token not found');

  const row = rows[0];

  if (row.used_at) {
    // Reuse detected — assume account compromise
    await revokeAllUserTokens(row.user_id);
    throw new TokenError('Refresh token reuse detected');
  }
  if (new Date() > row.expires_at) throw new TokenError('Refresh token expired');

  // Mark old token as used atomically
  await db.query(
    `UPDATE auth_tokens SET used_at = NOW() WHERE token_hash = $1`,
    [oldHash]
  );

  const payload: JWTPayload = {
    userId: row.user_id,
    role: row.role,
    email_verified: row.email_verified,
    identity_verified: row.identity_verified ?? false,
  };

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccessToken(payload)),
    signRefreshToken(row.user_id),
  ]);

  return { accessToken, refreshToken, payload };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);
  await db.query(
    `UPDATE auth_tokens SET used_at = NOW()
     WHERE token_hash = $1 AND token_type = 'refresh' AND used_at IS NULL`,
    [hash]
  );
}

/** Revoke ALL refresh tokens for a user (password change, compromise). */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.query(
    `UPDATE auth_tokens SET used_at = NOW()
     WHERE user_id = $1 AND token_type = 'refresh' AND used_at IS NULL`,
    [userId]
  );
  // Redis flag lets auth middleware reject cached JWTs issued before this moment
  await redis.set(`token:invalidate:${userId}`, Date.now().toString(), 'EX', 3600);
}

/** Called by auth middleware to detect mid-session token invalidation. */
export async function isUserTokensInvalidated(
  userId: string,
  tokenIat: number
): Promise<boolean> {
  const val = await redis.get(`token:invalidate:${userId}`);
  if (!val) return false;
  // Invalidated if the token was issued BEFORE the invalidation timestamp
  return tokenIat * 1000 < parseInt(val, 10);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export class TokenError extends Error {
  readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

// ── Namespace object (for legacy imports: jwtService.verifyAccessToken) ───────

export const jwtService = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  isUserTokensInvalidated,
  hashToken,
};
