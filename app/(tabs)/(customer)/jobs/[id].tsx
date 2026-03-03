import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsAPI } from '../../../../src/api/jobs.api';
import { quotesAPI } from '../../../../src/api/quotes.api';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { StatusPill } from '../../../../src/components/ui/StatusPill';
import { getFeaturedCategoryById } from '../../../../src/content/categories';
import type { Quote } from '../../../../src/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${Math.round(cents / 100).toLocaleString('en-AU')}`;
}

function quotePrice(q: Quote): string {
  switch (q.quote_type) {
    case 'fixed':          return formatCents(q.price_fixed) + (q.is_gst_included ? ' incl. GST' : '');
    case 'estimate_range': return `${formatCents(q.price_min)} – ${formatCents(q.price_max)}`;
    case 'hourly':         return `${formatCents(q.hourly_rate)}/hr`;
    case 'call_for_quote': return 'Call for quote';
    default:               return '—';
  }
}

// ── Quote Card ────────────────────────────────────────────────────────────────

function QuoteCard({
  quote, jobId, jobStatus, onAction,
}: {
  quote: Quote; jobId: string; jobStatus: string; onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const canAct = jobStatus === 'posted' || jobStatus === 'quoting';

  const handle = async (action: 'shortlisted' | 'rejected' | 'award') => {
    setLoading(action);
    try {
      if (action === 'award') {
        await jobsAPI.awardJob(jobId, quote.id);
      } else {
        await quotesAPI.quoteAction(jobId, quote.id, action);
      }
      onAction();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card style={styles.quoteCard}>
      <View style={styles.quoteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>
            {quote.provider?.user?.full_name || quote.provider?.business_name || 'Provider'}
          </Text>
          <Text style={styles.quotePrice}>{quotePrice(quote)}</Text>
        </View>
        <StatusPill status={quote.status} size="sm" />
      </View>
      {quote.scope_notes ? (
        <Text style={styles.scopeNotes} numberOfLines={3}>{quote.scope_notes}</Text>
      ) : null}
      <View style={styles.quoteMeta}>
        {quote.timeline_days ? <Text style={styles.metaText}>{quote.timeline_days}d timeline</Text> : null}
        {quote.warranty_months ? <Text style={styles.metaText}>{quote.warranty_months}mo warranty</Text> : null}
      </View>
      {canAct && quote.status !== 'rejected' && (
        <View style={styles.quoteActions}>
          {quote.status !== 'shortlisted' && (
            <Button
              variant="outline" size="sm"
              onPress={() => handle('shortlisted')}
              loading={loading === 'shortlisted'}
              disabled={!!loading}
            >
              Shortlist
            </Button>
          )}
          <Button
            size="sm"
            onPress={() => handle('award')}
            loading={loading === 'award'}
            disabled={!!loading}
          >
            Award Job
          </Button>
          <Button
            variant="danger" size="sm"
            onPress={() => handle('rejected')}
            loading={loading === 'rejected'}
            disabled={!!loading}
          >
            Reject
          </Button>
        </View>
      )}
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CustomerJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.getJobById(id).then((r) => r.job),
    enabled: !!id,
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['jobQuotes', id],
    queryFn: () => quotesAPI.getQuotesForJob(id).then((r) => r.quotes),
    enabled: !!id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['job', id] });
    queryClient.invalidateQueries({ queryKey: ['jobQuotes', id] });
    queryClient.invalidateQueries({ queryKey: ['myJobs'] });
  };

  const handleJobAction = async (action: 'complete' | 'cancel') => {
    if (!job) return;
    Alert.alert(
      action === 'cancel' ? 'Cancel Job' : 'Mark Complete',
      action === 'cancel'
        ? 'Are you sure you want to cancel this job?'
        : 'Mark this job as complete?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: action === 'cancel' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(action);
            try {
              if (action === 'cancel') await jobsAPI.cancelJob(job.id);
              else await jobsAPI.completeJob(job.id);
              refresh();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Action failed');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (jobLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Job not found</Text>
        <Button onPress={() => router.back()} variant="outline" size="sm">Go Back</Button>
      </View>
    );
  }

  const canCancel = job.status === 'draft' || job.status === 'posted' || job.status === 'quoting';
  const canComplete = job.status === 'in_progress';
  const category = getFeaturedCategoryById(job.category_id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{job.title}</Text>
          <StatusPill status={job.status} size="sm" />
        </View>
      </View>

      {/* Job details */}
      <Card style={styles.section}>
        <Text style={styles.description}>{job.description}</Text>
        <View style={styles.detailGrid}>
          {category ? (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{category.name}</Text>
              <Text style={styles.detailHelp}>{category.short}</Text>
            </View>
          ) : null}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{job.suburb}, {job.state}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Budget</Text>
            <Text style={styles.detailValue}>
              {job.budget_min && job.budget_max
                ? `${formatCents(job.budget_min)} – ${formatCents(job.budget_max)}`
                : 'TBD'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Urgency</Text>
            <Text style={styles.detailValue}>
              {job.urgency?.replace(/_/g, ' ')}
            </Text>
          </View>
          {job.preferred_start_date && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start date</Text>
              <Text style={styles.detailValue}>
                {new Date(job.preferred_start_date).toLocaleDateString('en-AU')}
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Quotes */}
      <Text style={styles.sectionTitle}>
        Quotes {quotes && quotes.length > 0 ? `(${quotes.length})` : ''}
      </Text>
      {quotesLoading ? (
        <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 16 }} />
      ) : quotes && quotes.length > 0 ? (
        quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            jobId={job.id}
            jobStatus={job.status}
            onAction={refresh}
          />
        ))
      ) : (
        <Card style={styles.emptyQuotes}>
          <Text style={styles.emptyText}>No quotes received yet</Text>
        </Card>
      )}

      {/* Job actions */}
      {(canCancel || canComplete) && (
        <View style={styles.actions}>
          {canComplete && (
            <Button
              onPress={() => handleJobAction('complete')}
              loading={actionLoading === 'complete'}
              disabled={!!actionLoading}
              fullWidth
            >
              Mark Complete
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              onPress={() => handleJobAction('cancel')}
              loading={actionLoading === 'cancel'}
              disabled={!!actionLoading}
              fullWidth
              style={canComplete ? { marginTop: 8 } : undefined}
            >
              Cancel Job
            </Button>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  section: { marginBottom: 16 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 12 },
  detailGrid: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, gap: 10 },
  detailItem: {},
  detailLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 2 },
  detailHelp: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  quoteCard: { marginBottom: 10 },
  quoteHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  quotePrice: { fontSize: 18, fontWeight: '700', color: '#3B82F6', marginTop: 2 },
  scopeNotes: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  quoteMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 12, color: '#9CA3AF' },
  quoteActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 },
  emptyQuotes: { alignItems: 'center', padding: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  actions: { marginTop: 8 },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
});
