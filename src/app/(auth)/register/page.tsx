'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { RegisterSchema } from '@tradeconnect/shared/schemas/auth.schema';
import { UserRole } from '@/types';
import { socketClient } from '@/lib/socket/client';
import clsx from 'clsx';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setAccessToken, setAuthenticated } = useAuthStore();

  const [role, setRole] = useState<UserRole | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    if (!role) {
      setErrors({ role: 'Please select a role' });
      return;
    }

    // Validate with Zod
    const normalizedPhone = phone
      ? (phone.startsWith('0') ? `+61${phone.slice(1)}` : phone)
      : undefined;

    const result = RegisterSchema.safeParse({
      email,
      password,
      full_name: fullName,
      phone: normalizedPhone,
      role,
      business_name: role === 'provider' ? businessName : undefined,
      terms_accepted: termsAccepted || undefined,
      privacy_accepted: privacyAccepted || undefined,
    });

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
      // Convert AU phone 04XXXXXXXX → +614XXXXXXX for backend
      const response = await authAPI.register({
        email,
        password,
        full_name: fullName,
        phone: normalizedPhone,
        role: role as UserRole,
        business_name: role === 'provider' ? businessName : undefined,
        terms_accepted: true,
        privacy_accepted: true,
        marketing_consent: false,
      });

      // Store auth data
      setUser(response.user);
      setAccessToken(response.access_token);
      setAuthenticated(true);

      // Connect socket
      socketClient.connect(response.access_token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      setApiError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
        <p className="mt-2 text-gray-600">Join TradeConnect today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {apiError}
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I want to... <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={clsx(
                'p-4 rounded-lg border-2 text-left transition-all',
                role === 'customer'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              <div className="font-medium">Hire a Tradie</div>
              <div className="text-sm text-gray-600">Post jobs & get quotes</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('provider')}
              className={clsx(
                'p-4 rounded-lg border-2 text-left transition-all',
                role === 'provider'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              <div className="font-medium">Work as a Tradie</div>
              <div className="text-sm text-gray-600">Find jobs & send quotes</div>
            </button>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
        </div>

        <Input
          type="text"
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.full_name}
          required
          autoComplete="name"
        />

        <Input
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          autoComplete="email"
        />

        <Input
          type="tel"
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="04XXXXXXXX"
          required
          autoComplete="tel"
        />

        {role === 'provider' && (
          <Input
            type="text"
            label="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.business_name}
            placeholder="e.g. Smith Plumbing & Gas"
            required
            autoComplete="organization"
          />
        )}

        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          helperText="Min 8 characters, with an uppercase letter, number, and special character"
          required
          autoComplete="new-password"
        />

        {/* Terms & Privacy */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-500 underline" target="_blank">
                Terms of Service
              </Link>
              <span className="text-red-500"> *</span>
            </span>
          </label>
          {errors.terms_accepted && (
            <p className="text-sm text-red-600 ml-7">{errors.terms_accepted}</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-500 underline" target="_blank">
                Privacy Policy
              </Link>
              <span className="text-red-500"> *</span>
            </span>
          </label>
          {errors.privacy_accepted && (
            <p className="text-sm text-red-600 ml-7">{errors.privacy_accepted}</p>
          )}
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Create Account
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            Sign in
          </Link>
        </div>
      </form>
    </Card>
  );
}
