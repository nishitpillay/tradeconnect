import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-12 backdrop-blur">
      <div className="container">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-slate-950">TradeConnect</div>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
              A cleaner marketplace experience for customers posting work and providers building trust through better proof.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <Link href="/" className="transition hover:text-slate-900">Home</Link>
            <Link href="/user-experiences" className="transition hover:text-slate-900">User Experiences</Link>
            <Link href="/pricing" className="transition hover:text-slate-900">Pricing</Link>
            <Link href="/register" className="transition hover:text-slate-900">Get Started</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
