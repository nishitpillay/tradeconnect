import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <PublicNav />

      <main className="container py-16 md:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)] md:p-10">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Terms</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            TradeConnect Terms of Service
          </h1>
          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600 md:text-base">
            <section>
              <h2 className="text-xl font-semibold text-slate-950">Platform use</h2>
              <p className="mt-3">
                TradeConnect connects customers and providers for quoting, messaging, awarding work, and collecting
                post-job feedback. Users must provide accurate profile details and must not misuse the platform to
                misrepresent identity, pricing, licensing, or trade capability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Accounts and conduct</h2>
              <p className="mt-3">
                You are responsible for activity performed through your account. Customers must post lawful work
                requests, and providers must only accept work they are qualified and permitted to perform. Abuse,
                spam, scraping, or attempts to bypass platform safeguards may result in suspension.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Quotes, jobs, and reviews</h2>
              <p className="mt-3">
                Quotes and reviews are user-submitted content. TradeConnect provides the workflow and visibility layer,
                but users remain responsible for the scope, pricing, licensing, and completion of any actual work
                arranged through the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Subscription terms</h2>
              <p className="mt-3">
                Promotional pricing, one-time passes, and monthly subscription options may change over time. Trial and
                no-lock-in offers are subject to the rules displayed on the pricing page at the time of purchase.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
