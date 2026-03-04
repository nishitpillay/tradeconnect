/**
 * Auth Schema Unit Tests
 *
 * Validates Zod schemas used for registration, login, and OTP flows.
 */

import {
  RegisterSchema,
  LoginSchema,
  VerifyPhoneOTPSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../auth.schema';

// ── RegisterSchema ────────────────────────────────────────────────────────────

describe('RegisterSchema', () => {
  const valid = {
    email: 'john@example.com',
    password: 'SecurePass1!',
    full_name: 'John Smith',
    role: 'customer',
    terms_accepted: true as const,
    privacy_accepted: true as const,
  };

  it('accepts a valid registration', () => {
    expect(() => RegisterSchema.parse(valid)).not.toThrow();
  });

  it('normalises email to lowercase', () => {
    const result = RegisterSchema.parse({ ...valid, email: 'JOHN@EXAMPLE.COM' });
    expect(result.email).toBe('john@example.com');
  });

  it('rejects an invalid email address', () => {
    expect(() => RegisterSchema.parse({ ...valid, email: 'not-an-email' })).toThrow();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: 'Abc1!' })).toThrow();
  });

  it('rejects a password without uppercase', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: 'password1!' })).toThrow();
  });

  it('rejects a password without a digit', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: 'Password!' })).toThrow();
  });

  it('rejects a password without a special character', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: 'Password1' })).toThrow();
  });

  it('rejects a full name with only 1 character', () => {
    expect(() => RegisterSchema.parse({ ...valid, full_name: 'J' })).toThrow();
  });

  it('rejects role "superuser"', () => {
    expect(() => RegisterSchema.parse({ ...valid, role: 'superuser' })).toThrow();
  });

  it('accepts role "provider"', () => {
    expect(() => RegisterSchema.parse({ ...valid, role: 'provider' })).not.toThrow();
  });

  it('rejects when terms_accepted is false', () => {
    expect(() =>
      RegisterSchema.parse({ ...valid, terms_accepted: false })
    ).toThrow();
  });

  it('rejects when privacy_accepted is false', () => {
    expect(() =>
      RegisterSchema.parse({ ...valid, privacy_accepted: false })
    ).toThrow();
  });

  it('defaults marketing_consent to false', () => {
    const result = RegisterSchema.parse(valid);
    expect(result.marketing_consent).toBe(false);
  });
});

// ── LoginSchema ───────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() =>
      LoginSchema.parse({ email: 'user@example.com', password: 'anypassword' })
    ).not.toThrow();
  });

  it('normalises email to lowercase', () => {
    const result = LoginSchema.parse({ email: 'User@Example.COM', password: 'pass' });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects missing password', () => {
    expect(() => LoginSchema.parse({ email: 'user@example.com' })).toThrow();
  });

  it('rejects missing email', () => {
    expect(() => LoginSchema.parse({ password: 'pass' })).toThrow();
  });
});

// ── VerifyPhoneOTPSchema ──────────────────────────────────────────────────────

describe('VerifyPhoneOTPSchema', () => {
  const validPhone = '+61412345678';

  it('accepts a valid 6-digit OTP with valid phone', () => {
    expect(() =>
      VerifyPhoneOTPSchema.parse({ phone: validPhone, otp: '123456' })
    ).not.toThrow();
  });

  it('rejects a 5-digit OTP', () => {
    expect(() =>
      VerifyPhoneOTPSchema.parse({ phone: validPhone, otp: '12345' })
    ).toThrow();
  });

  it('rejects a 7-digit OTP', () => {
    expect(() =>
      VerifyPhoneOTPSchema.parse({ phone: validPhone, otp: '1234567' })
    ).toThrow();
  });

  it('rejects non-numeric OTP', () => {
    expect(() =>
      VerifyPhoneOTPSchema.parse({ phone: validPhone, otp: 'abcdef' })
    ).toThrow();
  });

  it('rejects an invalid AU phone number', () => {
    expect(() =>
      VerifyPhoneOTPSchema.parse({ phone: '+1555123456', otp: '123456' })
    ).toThrow();
  });
});

// ── ForgotPasswordSchema ──────────────────────────────────────────────────────

describe('ForgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(() => ForgotPasswordSchema.parse({ email: 'user@example.com' })).not.toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() => ForgotPasswordSchema.parse({ email: 'notanemail' })).toThrow();
  });
});

// ── ResetPasswordSchema ───────────────────────────────────────────────────────

describe('ResetPasswordSchema', () => {
  const valid = {
    token: 'some-reset-token',
    new_password: 'NewSecure1!',
  };

  it('accepts valid token and password', () => {
    expect(() => ResetPasswordSchema.parse(valid)).not.toThrow();
  });

  it('rejects weak new_password', () => {
    expect(() =>
      ResetPasswordSchema.parse({ ...valid, new_password: 'weak' })
    ).toThrow();
  });

  it('rejects missing token', () => {
    expect(() =>
      ResetPasswordSchema.parse({ new_password: 'NewSecure1!' })
    ).toThrow();
  });
});
