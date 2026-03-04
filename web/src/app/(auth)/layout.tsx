'use client';

import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_58%,_#f4f7fb_100%)]" />

      <PublicNav />

      <main className="container py-16 md:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_0.8fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
              Secure customer and provider access across web and mobile
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
              Stay signed in while you move from discovery to action.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              Browse contractors, review real before-and-after work, inspect pricing, and continue into your account
              without losing session context.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)]">
                <div className="text-2xl font-semibold tracking-tight text-slate-950">8</div>
                <div className="mt-1 text-sm text-slate-500">featured categories</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)]">
                <div className="text-2xl font-semibold tracking-tight text-slate-950">40</div>
                <div className="mt-1 text-sm text-slate-500">demo providers</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.35)]">
                <div className="text-2xl font-semibold tracking-tight text-slate-950">80</div>
                <div className="mt-1 text-sm text-slate-500">seeded reviews</div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md justify-self-end">
            {children}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
