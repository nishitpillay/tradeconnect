import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRefreshCsrf } from '../middleware/csrf.middleware';
import {
  loginIpLimit,
  registerIpLimit,
  passwordResetLimit,
  phoneOtpLimit,
} from '../middleware/rateLimit.middleware';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RequestPhoneOTPSchema,
  VerifyPhoneOTPSchema,
} from '../schemas/auth.schema';

const router = Router();

// ── Public endpoints ──────────────────────────────────────────────────────────

router.post(
  '/register',
  registerIpLimit,
  validate(RegisterSchema),
  authCtrl.register
);

router.post(
  '/login',
  loginIpLimit,
  validate(LoginSchema),
  authCtrl.login
);

router.post(
  '/logout',
  authCtrl.logout  // no auth required — just clears cookie / revokes token
);

router.post(
  '/refresh',
  requireRefreshCsrf,
  authCtrl.refresh
);

router.get(
  '/verify-email',
  authCtrl.verifyEmail
);

router.post(
  '/forgot-password',
  passwordResetLimit,
  validate(ForgotPasswordSchema),
  authCtrl.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimit,
  validate(ResetPasswordSchema),
  authCtrl.resetPassword
);

// ── Authenticated endpoints ───────────────────────────────────────────────────

router.post(
  '/resend-verification',
  requireAuth,
  requireActive,
  authCtrl.resendVerification
);

router.post(
  '/phone/request-otp',
  requireAuth,
  requireActive,
  phoneOtpLimit,
  validate(RequestPhoneOTPSchema),
  authCtrl.requestPhoneOTP
);

router.post(
  '/phone/verify-otp',
  requireAuth,
  requireActive,
  validate(VerifyPhoneOTPSchema),
  authCtrl.verifyPhoneOTP
);

router.get(
  '/me',
  requireAuth,
  requireActive,
  authCtrl.me
);

export default router;
