import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { jobsAPI } from '../../../../src/api/jobs.api';
import { FEATURED_CATEGORIES } from '../../../../src/content/categories';

// ── Category data (fixed UUIDs from seed) ────────────────────────────────────

const CATEGORIES = [
  { id: 'a0000001-0000-4000-a000-000000000001', name: 'Plumbing',           icon: '🔧' },
  { id: 'a0000002-0000-4000-a000-000000000002', name: 'Electrical',         icon: '⚡' },
  { id: 'a0000003-0000-4000-a000-000000000003', name: 'Carpentry',          icon: '🪚' },
  { id: 'a0000004-0000-4000-a000-000000000004', name: 'Painting',           icon: '🖌️' },
  { id: 'a0000005-0000-4000-a000-000000000005', name: 'Landscaping',        icon: '🌿' },
  { id: 'a0000006-0000-4000-a000-000000000006', name: 'Cleaning',           icon: '✨' },
  { id: 'a0000007-0000-4000-a000-000000000007', name: 'Heating & Cooling',  icon: '🌡️' },
  { id: 'a0000008-0000-4000-a000-000000000008', name: 'Tiling',             icon: '▪️' },
  { id: 'a0000009-0000-4000-a000-000000000009', name: 'Roofing',            icon: '🏠' },
  { id: 'a000000a-0000-4000-a000-00000000000a', name: 'Pest Control',       icon: '🐛' },
  { id: 'a000000b-0000-4000-a000-00000000000b', name: 'Locksmith',          icon: '🔑' },
  { id: 'a000000c-0000-4000-a000-00000000000c', name: 'Removalists',        icon: '🚚' },
  { id: 'a000000d-0000-4000-a000-00000000000d', name: 'Concreting',         icon: '🪨' },
  { id: 'a000000e-0000-4000-a000-00000000000e', name: 'Fencing',            icon: '🛡️' },
  { id: 'a000000f-0000-4000-a000-00000000000f', name: 'Handyman',           icon: '🔨' },
] as const;

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
type AUState = typeof AU_STATES[number];

const URGENCY_OPTIONS = [
  { value: 'emergency',    label: 'Emergency',      sub: 'Within hours' },
  { value: 'within_48h',  label: 'Within 48 hours', sub: 'Very soon' },
  { value: 'this_week',   label: 'This week',       sub: '2–7 days' },
  { value: 'this_month',  label: 'This month',      sub: '1–4 weeks' },
  { value: 'flexible',    label: 'Flexible',        sub: 'No rush' },
] as const;
type Urgency = typeof URGENCY_OPTIONS[number]['value'];

const PROPERTY_TYPES = [
  { value: 'house',      label: 'House' },
  { value: 'apartment',  label: 'Apartment' },
  { value: 'townhouse',  label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land',       label: 'Land' },
  { value: 'other',      label: 'Other' },
] as const;

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1
  category_id: string;
  // Step 2
  title: string;
  description: string;
  property_type: string;
  // Step 3
  suburb: string;
  postcode: string;
  state: AUState;
  // Step 4
  urgency: Urgency;
  time_window_notes: string;
  // Step 5
  budget_min: string;
  budget_max: string;
  budget_is_gst: boolean;
  exact_address: string;
  publish: boolean;
}

const INITIAL_DATA: WizardData = {
  category_id: '',
  title: '',
  description: '',
  property_type: '',
  suburb: '',
  postcode: '',
  state: 'NSW',
  urgency: 'flexible',
  time_window_notes: '',
  budget_min: '',
  budget_max: '',
  budget_is_gst: false,
  exact_address: '',
  publish: false,
};

const STEPS = ['Category', 'Details', 'Location', 'Urgency', 'Budget & Publish'];
const TOTAL_STEPS = STEPS.length;

// ── Shared components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <Text style={styles.fieldError}>{msg}</Text>;
}

// ── Step 1: Category ──────────────────────────────────────────────────────────

function Step1Category({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  const selectedCategory = FEATURED_CATEGORIES.find((category) => category.id === data.category_id);

  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>What type of job is it?</Text>
      <Text style={styles.stepSubtitle}>
        Pick a category to see a short explanation before you continue.
      </Text>
      <View style={styles.categoryGrid}>
        {FEATURED_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, data.category_id === cat.id && styles.categoryCardSelected]}
            onPress={() => onChange('category_id', cat.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                data.category_id === cat.id && styles.categoryNameSelected,
              ]}
              numberOfLines={2}
            >
              {cat.name}
            </Text>
            <Text style={styles.categoryShort} numberOfLines={3}>
              {cat.short}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedCategory ? (
        <View style={styles.categoryDetailCard}>
          <Text style={styles.categoryDetailEyebrow}>{selectedCategory.name}</Text>
          <Text style={styles.categoryDetailTitle}>What jobs fit here</Text>
          <Text style={styles.categoryDetailText}>{selectedCategory.detail}</Text>
        </View>
      ) : (
        <View style={styles.categoryHintCard}>
          <Text style={styles.categoryHintText}>
            Select a category to preview the type of work providers expect in that section.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── Step 2: Job Details ───────────────────────────────────────────────────────

function Step2Details({
  data,
  onChange,
  errors,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Describe your job</Text>

      <SectionLabel>Job title *</SectionLabel>
      <TextInput
        style={[styles.input, !!errors.title && styles.inputError]}
        value={data.title}
        onChangeText={(v) => onChange('title', v)}
        placeholder="e.g. Fix leaking kitchen tap"
        placeholderTextColor="#9CA3AF"
        maxLength={200}
        returnKeyType="next"
      />
      <FieldError msg={errors.title} />

      <SectionLabel>Description *</SectionLabel>
      <TextInput
        style={[styles.input, styles.textArea, !!errors.description && styles.inputError]}
        value={data.description}
        onChangeText={(v) => onChange('description', v)}
        placeholder="Describe what needs to be done, any relevant details…"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={5}
        maxLength={5000}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{data.description.length}/5000</Text>
      <FieldError msg={errors.description} />

      <SectionLabel>Property type</SectionLabel>
      <View style={styles.chipRow}>
        {PROPERTY_TYPES.map((pt) => (
          <TouchableOpacity
            key={pt.value}
            style={[styles.chip, data.property_type === pt.value && styles.chipSelected]}
            onPress={() => onChange('property_type', data.property_type === pt.value ? '' : pt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, data.property_type === pt.value && styles.chipTextSelected]}>
              {pt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Step 3: Location ──────────────────────────────────────────────────────────

function Step3Location({
  data,
  onChange,
  errors,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Where is the job?</Text>

      <SectionLabel>Suburb *</SectionLabel>
      <TextInput
        style={[styles.input, !!errors.suburb && styles.inputError]}
        value={data.suburb}
        onChangeText={(v) => onChange('suburb', v)}
        placeholder="e.g. Surry Hills"
        placeholderTextColor="#9CA3AF"
        maxLength={100}
        returnKeyType="next"
      />
      <FieldError msg={errors.suburb} />

      <SectionLabel>Postcode *</SectionLabel>
      <TextInput
        style={[styles.input, !!errors.postcode && styles.inputError]}
        value={data.postcode}
        onChangeText={(v) => onChange('postcode', v)}
        placeholder="e.g. 2010"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        maxLength={4}
        returnKeyType="next"
      />
      <FieldError msg={errors.postcode} />

      <SectionLabel>State *</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {AU_STATES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, data.state === s && styles.chipSelected]}
              onPress={() => onChange('state', s)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, data.state === s && styles.chipTextSelected]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

// ── Step 4: Urgency ───────────────────────────────────────────────────────────

function Step4Urgency({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>How urgent is this job?</Text>

      {URGENCY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.urgencyCard, data.urgency === opt.value && styles.urgencyCardSelected]}
          onPress={() => onChange('urgency', opt.value)}
          activeOpacity={0.8}
        >
          <View style={styles.urgencyRadio}>
            {data.urgency === opt.value && <View style={styles.urgencyRadioDot} />}
          </View>
          <View style={styles.urgencyLabel}>
            <Text style={[styles.urgencyName, data.urgency === opt.value && styles.urgencyNameSelected]}>
              {opt.label}
            </Text>
            <Text style={styles.urgencySub}>{opt.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <SectionLabel>Additional timing notes</SectionLabel>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={data.time_window_notes}
        onChangeText={(v) => onChange('time_window_notes', v)}
        placeholder="e.g. Weekdays only, mornings preferred…"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        maxLength={500}
        textAlignVertical="top"
      />
    </ScrollView>
  );
}

// ── Step 5: Budget & Publish ──────────────────────────────────────────────────

function Step5Budget({
  data,
  onChange,
  onToggle,
  errors,
}: {
  data: WizardData;
  onChange: (k: keyof WizardData, v: string) => void;
  onToggle: (k: 'budget_is_gst' | 'publish', v: boolean) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Budget & publishing</Text>

      <SectionLabel>Budget range (optional)</SectionLabel>
      <View style={styles.budgetRow}>
        <View style={styles.budgetField}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={[styles.input, styles.budgetInput, !!errors.budget_min && styles.inputError]}
            value={data.budget_min}
            onChangeText={(v) => onChange('budget_min', v.replace(/[^0-9]/g, ''))}
            placeholder="Min"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
        </View>
        <Text style={styles.budgetDash}>–</Text>
        <View style={styles.budgetField}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={[styles.input, styles.budgetInput, !!errors.budget_max && styles.inputError]}
            value={data.budget_max}
            onChangeText={(v) => onChange('budget_max', v.replace(/[^0-9]/g, ''))}
            placeholder="Max"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
        </View>
      </View>
      <FieldError msg={errors.budget_min || errors.budget_max} />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Budget includes GST</Text>
        <Switch
          value={data.budget_is_gst}
          onValueChange={(v) => onToggle('budget_is_gst', v)}
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={data.budget_is_gst ? '#2563EB' : '#FFFFFF'}
        />
      </View>

      <View style={styles.divider} />

      <SectionLabel>Exact address</SectionLabel>
      <Text style={styles.fieldHint}>
        Only revealed to the awarded provider. Required to publish immediately.
      </Text>
      <TextInput
        style={[styles.input, !!errors.exact_address && styles.inputError]}
        value={data.exact_address}
        onChangeText={(v) => onChange('exact_address', v)}
        placeholder="e.g. 42 Example St, Surry Hills"
        placeholderTextColor="#9CA3AF"
        maxLength={300}
      />
      <FieldError msg={errors.exact_address} />

      <View style={styles.divider} />

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelGroup}>
          <Text style={styles.toggleLabel}>Publish immediately</Text>
          <Text style={styles.fieldHint}>Providers can submit quotes right away.</Text>
        </View>
        <Switch
          value={data.publish}
          onValueChange={(v) => onToggle('publish', v)}
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={data.publish ? '#2563EB' : '#FFFFFF'}
        />
      </View>
      {data.publish && !data.exact_address && (
        <Text style={styles.publishWarning}>
          An exact address is required to publish immediately.
        </Text>
      )}
    </ScrollView>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step) / total) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        Step {step} of {total} — {STEPS[step - 1]}
      </Text>
    </View>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: WizardData): Partial<Record<keyof WizardData, string>> {
  const errs: Partial<Record<keyof WizardData, string>> = {};
  if (step === 1 && !data.category_id) {
    errs.category_id = 'Please select a category';
  }
  if (step === 2) {
    if (data.title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    if (data.description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
  }
  if (step === 3) {
    if (data.suburb.trim().length < 2) errs.suburb = 'Enter your suburb';
    if (!/^\d{4}$/.test(data.postcode)) errs.postcode = '4-digit Australian postcode required';
  }
  if (step === 5) {
    const min = data.budget_min ? parseInt(data.budget_min, 10) * 100 : 0;
    const max = data.budget_max ? parseInt(data.budget_max, 10) * 100 : 0;
    if (data.budget_min && isNaN(parseInt(data.budget_min, 10))) errs.budget_min = 'Invalid amount';
    if (data.budget_max && isNaN(parseInt(data.budget_max, 10))) errs.budget_max = 'Invalid amount';
    if (min && max && min > max) errs.budget_min = 'Min budget must be ≤ max budget';
    if (data.publish && !data.exact_address.trim()) {
      errs.exact_address = 'Exact address required to publish immediately';
    }
  }
  return errs;
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function PostJobWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(<K extends keyof WizardData>(key: K, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleToggle = useCallback(<K extends 'budget_is_gst' | 'publish'>(key: K, value: boolean) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleNext = useCallback(() => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [step, data]);

  const handleBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    const errs = validateStep(5, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        category_id: data.category_id,
        title: data.title.trim(),
        description: data.description.trim(),
        urgency: data.urgency,
        suburb: data.suburb.trim(),
        postcode: data.postcode.trim(),
        state: data.state,
        budget_is_gst: data.budget_is_gst,
        publish: data.publish,
      };

      if (data.property_type) payload.property_type = data.property_type;
      if (data.time_window_notes.trim()) payload.time_window_notes = data.time_window_notes.trim();
      if (data.exact_address.trim()) payload.exact_address = data.exact_address.trim();

      const budgetMin = data.budget_min ? parseInt(data.budget_min, 10) * 100 : undefined;
      const budgetMax = data.budget_max ? parseInt(data.budget_max, 10) * 100 : undefined;
      if (budgetMin) payload.budget_min = budgetMin;
      if (budgetMax) payload.budget_max = budgetMax;

      const result = await jobsAPI.createJob(payload as Parameters<typeof jobsAPI.createJob>[0]);

      await queryClient.invalidateQueries({ queryKey: ['myJobs'] });

      Alert.alert(
        data.publish ? 'Job Published!' : 'Job Saved as Draft',
        data.publish
          ? 'Your job is live and providers can submit quotes.'
          : 'Your job has been saved. You can publish it from the Jobs screen.',
        [
          {
            text: 'View Job',
            onPress: () => router.replace(`/(tabs)/(customer)/jobs/${result.job.id}`),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [data, queryClient, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressBar step={step} total={TOTAL_STEPS} />

      {/* Step content */}
      <View style={styles.content}>
        {step === 1 && <Step1Category data={data} onChange={handleChange} />}
        {step === 2 && <Step2Details data={data} onChange={handleChange} errors={errors} />}
        {step === 3 && <Step3Location data={data} onChange={handleChange} errors={errors} />}
        {step === 4 && <Step4Urgency data={data} onChange={handleChange} />}
        {step === 5 && (
          <Step5Budget data={data} onChange={handleChange} onToggle={handleToggle} errors={errors} />
        )}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navBar}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {step < TOTAL_STEPS ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {data.publish ? 'Publish Job' : 'Save Draft'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Progress
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Step container
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  categoryCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  categoryIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryNameSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  categoryShort: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  categoryHintCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  categoryHintText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  categoryDetailCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
  },
  categoryDetailEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  categoryDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  categoryDetailText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  // Form fields
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // Urgency
  urgencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  urgencyCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  urgencyRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  urgencyRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  urgencyLabel: {
    flex: 1,
  },
  urgencyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  urgencyNameSelected: {
    color: '#2563EB',
  },
  urgencySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Budget
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#374151',
    marginRight: 6,
    fontWeight: '600',
  },
  budgetInput: {
    flex: 1,
  },
  budgetDash: {
    fontSize: 18,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toggleLabelGroup: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  publishWarning: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },

  // Navigation bar
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#86EFAC',
  },
  submitBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
