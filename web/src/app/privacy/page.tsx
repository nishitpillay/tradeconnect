import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <PublicNav />

      <main className="container py-16 md:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)] md:p-10">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Privacy</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            TradeConnect Privacy Policy
          </h1>
          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600 md:text-base">
            <section>
              <h2 className="text-xl font-semibold text-slate-950">What we collect</h2>
              <p className="mt-3">
                TradeConnect stores account details, profile information, job and quote activity, messaging metadata,
                and review content needed to run the marketplace experience across web and mobile.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">How data is used</h2>
              <p className="mt-3">
                Data is used to authenticate users, match jobs to providers, surface reviews and ratings, and support
                operational functions such as notifications, fraud controls, moderation, and platform analytics.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Security and retention</h2>
              <p className="mt-3">
                We use access controls, encrypted transport, and service-layer safeguards to protect platform data.
                Some information is retained for operational, legal, and dispute-resolution purposes after account
                activity ends.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Contact and requests</h2>
              <p className="mt-3">
                If you need to update, correct, or remove account data, contact the TradeConnect support team through
                the official channels provided in the application or project documentation.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
