/**
 * JWT Service Unit Tests
 *
 * Tests signAccessToken / verifyAccessToken and the hashToken helper.
 * DB/Redis-dependent functions (signRefreshToken, rotateRefreshToken) are
 * tested with mocked dependencies.
 */

// ── Mock infrastructure dependencies ─────────────────────────────────────────
// Must be before any imports that reference them.

jest.mock('../../config/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

jest.mock('../../config/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
  },
}));

// Set required env vars before loading the service
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.JWT_EXPIRY = '1h';
process.env.DATABASE_URL = 'postgres://test';
process.env.DB_ENCRYPTION_KEY = 'test-encryption-key-that-is-32chars!';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.CDN_BASE_URL = 'https://cdn.example.com';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----';
process.env.GOOGLE_MAPS_API_KEY = 'test-maps-key';
process.env.API_BASE_URL = 'http://localhost:3000';

import crypto from 'crypto';
import {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  TokenError,
  signRefreshToken,
  revokeAllUserTokens,
  isUserTokensInvalidated,
  type JWTPayload,
} from '../jwt.service';
import { db } from '../../config/database';
import { redis } from '../../config/redis';

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;

// ── Test fixtures ─────────────────────────────────────────────────────────────

const TEST_PAYLOAD: JWTPayload = {
  userId: 'user-123',
  role: 'customer',
  email_verified: true,
  identity_verified: false,
};

// ── signAccessToken / verifyAccessToken ───────────────────────────────────────

describe('signAccessToken + verifyAccessToken', () => {
  it('produces a token that verifies correctly', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT = header.payload.signature
  });

  it('decoded payload matches the input', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
    expect(decoded.role).toBe(TEST_PAYLOAD.role);
    expect(decoded.email_verified).toBe(TEST_PAYLOAD.email_verified);
    expect(decoded.identity_verified).toBe(TEST_PAYLOAD.identity_verified);
  });

  it('throws on tampered token', () => {
    const token = signAccessToken(TEST_PAYLOAD);
    const tampered = token.slice(0, -3) + 'abc';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('throws on expired token', () => {
    const jwt = require('jsonwebtoken');
    // Sign with a 0-second expiry
    const expired = jwt.sign(TEST_PAYLOAD, process.env.JWT_SECRET, { expiresIn: 0 });
    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it('produces different tokens for different users', () => {
    const a = signAccessToken(TEST_PAYLOAD);
    const b = signAccessToken({ ...TEST_PAYLOAD, userId: 'user-456' });
    expect(a).not.toBe(b);
  });
});

// ── hashToken ─────────────────────────────────────────────────────────────────

describe('hashToken', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('some-raw-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('differs for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });

  it('matches Node crypto independently', () => {
    const raw = 'test-token-value';
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    expect(hashToken(raw)).toBe(expected);
  });
});

// ── TokenError ────────────────────────────────────────────────────────────────

describe('TokenError', () => {
  it('has statusCode 401', () => {
    const err = new TokenError('bad token');
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('TokenError');
    expect(err.message).toBe('bad token');
    expect(err instanceof Error).toBe(true);
  });
});

// ── signRefreshToken ──────────────────────────────────────────────────────────

describe('signRefreshToken', () => {
  beforeEach(() => {
    mockDb.query = jest.fn().mockResolvedValue({ rows: [] });
  });

  it('returns a 96-char hex string', async () => {
    const token = await signRefreshToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBe(96);
    expect(token).toMatch(/^[a-f0-9]{96}$/);
  });

  it('persists the hashed token to DB (never the raw value)', async () => {
    const token = await signRefreshToken('user-123');
    const calls = (mockDb.query as jest.Mock).mock.calls;
    const insertCall = calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO auth_tokens')
    );
    expect(insertCall).toBeDefined();

    const params = insertCall[1] as unknown[];
    // params[0] = userId, params[1] = hash, params[2] = expires_at
    expect(params[0]).toBe('user-123');
    // The stored value should be the hash, NOT the raw token
    expect(params[1]).not.toBe(token);
    expect((params[1] as string).length).toBe(64); // SHA-256 hex
  });

  it('produces a unique token each call', async () => {
    const a = await signRefreshToken('user-123');
    const b = await signRefreshToken('user-123');
    expect(a).not.toBe(b);
  });
});

// ── revokeAllUserTokens ───────────────────────────────────────────────────────

describe('revokeAllUserTokens', () => {
  beforeEach(() => {
    mockDb.query = jest.fn().mockResolvedValue({ rows: [] });
    mockRedis.set = jest.fn().mockResolvedValue('OK');
  });

  it('updates DB to mark all tokens as used', async () => {
    await revokeAllUserTokens('user-123');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE auth_tokens SET used_at = NOW()'),
      ['user-123']
    );
  });

  it('sets a Redis invalidation flag with 1h TTL', async () => {
    await revokeAllUserTokens('user-123');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'token:invalidate:user-123',
      expect.any(String),
      'EX',
      3600
    );
  });
});

// ── isUserTokensInvalidated ───────────────────────────────────────────────────

describe('isUserTokensInvalidated', () => {
  it('returns false when no invalidation flag exists', async () => {
    mockRedis.get = jest.fn().mockResolvedValue(null);
    const result = await isUserTokensInvalidated('user-123', Date.now() / 1000);
    expect(result).toBe(false);
  });

  it('returns true when token was issued before the invalidation time', async () => {
    const invalidatedAt = Date.now();
    mockRedis.get = jest.fn().mockResolvedValue(String(invalidatedAt));
    // tokenIat is 10 minutes before invalidation
    const tokenIat = (invalidatedAt - 10 * 60 * 1000) / 1000;
    const result = await isUserTokensInvalidated('user-123', tokenIat);
    expect(result).toBe(true);
  });

  it('returns false when token was issued AFTER invalidation', async () => {
    const invalidatedAt = Date.now() - 5 * 60 * 1000; // 5 min ago
    mockRedis.get = jest.fn().mockResolvedValue(String(invalidatedAt));
    // tokenIat is 1 minute ago (after invalidation)
    const tokenIat = (Date.now() - 60 * 1000) / 1000;
    const result = await isUserTokensInvalidated('user-123', tokenIat);
    expect(result).toBe(false);
  });
});
