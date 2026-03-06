/**
 * Auth Service
 *
 * Handles all authentication flows:
 *   register → login → logout → refresh
 *   verifyEmail → requestPhoneOTP → verifyPhoneOTP
 *   forgotPassword → resetPassword
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../config/database';
import { redis } from '../config/redis';
import * as userRepo from '../repositories/user.repo';
import {
  signAccessToken,
  signRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  hashToken,
  JWTPayload,
  RefreshTokenContext,
} from './jwt.service';
import { writeLog } from './audit.service';
import { notify } from './notification.service';
import { Errors } from '../middleware/errors';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_S     = 600;   // 10 minutes
const OTP_LENGTH    = 6;

// ── Register ──────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  role: 'customer' | 'provider';
  full_name: string;
  phone?: string;
  business_name?: string;    // required for provider
  terms_accepted: true;
  privacy_accepted: true;
  marketing_consent: boolean;
  referral_code?: string;
  tokenContext?: RefreshTokenContext;
}

export async function register(input: RegisterInput): Promise<{
  user: userRepo.User;
  access_token: string;
  refresh_token: string;
  csrf_token: string;
}> {
  // Prevent duplicate emails
  const existing = await userRepo.findByEmail(input.email);
  if (existing) throw Errors.emailTaken();

  if (input.role === 'provider' && !input.business_name) {
    throw Errors.badRequest('business_name is required for provider accounts');
  }

  const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  const user = await db.withTransaction(async (client) => {
    const newUser = await userRepo.createUser(
      {
        email: input.email,
        password_hash,
        role: input.role,
        full_name: input.full_name,
        phone: input.phone,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        marketing_consent: input.marketing_consent,
      },
      client
    );

    if (input.role === 'customer') {
      await userRepo.createCustomerProfile(
        { user_id: newUser.id },
        client
      );
    } else {
      await userRepo.createProviderProfile(
        {
          user_id: newUser.id,
          business_name: input.business_name!,
        },
        client
      );
    }

    return newUser;
  });

  // In development, auto-verify email so users can post jobs immediately
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);
    user.email_verified = true;
  } else {
    // Send email verification link (fire-and-forget)
    void sendEmailVerification(user.id, user.email).catch(() => null);
  }

  writeLog({ action: 'user_created', actorId: user.id, targetType: 'user', targetId: user.id });

  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
    email_verified: isDev ? true : false,
    identity_verified: false,
  };

  const access_token = signAccessToken(payload);
  const refreshIssue = await signRefreshToken(user.id, input.tokenContext);

  return {
    user,
    access_token,
    refresh_token: refreshIssue.token,
    csrf_token: crypto.randomBytes(24).toString('hex'),
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
  tokenContext?: RefreshTokenContext;
}

export async function login(input: LoginInput): Promise<{
  user: userRepo.User;
  access_token: string;
  refresh_token: string;
  csrf_token: string;
}> {
  const user = await userRepo.findByEmail(input.email);

  // Constant-time comparison even on missing user (prevent timing attacks)
  const passwordMatch = user
    ? await bcrypt.compare(input.password, user.password_hash)
    : await bcrypt.compare(input.password, '$2b$12$placeholder.hash.to.prevent.timing.attacks.xx');

  if (!user || !passwordMatch) {
    throw Errors.unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw Errors.forbidden('Account suspended. Contact support.');
  }
  if (user.status === 'deleted') {
    throw Errors.notFound('Account not found');
  }

  // Update last login timestamp (non-blocking)
  userRepo.updateUser(user.id, { last_login_at: new Date() }).catch(() => null);

  writeLog({ action: 'user_updated', actorId: user.id, targetType: 'user', targetId: user.id, after: { event: 'login' } });

  // Build JWT payload with current verification state
  const [, providerProfile] = await Promise.all([
    user.role === 'customer' ? userRepo.findCustomerProfile(user.id) : Promise.resolve(null),
    user.role === 'provider' ? userRepo.findProviderProfile(user.id) : Promise.resolve(null),
  ]);

  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
    email_verified: user.email_verified,
    identity_verified: providerProfile?.identity_verified === true,
  };

  const access_token = signAccessToken(payload);
  const refreshIssue = await signRefreshToken(user.id, input.tokenContext);

  return {
    user,
    access_token,
    refresh_token: refreshIssue.token,
    csrf_token: crypto.randomBytes(24).toString('hex'),
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken);
}

// ── Refresh Tokens ────────────────────────────────────────────────────────────

export async function refreshTokens(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  csrf_token: string;
}> {
  const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(refreshToken);
  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    csrf_token: crypto.randomBytes(24).toString('hex'),
  };
}

export async function refreshTokensWithContext(
  refreshToken: string,
  tokenContext: RefreshTokenContext
): Promise<{
  access_token: string;
  refresh_token: string;
  csrf_token: string;
}> {
  const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(refreshToken, tokenContext);
  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    csrf_token: crypto.randomBytes(24).toString('hex'),
  };
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function sendEmailVerification(userId: string, _email: string): Promise<void> {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at, issued_at, last_used_at)
     VALUES ($1, $2, 'email_verify', $3, NOW(), NOW())`,
    [userId, hash, expiresAt]
  );

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;

  notify({
    userId,
    type: 'email_verify',
    channel: 'email',
    title: 'Verify your email address',
    body: `Click the link to verify your email: ${verifyUrl}`,
    data: { verifyUrl },
  });
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);

  const { rows } = await db.query<{
    id: string;
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
    revoked_at: Date | null;
  }>(
    `SELECT id, user_id, expires_at, used_at, revoked_at
     FROM auth_tokens
     WHERE token_hash = $1 AND token_type = 'email_verify'`,
    [hash]
  );

  if (rows.length === 0) throw Errors.badRequest('Invalid or expired verification link');

  const token = rows[0];

  if (token.used_at)    throw Errors.badRequest('Verification link already used');
  if (token.revoked_at) throw Errors.badRequest('Verification link has been revoked');
  if (new Date() > token.expires_at) throw Errors.badRequest('Verification link expired');

  await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET email_verified = TRUE WHERE id = $1`,
      [token.user_id]
    );
    await client.query(
      `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
      [token.id]
    );
  });

  writeLog({ action: 'user_updated', actorId: token.user_id, targetType: 'user', targetId: token.user_id, after: { email_verified: true } });
}

// ── Phone OTP ─────────────────────────────────────────────────────────────────

export async function requestPhoneOTP(phone: string, userId: string): Promise<void> {
  const otp = generateOTP(OTP_LENGTH);
  const key = `otp:${userId}:${normalisePhone(phone)}`;

  // Store OTP in Redis (rate-limited by rateLimit middleware upstream)
  await redis.set(key, otp, 'EX', OTP_TTL_S);

  // TODO: Send via SMS provider (Twilio/SNS)
  console.log(`[OTP] ${phone} → ${otp}`);

  writeLog({ action: 'user_updated', actorId: userId, after: { event: 'otp_requested' } });
}

export async function verifyPhoneOTP(
  phone: string,
  otp: string,
  userId: string
): Promise<void> {
  const key = `otp:${userId}:${normalisePhone(phone)}`;
  const stored = await redis.get(key);

  if (!stored || stored !== otp) {
    throw Errors.badRequest('Invalid or expired OTP');
  }

  await redis.del(key);

  await userRepo.updateUser(userId, { phone_verified: true, phone });

  writeLog({ action: 'user_updated', actorId: userId, targetType: 'user', targetId: userId, after: { phone_verified: true } });
}

// ── Forgot / Reset Password ───────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const user = await userRepo.findByEmail(email);

  // Always return success to prevent email enumeration
  if (!user) return;

  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Revoke any existing reset tokens
  await db.query(
    `UPDATE auth_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND token_type = 'password_reset' AND revoked_at IS NULL`,
    [user.id]
  );

  await db.query(
    `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at, issued_at, last_used_at)
     VALUES ($1, $2, 'password_reset', $3, NOW(), NOW())`,
    [user.id, hash, expiresAt]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${raw}`;

  notify({
    userId: user.id,
    type: 'password_reset',
    channel: 'email',
    title: 'Reset your password',
    body: `Click the link to reset your password: ${resetUrl}`,
    data: { resetUrl },
  });

  writeLog({ action: 'user_updated', actorId: user.id, targetType: 'user', targetId: user.id, after: { event: 'password_reset_requested' } });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const hash = hashToken(rawToken);

  const { rows } = await db.query<{
    id: string;
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
    revoked_at: Date | null;
  }>(
    `SELECT id, user_id, expires_at, used_at, revoked_at
     FROM auth_tokens
     WHERE token_hash = $1 AND token_type = 'password_reset'`,
    [hash]
  );

  if (rows.length === 0) throw Errors.badRequest('Invalid or expired reset link');

  const token = rows[0];

  if (token.used_at)    throw Errors.badRequest('Reset link already used');
  if (token.revoked_at) throw Errors.badRequest('Reset link has been revoked');
  if (new Date() > token.expires_at) throw Errors.badRequest('Reset link expired');

  const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [password_hash, token.user_id]
    );
    await client.query(
      `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
      [token.id]
    );
  });

  // Revoke all refresh tokens — user must re-authenticate
  await revokeAllUserTokens(token.user_id);

  writeLog({ action: 'user_updated', actorId: token.user_id, targetType: 'user', targetId: token.user_id, after: { event: 'password_reset' } });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOTP(length: number): string {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % digits.length];
  }
  return otp;
}

function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

