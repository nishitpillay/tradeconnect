'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { jobsAPI } from '@/lib/api/jobs';
import { quotesAPI } from '@/lib/api/quotes';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: myJobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['myJobs'],
    queryFn: () => jobsAPI.getMyJobs(),
    enabled: !!user && user.role === 'customer',
  });

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['jobFeed'],
    queryFn: () => jobsAPI.getFeed({ limit: 5 }),
    enabled: !!user && user.role === 'provider',
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['myQuotes'],
    queryFn: () => quotesAPI.getMyQuotes(),
    enabled: user?.role === 'provider',
  });

  const isLoading = jobsLoading || feedLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const myJobs = myJobsData?.jobs ?? [];
  const feedJobs = feedData?.jobs ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name}
        </h1>
        <p className="mt-2 text-gray-600">
          {user?.role === 'customer'
            ? 'Manage your jobs and find trusted tradies'
            : 'Browse jobs and grow your business'}
        </p>
      </div>

      {/* Customer Dashboard */}
      {user?.role === 'customer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">My Jobs</h2>
            <Link href="/jobs/new">
              <Button>Post New Job</Button>
            </Link>
          </div>

          {myJobs.length > 0 ? (
            <div className="grid gap-4">
              {myJobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card hover padding="lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {job.title}
                          </h3>
                          <StatusPill status={job.status} />
                        </div>
                        <p className="text-gray-600 line-clamp-2 mb-2">
                          {job.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{job.category?.name ?? job.suburb}</span>
                          <span>•</span>
                          <span>
                            {job.budget_min && job.budget_max
                              ? `$${Math.round(job.budget_min / 100).toLocaleString()} – $${Math.round(job.budget_max / 100).toLocaleString()}`
                              : 'Budget TBD'}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(job.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      {job.quote_count > 0 && (
                        <div className="ml-4 text-right">
                          <div className="text-2xl font-bold text-primary-600">
                            {job.quote_count}
                          </div>
                          <div className="text-sm text-gray-500">Quotes</div>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You haven't posted any jobs yet</p>
                <Link href="/jobs/new">
                  <Button>Post Your First Job</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Provider Dashboard */}
      {user?.role === 'provider' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {quotes?.filter((q) => q.status === 'pending').length || 0}
                </div>
                <div className="text-gray-600 mt-1">Pending Quotes</div>
              </div>
            </Card>
            <Card padding="lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {quotes?.filter((q) => q.status === 'awarded').length || 0}
                </div>
                <div className="text-gray-600 mt-1">Awarded Quotes</div>
              </div>
            </Card>
            <Card padding="lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">
                  {quotes?.length || 0}
                </div>
                <div className="text-gray-600 mt-1">Total Quotes</div>
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Available Jobs
            </h2>
            {feedJobs.length > 0 ? (
              <div className="grid gap-4">
                {feedJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card hover padding="lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 line-clamp-2 mb-2">
                            {job.description}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{job.category?.name ?? '—'}</span>
                            <span>•</span>
                            <span>
                              {job.budget_min && job.budget_max
                                ? `$${Math.round(job.budget_min / 100).toLocaleString()} – $${Math.round(job.budget_max / 100).toLocaleString()}`
                                : 'Budget TBD'}
                            </span>
                            <span>•</span>
                            <span>{job.suburb}, {job.state}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Job
                        </Button>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card padding="lg">
                <div className="text-center py-12">
                  <p className="text-gray-600">No jobs available in your area right now</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
