'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const PUBLIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/user-experiences', label: 'User Experiences' },
  { href: '/pricing', label: 'Pricing' },
];

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="container">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
              TC
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-950">TradeConnect</div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Marketplace OS</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {PUBLIC_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="rounded-full px-5">Log In</Button>
            </Link>
            <Link href="/register">
              <Button className="rounded-full bg-slate-900 px-5 hover:bg-slate-800">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
