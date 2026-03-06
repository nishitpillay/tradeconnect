import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { contextualLogger } from '../observability/logger';

export type JWTPayload = {
  userId: string;
  role: 'customer' | 'provider' | 'admin';
  email_verified: boolean;
  identity_verified: boolean;
};

type JWTClaims = JWTPayload & { iat: number; exp: number };
const log = contextualLogger({ component: 'auth.jwt' });

export interface RefreshTokenContext {
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  familyId?: string;
  parentTokenId?: string | null;
}

interface RefreshTokenIssueResult {
  token: string;
  tokenId: string;
  familyId: string;
  issuedAt: Date;
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JWTClaims {
  return jwt.verify(token, env.JWT_SECRET) as JWTClaims;
}

export async function signRefreshToken(
  userId: string,
  context: RefreshTokenContext = {}
): Promise<RefreshTokenIssueResult> {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = hashToken(raw);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRY));
  const familyId = context.familyId ?? crypto.randomUUID();

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth_tokens (
      user_id, token_hash, token_type, expires_at,
      token_family_id, parent_token_id, device_id,
      issued_at, last_used_at, ip_hash, user_agent_hash
    )
    VALUES ($1, $2, 'refresh', $3, $4, $5, $6, $7, $7, $8, $9)
    RETURNING id`,
    [
      userId,
      hash,
      expiresAt,
      familyId,
      context.parentTokenId ?? null,
      normalizeDeviceId(context.deviceId),
      issuedAt,
      hashMetadata(context.ipAddress),
      hashMetadata(context.userAgent),
    ]
  );

  return {
    token: raw,
    tokenId: rows[0].id,
    familyId,
    issuedAt,
  };
}

export async function rotateRefreshToken(
  oldRaw: string,
  context: RefreshTokenContext = {}
): Promise<{
  accessToken: string;
  refreshToken: string;
  payload: JWTPayload;
  tokenFamilyId: string;
}> {
  const oldHash = hashToken(oldRaw);

  const { rows } = await db.query<{
    id: string;
    user_id: string;
    token_family_id: string | null;
    role: 'customer' | 'provider' | 'admin';
    email_verified: boolean;
    identity_verified: boolean | null;
    expires_at: Date;
    used_at: Date | null;
    revoked_at: Date | null;
    replaced_by_token_id: string | null;
  }>(
    `SELECT
      at.id,
      at.user_id,
      at.expires_at,
      at.used_at,
      at.revoked_at,
      at.replaced_by_token_id,
      at.token_family_id,
      u.role,
      u.email_verified,
      pp.identity_verified
     FROM auth_tokens at
     JOIN users u ON u.id = at.user_id
     LEFT JOIN provider_profiles pp ON pp.user_id = u.id
     WHERE at.token_hash = $1 AND at.token_type = 'refresh'`,
    [oldHash]
  );

  if (rows.length === 0) throw new TokenError('Refresh token not found');

  const row = rows[0];
  const familyId = row.token_family_id ?? row.id;

  if (!row.token_family_id) {
    await db.query('UPDATE auth_tokens SET token_family_id = $1 WHERE id = $2', [familyId, row.id]);
  }

  if (row.revoked_at) throw new TokenError('Refresh token revoked');
  if (new Date() > row.expires_at) throw new TokenError('Refresh token expired');
  if (row.used_at || row.replaced_by_token_id) {
    await revokeTokenFamily(row.user_id, familyId, 'reuse_detected');
    throw new TokenError('Refresh token reuse detected');
  }

  const payload: JWTPayload = {
    userId: row.user_id,
    role: row.role,
    email_verified: row.email_verified,
    identity_verified: row.identity_verified ?? false,
  };

  const accessToken = signAccessToken(payload);

  const refresh = await db.withTransaction(async (client) => {
    const oldUpdate = await client.query<{ id: string }>(
      `UPDATE auth_tokens
       SET used_at = NOW(), last_used_at = NOW()
       WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
       RETURNING id`,
      [row.id]
    );

    if (oldUpdate.rowCount === 0) {
      throw new TokenError('Refresh token reuse detected');
    }

    const newIssue = await signRefreshToken(row.user_id, {
      familyId,
      parentTokenId: row.id,
      deviceId: context.deviceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await client.query(
      'UPDATE auth_tokens SET replaced_by_token_id = $1 WHERE id = $2',
      [newIssue.tokenId, row.id]
    );

    return newIssue;
  }).catch(async (error) => {
    if (error instanceof TokenError && error.message.includes('reuse')) {
      await revokeTokenFamily(row.user_id, familyId, 'race_reuse_detected');
    }
    throw error;
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    payload,
    tokenFamilyId: refresh.familyId,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);
  await db.query(
    `UPDATE auth_tokens
     SET used_at = NOW(), last_used_at = NOW(), revoked_at = NOW()
     WHERE token_hash = $1 AND token_type = 'refresh' AND revoked_at IS NULL`,
    [hash]
  );
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.query(
    `UPDATE auth_tokens
     SET used_at = COALESCE(used_at, NOW()),
         last_used_at = NOW(),
         revoked_at = NOW()
     WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`,
    [userId]
  );
  await redis.set(`token:invalidate:${userId}`, Date.now().toString(), 'EX', 3600);
}

export async function revokeTokenFamily(
  userId: string,
  tokenFamilyId: string,
  reason: 'reuse_detected' | 'race_reuse_detected' | 'manual_revoke'
): Promise<void> {
  await db.query(
    `UPDATE auth_tokens
     SET used_at = COALESCE(used_at, NOW()),
         last_used_at = NOW(),
         revoked_at = NOW()
     WHERE user_id = $1
       AND token_type = 'refresh'
       AND token_family_id = $2
       AND revoked_at IS NULL`,
    [userId, tokenFamilyId]
  );
  await redis.set(`token:invalidate:${userId}`, Date.now().toString(), 'EX', 3600);
  log.warn({ userId, tokenFamilyId, reason }, 'Refresh token family revoked');
}

export async function isUserTokensInvalidated(
  userId: string,
  tokenIat: number
): Promise<boolean> {
  const val = await redis.get(`token:invalidate:${userId}`);
  if (!val) return false;
  return tokenIat * 1000 < parseInt(val, 10);
}

function normalizeDeviceId(deviceId?: string | null): string | null {
  const value = deviceId?.trim();
  if (!value) return null;
  return value.slice(0, 128);
}

function hashMetadata(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return crypto.createHash('sha256').update(`${env.JWT_SECRET}:${normalized}`).digest('hex');
}

function parseDurationToMs(value: string): number {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

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

export const jwtService = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  revokeTokenFamily,
  isUserTokensInvalidated,
  hashToken,
};
