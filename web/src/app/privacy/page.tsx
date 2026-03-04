import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_58%,_#f4f7fb_100%)]" />

      <PublicNav />

      <main>
        <section className="container py-16 md:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
              Privacy, data handling, and platform account information
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
              Privacy terms written with the same clarity as the product.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              TradeConnect collects the operational data needed to run jobs, quotes, reviews, and marketplace
              messaging across web and mobile.
            </p>
          </div>
        </section>

        <section className="container pb-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)] md:p-10">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Privacy</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              TradeConnect Privacy Policy
            </h2>
            <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600 md:text-base">
              <section>
                <h3 className="text-xl font-semibold text-slate-950">What we collect</h3>
                <p className="mt-3">
                  TradeConnect stores account details, profile information, job and quote activity, messaging metadata,
                  and review content needed to run the marketplace experience across web and mobile.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">How data is used</h3>
                <p className="mt-3">
                  Data is used to authenticate users, match jobs to providers, surface reviews and ratings, and
                  support operational functions such as notifications, fraud controls, moderation, and platform
                  analytics.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">Security and retention</h3>
                <p className="mt-3">
                  We use access controls, encrypted transport, and service-layer safeguards to protect platform data.
                  Some information is retained for operational, legal, and dispute-resolution purposes after account
                  activity ends.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">Contact and requests</h3>
                <p className="mt-3">
                  If you need to update, correct, or remove account data, contact the TradeConnect support team through
                  the official channels provided in the application or project documentation.
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
