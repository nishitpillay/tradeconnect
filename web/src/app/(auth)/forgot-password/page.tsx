'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { authAPI } from '@/lib/api/auth';
import { ForgotPasswordSchema } from '@tradeconnect/shared/schemas/auth.schema';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');
    setSuccess(false);

    const result = ForgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full p-8">
      <div className="mb-8 text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Account Recovery</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="mt-2 text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {success ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-center text-green-800">
            If an account exists with that email, you will receive a password reset link shortly.
          </p>
          <div className="mt-4 text-center">
            <Link href="/login">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {apiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{apiError}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={errors.email}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
            Send Reset Link
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-600">Remember your password? </span>
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
