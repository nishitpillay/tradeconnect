'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep this minimal and only for debugging fallback visibility in dev/prod.
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Something went wrong on this page.</h1>
      <p className="text-sm text-slate-600">
        Please retry. If this keeps happening, refresh once and report the time it occurred.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
      >
        Retry
      </button>
    </main>
  );
}
