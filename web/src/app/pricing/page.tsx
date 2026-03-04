'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';
import { PRICING_PLANS, PRICING_POLICY_NOTES } from '@/content/marketing';
import { useAuthStore } from '@/lib/store/authStore';

export default function PricingPage() {
  const { isAuthenticated } = useAuthStore();
  const primaryCtaHref = isAuthenticated ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_58%,_#f4f7fb_100%)]" />

      <PublicNav />

      <section className="container py-16 md:py-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
            Simple TradeConnect pricing for customers and providers
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
            Pricing designed to stay easy to understand.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            A lightweight monthly pricing ladder with a clear 36-month minimum commitment, plus a one-time no lock-in
            access pass for users who want to try the platform first.
          </p>
        </div>
      </section>

      <section className="container pb-10">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-[2rem] border p-8 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)] ${
                plan.highlight
                  ? 'border-slate-900 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`text-sm font-semibold uppercase tracking-[0.2em] ${plan.highlight ? 'text-sky-200' : 'text-sky-700'}`}>
                    {plan.name}
                  </div>
                  <div className="mt-5 flex items-end gap-2">
                    <div className="text-5xl font-semibold tracking-tight">{plan.priceLabel}</div>
                    <div className={`pb-2 text-sm ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
                      {plan.cadence}
                    </div>
                  </div>
                </div>

                {plan.highlight ? (
                  <div className="rounded-full border border-sky-400/60 bg-sky-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100 shadow-sm">
                    Recommended
                  </div>
                ) : null}
              </div>

              <p className={`mt-5 text-sm leading-7 ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                {plan.description}
              </p>

              {plan.minimumTerm && plan.minimumTotal ? (
                <div
                  className={`mt-6 rounded-[1.25rem] border p-4 ${
                    plan.highlight ? 'border-white/10 bg-white/5' : 'border-sky-100 bg-sky-50/80'
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${plan.highlight ? 'text-sky-200' : 'text-sky-700'}`}>
                    Minimum commitment
                  </div>
                  <div className={`mt-2 text-sm ${plan.highlight ? 'text-slate-200' : 'text-slate-700'}`}>
                    {plan.minimumTerm}
                  </div>
                  <div className={`mt-1 text-sm font-semibold ${plan.highlight ? 'text-white' : 'text-slate-950'}`}>
                    {plan.minimumTotal}
                  </div>
                </div>
              ) : null}

              <ul className="mt-6 space-y-3">
                {plan.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className={`flex items-start gap-3 text-sm leading-7 ${
                      plan.highlight ? 'text-slate-200' : 'text-slate-700'
                    }`}
                  >
                    <span className={`mt-2 h-2.5 w-2.5 rounded-full ${plan.highlight ? 'bg-sky-300' : 'bg-sky-500'}`} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href={primaryCtaHref}>
                  <Button
                    className={`w-full rounded-full px-6 ${
                      plan.highlight
                        ? 'bg-sky-300 text-slate-950 hover:bg-sky-200'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.4)]">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Pricing policy</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              The no lock-in pass has a clear one-time rule.
            </h2>
            <div className="mt-6 space-y-4">
              {PRICING_POLICY_NOTES.map((note) => (
                <div key={note} className="rounded-[1.25rem] bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {note}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-[0_25px_60px_-45px_rgba(15,23,42,0.75)]">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Why it is structured this way</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Simple entry, clear upgrade path.</h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              The monthly plans stay deliberately simple, but each subscription tier carries a 36-month minimum term so
              the commitment is visible up front.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-300">
              The one-time $20 pass gives first-time users a 30-day evaluation window. To prevent repeat trial cycling,
              any returning user with the same address and phone number must move to a monthly subscription plan on
              their next signup cycle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primaryCtaHref}>
                <Button className="rounded-full bg-sky-300 px-6 text-slate-950 hover:bg-sky-200">
                  Start with TradeConnect
                </Button>
              </Link>
              <Link href="/user-experiences">
                <Button variant="outline" className="rounded-full border-white/20 px-6 text-white hover:bg-white/5">
                  See User Experiences
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
