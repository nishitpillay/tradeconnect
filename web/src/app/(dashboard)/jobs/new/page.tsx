'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { jobsAPI } from '@/lib/api/jobs';

const CATEGORIES = [
  { id: 'a0000001-0000-4000-a000-000000000001', name: 'Plumbing' },
  { id: 'a0000002-0000-4000-a000-000000000002', name: 'Electrical' },
  { id: 'a0000003-0000-4000-a000-000000000003', name: 'Carpentry & Joinery' },
  { id: 'a0000004-0000-4000-a000-000000000004', name: 'Painting & Decorating' },
  { id: 'a0000005-0000-4000-a000-000000000005', name: 'Landscaping & Gardening' },
  { id: 'a0000006-0000-4000-a000-000000000006', name: 'Cleaning' },
  { id: 'a0000007-0000-4000-a000-000000000007', name: 'HVAC & Cooling' },
  { id: 'a0000008-0000-4000-a000-000000000008', name: 'Tiling' },
  { id: 'a0000009-0000-4000-a000-000000000009', name: 'Roofing' },
  { id: 'a000000a-0000-4000-a000-00000000000a', name: 'Pest Control' },
  { id: 'a000000b-0000-4000-a000-00000000000b', name: 'Locksmith' },
  { id: 'a000000c-0000-4000-a000-00000000000c', name: 'Removals & Moving' },
  { id: 'a000000d-0000-4000-a000-00000000000d', name: 'Concreting' },
  { id: 'a000000e-0000-4000-a000-00000000000e', name: 'Fencing' },
  { id: 'a000000f-0000-4000-a000-00000000000f', name: 'Handyman' },
];

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const URGENCY_OPTIONS = [
  { value: 'emergency',  label: 'Emergency (ASAP)' },
  { value: 'within_48h', label: 'Within 48 hours' },
  { value: 'this_week',  label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'flexible',   label: 'Flexible' },
];

export default function NewJobPage() {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('flexible');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState('');
  const [exactAddress, setExactAddress] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState('');
  const [publish, setPublish] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!categoryId) errs.category_id = 'Please select a category';
    if (!title || title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    if (!description || description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    if (!suburb.trim()) errs.suburb = 'Suburb is required';
    if (!/^\d{4}$/.test(postcode)) errs.postcode = 'Enter a valid 4-digit postcode';
    if (!state) errs.state = 'State is required';
    if (publish && !exactAddress.trim()) errs.exact_address = 'Exact address is required when publishing';
    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      errs.budget_min = 'Min budget cannot exceed max budget';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const publishNow = shouldPublish;
    setPublish(publishNow);

    const errs = validate();
    if (publishNow && !exactAddress.trim()) {
      errs.exact_address = 'Exact address is required when publishing';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        urgency,
        suburb: suburb.trim(),
        postcode: postcode.trim(),
        state,
        publish: publishNow,
      };

      if (exactAddress.trim()) payload.exact_address = exactAddress.trim();
      if (budgetMin) payload.budget_min = Math.round(Number(budgetMin) * 100);
      if (budgetMax) payload.budget_max = Math.round(Number(budgetMax) * 100);
      if (preferredStartDate) payload.preferred_start_date = preferredStartDate;

      await jobsAPI.createJob(payload as any);
      router.push(publishNow ? '/jobs' : '/dashboard');
    } catch (err: any) {
      setApiError(err.message || 'Failed to create job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
        <p className="mt-2 text-gray-600">
          Describe what you need done and get quotes from local tradies.
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {apiError}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
            )}
          </div>

          {/* Title */}
          <Input
            type="text"
            label="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g. Fix leaking kitchen tap"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Describe the job in detail — what needs to be done, any specific requirements..."
            />
            <p className="mt-1 text-xs text-gray-500">{description.length}/5000 characters (min 20)</p>
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              label="Suburb"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              error={errors.suburb}
              placeholder="e.g. Bondi"
              required
            />
            <Input
              type="text"
              label="Postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              error={errors.postcode}
              placeholder="e.g. 2026"
              maxLength={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select state...</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state}</p>
            )}
          </div>

          {/* Exact Address */}
          <Input
            type="text"
            label="Exact Address (required to publish)"
            value={exactAddress}
            onChange={(e) => setExactAddress(e.target.value)}
            error={errors.exact_address}
            placeholder="e.g. 123 Beach Road, Bondi NSW 2026"
            helperText="Only shared with the tradie you award the job to."
          />

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (AUD)</label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Min ($)"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                error={errors.budget_min}
                placeholder="e.g. 200"
                min="1"
              />
              <Input
                type="number"
                label="Max ($)"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="e.g. 500"
                min="1"
              />
            </div>
          </div>

          {/* Preferred Start Date */}
          <Input
            type="date"
            label="Preferred Start Date (optional)"
            value={preferredStartDate}
            onChange={(e) => setPreferredStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              isLoading={isLoading}
              className="flex-1"
            >
              Publish Job
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
