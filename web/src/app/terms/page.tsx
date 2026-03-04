import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_58%,_#f4f7fb_100%)]" />

      <PublicNav />

      <main>
        <section className="container py-16 md:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
              Service rules, subscription terms, and platform conduct
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-tight text-slate-950 md:text-7xl">
              Terms of service that match the same polished public experience.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              These terms explain how TradeConnect handles quoting, awards, subscriptions, reviews, and marketplace
              conduct across the product.
            </p>
          </div>
        </section>

        <section className="container pb-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)] md:p-10">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Terms</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              TradeConnect Terms of Service
            </h2>
            <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600 md:text-base">
              <section>
                <h3 className="text-xl font-semibold text-slate-950">Platform use</h3>
                <p className="mt-3">
                  TradeConnect connects customers and providers for quoting, messaging, awarding work, and collecting
                  post-job feedback. Users must provide accurate profile details and must not misuse the platform to
                  misrepresent identity, pricing, licensing, or trade capability.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">Accounts and conduct</h3>
                <p className="mt-3">
                  You are responsible for activity performed through your account. Customers must post lawful work
                  requests, and providers must only accept work they are qualified and permitted to perform. Abuse,
                  spam, scraping, or attempts to bypass platform safeguards may result in suspension.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">Quotes, jobs, and reviews</h3>
                <p className="mt-3">
                  Quotes and reviews are user-submitted content. TradeConnect provides the workflow and visibility
                  layer, but users remain responsible for the scope, pricing, licensing, and completion of any actual
                  work arranged through the platform.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">Subscription terms</h3>
                <p className="mt-3">
                  Promotional pricing, one-time passes, and monthly subscription options may change over time. Trial
                  and no-lock-in offers are subject to the rules displayed on the pricing page at the time of purchase.
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
