import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesAPI } from '../../../src/api/profiles.api';
import { useSessionStore } from '../../../src/stores/sessionStore';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, role, setUser } = useSessionStore();

  // ── Form state ──────────────────────────────────────────────────────────────

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');

  // Customer fields
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState<string>('NSW');

  // Provider fields
  const [bio, setBio] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [abn, setAbn] = useState('');
  const [available, setAvailable] = useState(true);

  // ── Load current profile ────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => profilesAPI.getMyProfile(),
  });

  useEffect(() => {
    if (!data) return;
    setFullName(data.user.full_name ?? '');
    setDisplayName(data.user.display_name ?? '');

    if (data.customer_profile) {
      setSuburb(data.customer_profile.suburb ?? '');
      setPostcode(data.customer_profile.postcode ?? '');
      setState(data.customer_profile.state ?? 'NSW');
    }

    if (data.provider_profile) {
      setBio(data.provider_profile.bio ?? '');
      setBusinessName(data.provider_profile.business_name ?? '');
      setYearsExp(data.provider_profile.years_experience != null
        ? String(data.provider_profile.years_experience)
        : '');
      setRadiusKm(String(data.provider_profile.service_radius_km ?? 50));
      setAbn(data.provider_profile.abn ?? '');
      setAvailable(data.provider_profile.available);
    }
  }, [data]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const updateUser = useMutation({
    mutationFn: profilesAPI.updateUser,
    onSuccess: (res) => setUser(res.user),
  });

  const updateCustomer = useMutation({
    mutationFn: profilesAPI.updateCustomerProfile,
  });

  const updateProvider = useMutation({
    mutationFn: profilesAPI.updateProviderProfile,
  });

  const toggleAvail = useMutation({
    mutationFn: (val: boolean) => profilesAPI.toggleAvailability(val),
  });

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      const promises: Promise<unknown>[] = [];

      // User fields
      const userPayload: Parameters<typeof profilesAPI.updateUser>[0] = {};
      if (fullName.trim() !== user?.full_name) userPayload.full_name = fullName.trim();
      if ((displayName.trim() || null) !== user?.display_name) userPayload.display_name = displayName.trim() || undefined;
      if (Object.keys(userPayload).length > 0) {
        promises.push(updateUser.mutateAsync(userPayload));
      }

      // Role-specific
      if (role === 'customer') {
        const cp: Parameters<typeof profilesAPI.updateCustomerProfile>[0] = {};
        if (suburb.trim()) cp.suburb = suburb.trim();
        if (/^\d{4}$/.test(postcode)) cp.postcode = postcode;
        if (state) cp.state = state;
        if (Object.keys(cp).length > 0) promises.push(updateCustomer.mutateAsync(cp));
      }

      if (role === 'provider') {
        const pp: Parameters<typeof profilesAPI.updateProviderProfile>[0] = {};
        if (bio.trim()) pp.bio = bio.trim();
        if (businessName.trim()) pp.business_name = businessName.trim();
        const exp = parseInt(yearsExp, 10);
        if (!isNaN(exp) && exp >= 0) pp.years_experience = exp;
        const radius = parseInt(radiusKm, 10);
        if (!isNaN(radius) && radius >= 5) pp.service_radius_km = radius;
        if (/^\d{11}$/.test(abn.replace(/\s/g, ''))) pp.abn = abn.replace(/\s/g, '');
        if (Object.keys(pp).length > 0) promises.push(updateProvider.mutateAsync(pp));

        if (available !== data?.provider_profile?.available) {
          promises.push(toggleAvail.mutateAsync(available));
        }
      }

      await Promise.all(promises);

      await queryClient.invalidateQueries({ queryKey: ['myProfile'] });

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      Alert.alert('Error', msg);
    }
  };

  const isSaving =
    updateUser.isPending || updateCustomer.isPending || updateProvider.isPending || toggleAvail.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account details */}
        <Section title="Account Details">
          <FieldLabel>Full name</FieldLabel>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
          />

          <FieldLabel>Display name</FieldLabel>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Optional public name"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
          />
        </Section>

        {/* Customer location */}
        {role === 'customer' && (
          <Section title="Your Location">
            <FieldLabel>Suburb</FieldLabel>
            <TextInput
              style={styles.input}
              value={suburb}
              onChangeText={setSuburb}
              placeholder="e.g. Surry Hills"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            <FieldLabel>Postcode</FieldLabel>
            <TextInput
              style={styles.input}
              value={postcode}
              onChangeText={setPostcode}
              placeholder="e.g. 2010"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
            />

            <FieldLabel>State</FieldLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {AU_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, state === s && styles.chipSelected]}
                    onPress={() => setState(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, state === s && styles.chipTextSelected]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Section>
        )}

        {/* Provider business details */}
        {role === 'provider' && (
          <>
            <Section title="Business Details">
              <FieldLabel>Business name</FieldLabel>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your business name"
                placeholderTextColor="#9CA3AF"
                maxLength={200}
              />

              <FieldLabel>ABN (11 digits, no spaces)</FieldLabel>
              <TextInput
                style={styles.input}
                value={abn}
                onChangeText={setAbn}
                placeholder="e.g. 12345678901"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={11}
              />

              <FieldLabel>Years of experience</FieldLabel>
              <TextInput
                style={styles.input}
                value={yearsExp}
                onChangeText={setYearsExp}
                placeholder="e.g. 10"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={2}
              />

              <FieldLabel>Service radius (km)</FieldLabel>
              <TextInput
                style={styles.input}
                value={radiusKm}
                onChangeText={setRadiusKm}
                placeholder="e.g. 50"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
              />
            </Section>

            <Section title="About You">
              <FieldLabel>Bio</FieldLabel>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell customers about yourself and your work…"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/2000</Text>
            </Section>

            <Section title="Availability">
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>
                    {available ? 'Available for jobs' : 'Not taking new jobs'}
                  </Text>
                  <Text style={styles.toggleHint}>
                    Toggle this to control whether providers see your profile in search.
                  </Text>
                </View>
                <Switch
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={available ? '#2563EB' : '#FFFFFF'}
                />
              </View>
            </Section>
          </>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F9FAFB',
  },
  chipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#2563EB', fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  toggleHint: { fontSize: 12, color: '#6B7280', maxWidth: 240 },

  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnDisabled: { backgroundColor: '#93C5FD' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { fontSize: 15, color: '#6B7280' },
});
