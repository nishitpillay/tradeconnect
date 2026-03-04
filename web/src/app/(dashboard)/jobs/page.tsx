'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { jobsAPI } from '@/lib/api/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import type { JobStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: JobStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'posted' },
  { label: 'Quoting', value: 'quoting' },
  { label: 'Awarded', value: 'awarded' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Budget TBD';
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString('en-AU')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function MyJobsPage() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['myJobs', statusFilter],
    queryFn: () => jobsAPI.getMyJobs(statusFilter || undefined),
  });

  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
        <Link href="/jobs/new"><Button>Post New Job</Button></Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : jobs.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">
              {statusFilter ? 'No jobs with this status' : "You haven't posted any jobs yet"}
            </p>
            <Link href="/jobs/new"><Button>Post Your First Job</Button></Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card hover padding="lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
                      <StatusPill status={job.status} />
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>{job.suburb}, {job.state}</span>
                      <span>{formatBudget(job.budget_min, job.budget_max)}</span>
                      <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {job.quote_count > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-primary-600">{job.quote_count}</div>
                      <div className="text-xs text-gray-500">Quotes</div>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
