'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { jobsAPI } from '@/lib/api/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const URGENCY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  within_48h: 'Within 48h',
  this_week: 'This week',
  this_month: 'This month',
  flexible: 'Flexible',
};

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Budget TBD';
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString('en-AU')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function JobFeedPage() {
  const [sort, setSort] = useState<'recommended' | 'newest' | 'budget_high' | 'budget_low'>('recommended');

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['jobFeed', sort],
    queryFn: ({ pageParam }) =>
      jobsAPI.getFeed({ sort, cursor: pageParam as string | undefined, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const jobs = data?.pages.flatMap((p) => p.jobs) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
        <div className="flex gap-2">
          {(['recommended', 'newest', 'budget_high', 'budget_low'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sort === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'recommended' ? 'Best match' : s === 'newest' ? 'Newest' : s === 'budget_high' ? 'Budget ↓' : 'Budget ↑'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : jobs.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-16">
            <p className="text-gray-500">No jobs available in your area right now</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card hover padding="lg">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{job.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>{job.suburb}, {job.state}</span>
                        <span>{formatBudget(job.budget_min, job.budget_max)}</span>
                        <span>{URGENCY_LABELS[job.urgency] ?? job.urgency}</span>
                        <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
                disabled={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
