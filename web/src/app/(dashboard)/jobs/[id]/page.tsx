'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '@/lib/store/authStore';
import { jobsAPI } from '@/lib/api/jobs';
import { quotesAPI } from '@/lib/api/quotes';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { Badge } from '@/components/ui/Badge';
import type { Quote } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function quotePrice(q: Quote): string {
  switch (q.quote_type) {
    case 'fixed':
      return formatCents(q.price_fixed) + (q.is_gst_included ? ' incl. GST' : '');
    case 'estimate_range':
      return `${formatCents(q.price_min)} – ${formatCents(q.price_max)}`;
    case 'hourly':
      return `${formatCents(q.hourly_rate)}/hr`;
    case 'call_for_quote':
      return 'Call for quote';
    default:
      return '—';
  }
}

// ── Submit Quote Form ─────────────────────────────────────────────────────────

function SubmitQuoteForm({ jobId, onSuccess }: { jobId: string; onSuccess: () => void }) {
  const [quoteType, setQuoteType] = useState<'fixed' | 'estimate_range' | 'hourly' | 'call_for_quote'>('fixed');
  const [priceFixed, setPriceFixed] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isGst, setIsGst] = useState(false);
  const [scopeNotes, setScopeNotes] = useState('');
  const [timelineDays, setTimelineDays] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Convert dollars → cents
    const toCents = (val: string) => Math.round(parseFloat(val) * 100);

    const payload: Parameters<typeof quotesAPI.submitQuote>[1] = { quote_type: quoteType, is_gst_included: isGst };

    if (quoteType === 'fixed') {
      if (!priceFixed) { setError('Enter a fixed price'); return; }
      payload.price_fixed = toCents(priceFixed);
    } else if (quoteType === 'estimate_range') {
      if (!priceMin || !priceMax) { setError('Enter min and max price'); return; }
      payload.price_min = toCents(priceMin);
      payload.price_max = toCents(priceMax);
    } else if (quoteType === 'hourly') {
      if (!hourlyRate) { setError('Enter an hourly rate'); return; }
      payload.hourly_rate = toCents(hourlyRate);
    }

    if (scopeNotes && scopeNotes.length < 20) { setError('Scope notes must be at least 20 characters'); return; }
    if (scopeNotes) payload.scope_notes = scopeNotes;
    if (timelineDays) payload.timeline_days = parseInt(timelineDays, 10);
    if (warrantyMonths) payload.warranty_months = parseInt(warrantyMonths, 10);

    setIsSubmitting(true);
    try {
      await quotesAPI.submitQuote(jobId, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card padding="lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Quote</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{error}</div>
        )}

        {/* Quote type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quote type</label>
          <select
            value={quoteType}
            onChange={(e) => setQuoteType(e.target.value as typeof quoteType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="fixed">Fixed price</option>
            <option value="estimate_range">Price range / estimate</option>
            <option value="hourly">Hourly rate</option>
            <option value="call_for_quote">Call for quote</option>
          </select>
        </div>

        {/* Price fields */}
        {quoteType === 'fixed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fixed price (AUD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number" min="1" step="0.01" value={priceFixed}
                onChange={(e) => setPriceFixed(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {quoteType === 'estimate_range' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min (AUD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input type="number" min="1" step="0.01" value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max (AUD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input type="number" min="1" step="0.01" value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {quoteType === 'hourly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly rate (AUD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input type="number" min="1" step="0.01" value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* GST toggle */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="gst" checked={isGst} onChange={(e) => setIsGst(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <label htmlFor="gst" className="text-sm text-gray-700">Price includes GST</label>
        </div>

        {/* Scope notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scope notes <span className="text-gray-400">(optional, min 20 chars)</span>
          </label>
          <textarea
            value={scopeNotes}
            onChange={(e) => setScopeNotes(e.target.value)}
            rows={3}
            placeholder="Describe what's included in your quote..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Timeline & warranty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeline (days)</label>
            <input type="number" min="1" value={timelineDays}
              onChange={(e) => setTimelineDays(e.target.value)}
              placeholder="e.g. 3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (months)</label>
            <input type="number" min="0" value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
              placeholder="e.g. 12"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
          Submit Quote
        </Button>
      </form>
    </Card>
  );
}

// ── Quote Card (customer view) ────────────────────────────────────────────────

function QuoteCard({
  quote,
  jobId,
  jobStatus,
  onAction,
}: {
  quote: Quote;
  jobId: string;
  jobStatus: string;
  onAction: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const canAct = jobStatus === 'posted' || jobStatus === 'quoting';

  const handleAction = async (action: 'shortlisted' | 'rejected' | 'award') => {
    setLoadingAction(action);
    try {
      if (action === 'award') {
        await jobsAPI.awardJob(jobId, quote.id);
      } else {
        await quotesAPI.quoteAction(jobId, quote.id, action);
      }
      onAction();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">
              {quote.provider?.full_name || 'Provider'}
            </span>
            <Badge variant={quote.status as any}>{quote.status}</Badge>
          </div>
          <p className="text-lg font-bold text-primary-600">{quotePrice(quote)}</p>
          {quote.scope_notes && (
            <p className="text-sm text-gray-600">{quote.scope_notes}</p>
          )}
          <div className="flex gap-4 text-sm text-gray-500">
            {quote.timeline_days && <span>{quote.timeline_days}d timeline</span>}
            {quote.warranty_months != null && quote.warranty_months > 0 && (
              <span>{quote.warranty_months}mo warranty</span>
            )}
            <span>{formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {canAct && quote.status !== 'rejected' && (
          <div className="flex flex-col gap-2">
            {quote.status !== 'shortlisted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('shortlisted')}
                isLoading={loadingAction === 'shortlisted'}
                disabled={!!loadingAction}
              >
                Shortlist
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleAction('award')}
              isLoading={loadingAction === 'award'}
              disabled={!!loadingAction}
            >
              Award Job
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleAction('rejected')}
              isLoading={loadingAction === 'rejected'}
              disabled={!!loadingAction}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const { data: job, isLoading: jobLoading, error: jobError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.getJobById(id),
    enabled: !!id,
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['jobQuotes', id],
    queryFn: () => quotesAPI.getQuotesForJob(id),
    enabled: !!id && !!user,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['job', id] });
    queryClient.invalidateQueries({ queryKey: ['jobQuotes', id] });
  };

  const handleJobAction = async (action: 'complete' | 'cancel' | 'accept') => {
    if (!job) return;
    setActionLoading(action);
    try {
      if (action === 'complete') await jobsAPI.completeJob(job.id);
      else if (action === 'cancel') await jobsAPI.cancelJob(job.id);
      else if (action === 'accept') await quotesAPI.acceptJob(job.id);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const myQuote = user?.role === 'provider'
    ? quotes?.find((q) => q.provider_id === user.id)
    : null;

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';
  const isOwner = isCustomer && job?.customer_id === user?.id;

  if (jobLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Job not found or you don&apos;t have access.</p>
        <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const canSubmitQuote = isProvider && !myQuote && (job.status === 'posted' || job.status === 'quoting');
  const myQuoteAwarded = myQuote?.status === 'awarded';
  const canAcceptJob = isProvider && myQuoteAwarded && job.status === 'awarded';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={isProvider ? '/dashboard' : '/jobs'}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <StatusPill status={job.status} />
          </div>
          <p className="text-sm text-gray-500">
            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Customer actions */}
        {isOwner && (
          <div className="flex gap-2">
            {job.status === 'in_progress' && (
              <Button
                onClick={() => handleJobAction('complete')}
                isLoading={actionLoading === 'complete'}
                disabled={!!actionLoading}
              >
                Mark Complete
              </Button>
            )}
            {(job.status === 'posted' || job.status === 'quoting' || job.status === 'draft') && (
              <Button
                variant="danger"
                onClick={() => handleJobAction('cancel')}
                isLoading={actionLoading === 'cancel'}
                disabled={!!actionLoading}
              >
                Cancel Job
              </Button>
            )}
          </div>
        )}

        {/* Provider: accept job if awarded */}
        {canAcceptJob && (
          <Button
            onClick={() => handleJobAction('accept')}
            isLoading={actionLoading === 'accept'}
            disabled={!!actionLoading}
          >
            Accept Job
          </Button>
        )}
      </div>

      {/* Job details */}
      <Card padding="lg">
        <div className="space-y-4">
          <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{job.approximate_address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Budget</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{job.budget_range || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Urgency</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{job.urgency?.replace(/_/g, ' ') || '—'}</p>
            </div>
            {job.preferred_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Preferred date</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {format(new Date(job.preferred_date), 'd MMM yyyy')}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Provider: own quote status */}
      {isProvider && myQuote && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Quote</h2>
          <Card padding="lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-primary-600">{quotePrice(myQuote)}</p>
                {myQuote.scope_notes && (
                  <p className="text-sm text-gray-600 mt-1">{myQuote.scope_notes}</p>
                )}
              </div>
              <Badge variant={myQuote.status as any}>{myQuote.status}</Badge>
            </div>
            {myQuote.status === 'pending' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Withdraw your quote?')) return;
                    try {
                      await quotesAPI.withdrawQuote(job.id, myQuote.id);
                      refresh();
                    } catch (err: any) {
                      alert(err.message || 'Failed to withdraw');
                    }
                  }}
                >
                  Withdraw Quote
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Provider: submit quote form */}
      {isProvider && canSubmitQuote && (
        <div>
          {showQuoteForm ? (
            <SubmitQuoteForm
              jobId={job.id}
              onSuccess={() => {
                setShowQuoteForm(false);
                refresh();
              }}
            />
          ) : (
            <Button onClick={() => setShowQuoteForm(true)}>Submit a Quote</Button>
          )}
        </div>
      )}

      {/* Customer: quotes list */}
      {isOwner && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Quotes {quotes && quotes.length > 0 && `(${quotes.length})`}
          </h2>
          {quotesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : quotes && quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  jobId={job.id}
                  jobStatus={job.status}
                  onAction={refresh}
                />
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <p className="text-center text-gray-500 py-8">No quotes received yet</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
