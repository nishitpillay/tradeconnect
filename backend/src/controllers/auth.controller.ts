import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import * as authService from '../services/auth.service';
import * as userRepo from '../repositories/user.repo';
import { env } from '../config/env';

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenContext = buildTokenContext(req);
    const { user, access_token, refresh_token, csrf_token } = await authService.register({
      ...req.body,
      tokenContext,
    });

    setDeviceCookie(res, tokenContext.deviceId!);
    res.cookie('refresh_token', refresh_token, cookieOptions());
    res.cookie('csrf_token', csrf_token, csrfCookieOptions());
    const includeRefreshToken = shouldIncludeRefreshTokenInBody(req);
    res.status(201).json({
      user: sanitiseUser(user),
      access_token,
      ...(includeRefreshToken ? { refresh_token } : {}),
      csrf_token,
    });
  } catch (err) {
    next(err);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenContext = buildTokenContext(req);
    const { user, access_token, refresh_token, csrf_token } = await authService.login({
      ...req.body,
      tokenContext,
    });

    setDeviceCookie(res, tokenContext.deviceId!);
    res.cookie('refresh_token', refresh_token, cookieOptions());
    res.cookie('csrf_token', csrf_token, csrfCookieOptions());
    const includeRefreshToken = shouldIncludeRefreshTokenInBody(req);
    res.json({
      user: sanitiseUser(user),
      access_token,
      ...(includeRefreshToken ? { refresh_token } : {}),
      csrf_token,
    });
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token =
      (req.cookies?.refresh_token as string | undefined) ||
      (req.body?.refresh_token as string | undefined);

    if (token) {
      await authService.logout(token);
    }

    res.clearCookie('refresh_token', cookieOptions());
    res.clearCookie('csrf_token', csrfCookieOptions());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken =
      (req.cookies?.refresh_token as string | undefined) ||
      (req.body?.refresh_token as string | undefined);

    if (!rawToken) {
      res.status(401).json({ message: 'No refresh token provided' });
      return;
    }

    const tokenContext = buildTokenContext(req);
    const { access_token, refresh_token, csrf_token } = await authService.refreshTokensWithContext(rawToken, tokenContext);

    setDeviceCookie(res, tokenContext.deviceId!);
    res.cookie('refresh_token', refresh_token, cookieOptions());
    res.cookie('csrf_token', csrf_token, csrfCookieOptions());
    const includeRefreshToken = shouldIncludeRefreshTokenInBody(req);
    res.json({
      access_token,
      ...(includeRefreshToken ? { refresh_token } : {}),
      csrf_token,
    });
  } catch (err) {
    next(err);
  }
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query as { token: string };
    await authService.verifyEmail(token);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.user!;
    const user = await userRepo.findById(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    await authService.sendEmailVerification(userId, user.email);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
}

// ── Phone OTP ─────────────────────────────────────────────────────────────────

export async function requestPhoneOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = req.body as { phone: string };
    await authService.requestPhoneOTP(phone, req.user!.userId);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
}

export async function verifyPhoneOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp } = req.body as { phone: string; otp: string };
    await authService.verifyPhoneOTP(phone, otp, req.user!.userId);
    res.json({ message: 'Phone verified successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Forgot / Reset Password ───────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);
    // Always return 200 to prevent email enumeration
    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, new_password } = req.body as { token: string; new_password: string };
    await authService.resetPassword(token, new_password);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Me ────────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitiseUser(user: {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    full_name: user.full_name,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    created_at: user.created_at,
  };
}

function cookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days ms
    path: '/api/auth',
  };
}

function csrfCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}

function deviceCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setDeviceCookie(res: Response, deviceId: string) {
  res.cookie('device_id', deviceId, deviceCookieOptions());
}

function buildTokenContext(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.ip ?? null;
  const userAgent = req.get('user-agent') ?? null;
  const headerDeviceId = req.get('x-device-id')?.trim();
  const cookieDeviceId = (req.cookies?.device_id as string | undefined)?.trim();
  const deviceId = headerDeviceId || cookieDeviceId || randomUUID();

  return {
    deviceId,
    ipAddress,
    userAgent,
  };
}

function shouldIncludeRefreshTokenInBody(req: Request): boolean {
  const explicitClientType = req.get('x-client-type')?.toLowerCase();
  if (explicitClientType === 'mobile' || explicitClientType === 'native') return true;

  // Browser requests generally include Origin for CORS POST calls.
  // Native clients typically do not, and rely on body refresh_token.
  return !req.get('origin');
}
