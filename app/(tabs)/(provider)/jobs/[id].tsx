import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsAPI } from '../../../../src/api/jobs.api';
import { quotesAPI } from '../../../../src/api/quotes.api';
import { useSessionStore } from '../../../../src/stores/sessionStore';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { StatusPill } from '../../../../src/components/ui/StatusPill';
import { getFeaturedCategoryById } from '../../../../src/content/categories';

type QuoteType = 'fixed' | 'estimate_range' | 'hourly' | 'call_for_quote';

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${Math.round(cents / 100).toLocaleString('en-AU')}`;
}

// ── Submit Quote Form ─────────────────────────────────────────────────────────

function SubmitQuoteForm({ jobId, onSuccess }: { jobId: string; onSuccess: () => void }) {
  const [quoteType, setQuoteType] = useState<QuoteType>('fixed');
  const [priceFixed, setPriceFixed] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isGst, setIsGst] = useState(false);
  const [scopeNotes, setScopeNotes] = useState('');
  const [timelineDays, setTimelineDays] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const QUOTE_TYPES: { value: QuoteType; label: string }[] = [
    { value: 'fixed', label: 'Fixed price' },
    { value: 'estimate_range', label: 'Price range' },
    { value: 'hourly', label: 'Hourly rate' },
    { value: 'call_for_quote', label: 'Call for quote' },
  ];

  const handleSubmit = async () => {
    const toCents = (val: string) => Math.round(parseFloat(val) * 100);

    const payload: Parameters<typeof quotesAPI.submitQuote>[1] = {
      quote_type: quoteType,
      is_gst_included: isGst,
    };

    if (quoteType === 'fixed') {
      if (!priceFixed) { Alert.alert('Validation', 'Enter a fixed price'); return; }
      payload.price_fixed = toCents(priceFixed);
    } else if (quoteType === 'estimate_range') {
      if (!priceMin || !priceMax) { Alert.alert('Validation', 'Enter min and max price'); return; }
      payload.price_min = toCents(priceMin);
      payload.price_max = toCents(priceMax);
    } else if (quoteType === 'hourly') {
      if (!hourlyRate) { Alert.alert('Validation', 'Enter an hourly rate'); return; }
      payload.hourly_rate = toCents(hourlyRate);
    }

    if (scopeNotes && scopeNotes.length < 20) {
      Alert.alert('Validation', 'Scope notes must be at least 20 characters');
      return;
    }
    if (scopeNotes) payload.scope_notes = scopeNotes;
    if (timelineDays) payload.timeline_days = parseInt(timelineDays, 10);
    if (warrantyMonths) payload.warranty_months = parseInt(warrantyMonths, 10);

    setSubmitting(true);
    try {
      await quotesAPI.submitQuote(jobId, payload);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Submit Your Quote</Text>
      <Text style={styles.formHelp}>
        Use fixed for clearly scoped work, range when the site needs inspection, hourly for open-ended jobs, or call for quote when you need to discuss the job first.
      </Text>

      {/* Quote type selector */}
      <Text style={styles.fieldLabel}>Quote type</Text>
      <View style={styles.typeSelector}>
        {QUOTE_TYPES.map((t) => (
          <Button
            key={t.value}
            variant={quoteType === t.value ? 'primary' : 'outline'}
            size="sm"
            onPress={() => setQuoteType(t.value)}
            style={styles.typeButton}
          >
            {t.label}
          </Button>
        ))}
      </View>

      {/* Price inputs */}
      {quoteType === 'fixed' && (
        <>
          <Text style={styles.fieldLabel}>Fixed price (AUD)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={priceFixed}
              onChangeText={setPriceFixed}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        </>
      )}
      {quoteType === 'estimate_range' && (
        <View style={styles.rangeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Min (AUD)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput style={[styles.input, { flex: 1 }]} value={priceMin} onChangeText={setPriceMin}
                keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Max (AUD)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput style={[styles.input, { flex: 1 }]} value={priceMax} onChangeText={setPriceMax}
                keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </View>
        </View>
      )}
      {quoteType === 'hourly' && (
        <>
          <Text style={styles.fieldLabel}>Hourly rate (AUD)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput style={[styles.input, { flex: 1 }]} value={hourlyRate} onChangeText={setHourlyRate}
              keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </>
      )}

      {/* GST toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>Price includes GST</Text>
        <Switch value={isGst} onValueChange={setIsGst} />
      </View>

      {/* Scope notes */}
      <Text style={styles.fieldLabel}>Scope notes (optional, min 20 chars)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={scopeNotes}
        onChangeText={setScopeNotes}
        multiline
        numberOfLines={4}
        placeholder="Describe what's included..."
      />

      {/* Timeline & warranty */}
      <View style={styles.rangeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Timeline (days)</Text>
          <TextInput style={styles.input} value={timelineDays} onChangeText={setTimelineDays}
            keyboardType="number-pad" placeholder="e.g. 3" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Warranty (months)</Text>
          <TextInput style={styles.input} value={warrantyMonths} onChangeText={setWarrantyMonths}
            keyboardType="number-pad" placeholder="e.g. 12" />
        </View>
      </View>

      <Button onPress={handleSubmit} loading={submitting} disabled={submitting} fullWidth>
        Submit Quote
      </Button>
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProviderJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSessionStore();
  const [showForm, setShowForm] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.getJobById(id).then((r) => r.job),
    enabled: !!id,
  });

  const { data: quotes } = useQuery({
    queryKey: ['jobQuotes', id],
    queryFn: () => quotesAPI.getQuotesForJob(id).then((r) => r.quotes),
    enabled: !!id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['job', id] });
    queryClient.invalidateQueries({ queryKey: ['jobQuotes', id] });
  };

  const myQuote = quotes?.find((q) => q.provider_id === user?.id);
  const canSubmitQuote = !myQuote && (job?.status === 'posted' || job?.status === 'quoting');
  const myQuoteAwarded = myQuote?.status === 'awarded';
  const canAccept = myQuoteAwarded && job?.status === 'awarded';
  const category = job ? getFeaturedCategoryById(job.category_id) : undefined;

  const handleAccept = async () => {
    if (!job) return;
    setAccepting(true);
    try {
      await quotesAPI.acceptJob(job.id);
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept job');
    } finally {
      setAccepting(false);
    }
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <StatusPill status={job.status} size="sm" />
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
            <Text style={styles.detailValue}>{job.urgency?.replace(/_/g, ' ')}</Text>
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

      {/* Accept awarded job */}
      {canAccept && (
        <Button onPress={handleAccept} loading={accepting} disabled={accepting} fullWidth style={styles.section}>
          Accept Awarded Job
        </Button>
      )}

      {/* Own quote status */}
      {myQuote && (
        <>
          <Text style={styles.sectionTitle}>Your Quote</Text>
          <Card style={styles.section}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quotePrice}>{
                myQuote.quote_type === 'fixed' ? formatCents(myQuote.price_fixed) :
                myQuote.quote_type === 'estimate_range' ? `${formatCents(myQuote.price_min)} – ${formatCents(myQuote.price_max)}` :
                myQuote.quote_type === 'hourly' ? `${formatCents(myQuote.hourly_rate)}/hr` : 'Call for quote'
              }</Text>
              <StatusPill status={myQuote.status} size="sm" />
            </View>
            {myQuote.scope_notes ? <Text style={styles.scopeNotes}>{myQuote.scope_notes}</Text> : null}
            {myQuote.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onPress={async () => {
                  Alert.alert('Withdraw Quote', 'Withdraw your quote?', [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes', style: 'destructive', onPress: async () => {
                        try {
                          await quotesAPI.withdrawQuote(job.id, myQuote.id);
                          refresh();
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to withdraw');
                        }
                      }
                    }
                  ]);
                }}
                style={{ marginTop: 12 }}
              >
                Withdraw Quote
              </Button>
            )}
          </Card>
        </>
      )}

      {/* Submit quote */}
      {canSubmitQuote && (
        showForm ? (
          <SubmitQuoteForm
            jobId={job.id}
            onSuccess={() => { setShowForm(false); refresh(); }}
          />
        ) : (
          <Button onPress={() => setShowForm(true)} fullWidth style={styles.section}>
            Submit a Quote
          </Button>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  section: { marginBottom: 16 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 12 },
  detailGrid: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, gap: 10 },
  detailItem: {},
  detailLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 2 },
  detailHelp: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  quoteHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  quotePrice: { fontSize: 18, fontWeight: '700', color: '#3B82F6' },
  scopeNotes: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  formCard: { marginBottom: 16 },
  formTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 12 },
  formHelp: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 6 },
  fieldLabel: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 4, marginTop: 10 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  typeButton: { marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  currencyPrefix: { paddingHorizontal: 10, color: '#6B7280', fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  textArea: { height: 80, textAlignVertical: 'top' },
  rangeRow: { flexDirection: 'row', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
});
