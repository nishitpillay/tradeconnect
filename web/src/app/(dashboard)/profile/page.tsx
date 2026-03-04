'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesAPI } from '@/lib/api/profiles';
import { useAuthStore } from '@/lib/store/authStore';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser, setUser } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: profilesAPI.getMe,
  });

  // ── Form state ──────────────────────────────────────────────────────────────

  const [fullName, setFullName]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [suburb, setSuburb]           = useState('');
  const [postcode, setPostcode]       = useState('');
  const [state, setState]             = useState('NSW');
  const [bio, setBio]                 = useState('');
  const [businessName, setBusinessName] = useState('');
  const [yearsExp, setYearsExp]       = useState('');
  const [radiusKm, setRadiusKm]       = useState('50');
  const [abn, setAbn]                 = useState('');
  const [available, setAvailable]     = useState(true);

  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

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

  const updateUser = useMutation({ mutationFn: profilesAPI.updateUser });
  const updateCustomer = useMutation({ mutationFn: profilesAPI.updateCustomerProfile });
  const updateProvider = useMutation({ mutationFn: profilesAPI.updateProviderProfile });
  const toggleAvail = useMutation({
    mutationFn: (val: boolean) => profilesAPI.toggleAvailability(val),
  });

  const isSaving =
    updateUser.isPending || updateCustomer.isPending ||
    updateProvider.isPending || toggleAvail.isPending;

  const role = authUser?.role;

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError('');

    try {
      const promises: Promise<unknown>[] = [];

      const userPayload: Parameters<typeof profilesAPI.updateUser>[0] = {};
      if (fullName.trim() !== data?.user.full_name) userPayload.full_name = fullName.trim();
      if ((displayName.trim() || null) !== data?.user.display_name) {
        userPayload.display_name = displayName.trim() || undefined;
      }
      if (Object.keys(userPayload).length > 0) {
        promises.push(
          updateUser.mutateAsync(userPayload).then((res) => setUser(res.user))
        );
      }

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
        const cleanAbn = abn.replace(/\s/g, '');
        if (/^\d{11}$/.test(cleanAbn)) pp.abn = cleanAbn;
        if (Object.keys(pp).length > 0) promises.push(updateProvider.mutateAsync(pp));

        if (available !== data?.provider_profile?.available) {
          promises.push(toggleAvail.mutateAsync(available));
        }
      }

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Update your account and profile information.</p>
      </div>

      <form onSubmit={handleSave}>
        {/* Account */}
        <Section title="Account Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name">
              <input
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                maxLength={100}
              />
            </Field>
            <Field label="Display name">
              <input
                className={inputCls}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional public name"
                maxLength={50}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              className={`${inputCls} bg-gray-50 cursor-not-allowed`}
              value={data?.user.email ?? ''}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
          </Field>
        </Section>

        {/* Customer location */}
        {role === 'customer' && (
          <Section title="Your Location">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Suburb">
                <input
                  className={inputCls}
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Surry Hills"
                  maxLength={100}
                />
              </Field>
              <Field label="Postcode">
                <input
                  className={inputCls}
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 2010"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <Field label="State">
              <div className="flex flex-wrap gap-2">
                {AU_STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setState(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      state === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* Provider details */}
        {role === 'provider' && (
          <>
            <Section title="Business Details">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business name">
                  <input
                    className={inputCls}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your business name"
                    maxLength={200}
                  />
                </Field>
                <Field label="ABN (11 digits)">
                  <input
                    className={inputCls}
                    value={abn}
                    onChange={(e) => setAbn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="12345678901"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Years of experience">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={50}
                    value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </Field>
                <Field label="Service radius (km)">
                  <input
                    className={inputCls}
                    type="number"
                    min={5}
                    max={500}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </Field>
              </div>
            </Section>

            <Section title="About You">
              <Field label="Bio">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell customers about yourself and your expertise…"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/2000</p>
              </Field>
            </Section>

            <Section title="Availability">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {available ? 'Available for new jobs' : 'Not taking new jobs'}
                  </span>
                  <p className="text-xs text-gray-500">
                    Toggle this to control your visibility in provider search.
                  </p>
                </div>
              </label>
            </Section>
          </>
        )}

        {/* Status messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Profile saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
