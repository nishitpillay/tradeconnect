/**
 * Job Schema Unit Tests
 *
 * Validates the Zod schemas used for job creation and quote submission.
 * No DB/Redis required — pure validation logic.
 */

import { CreateJobSchema, SubmitQuoteSchema } from '../job.schema';

// ── CreateJobSchema ───────────────────────────────────────────────────────────

describe('CreateJobSchema', () => {
  const validJob = {
    category_id: '00000000-0000-4000-a000-000000000001',
    title: 'Fix leaking kitchen tap',
    description: 'The kitchen tap has been dripping for two weeks. Need a licensed plumber.',
    urgency: 'this_week',
    suburb: 'Surry Hills',
    postcode: '2010',
    state: 'NSW',
    budget_is_gst: false,
    publish: false,
  };

  it('accepts a valid minimal job', () => {
    expect(() => CreateJobSchema.parse(validJob)).not.toThrow();
  });

  it('rejects a title shorter than 5 characters', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, title: 'Fix' })).toThrow();
  });

  it('rejects a description shorter than 20 characters', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, description: 'Too short' })).toThrow();
  });

  it('rejects an invalid postcode (3 digits)', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, postcode: '201' })).toThrow();
  });

  it('rejects an invalid postcode (letters)', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, postcode: 'ABCD' })).toThrow();
  });

  it('rejects an invalid state', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, state: 'XYZ' })).toThrow();
  });

  it('rejects when budget_min > budget_max', () => {
    expect(() =>
      CreateJobSchema.parse({
        ...validJob,
        budget_min: 50_000,
        budget_max: 10_000,
      })
    ).toThrow();
  });

  it('accepts when budget_min <= budget_max', () => {
    expect(() =>
      CreateJobSchema.parse({
        ...validJob,
        budget_min: 10_000,
        budget_max: 50_000,
      })
    ).not.toThrow();
  });

  it('rejects publish=true without exact_address', () => {
    expect(() =>
      CreateJobSchema.parse({ ...validJob, publish: true })
    ).toThrow();
  });

  it('accepts publish=true with exact_address', () => {
    expect(() =>
      CreateJobSchema.parse({
        ...validJob,
        publish: true,
        exact_address: '42 Example St, Surry Hills NSW 2010',
      })
    ).not.toThrow();
  });

  it('accepts all valid AU states', () => {
    const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
    for (const state of states) {
      expect(() => CreateJobSchema.parse({ ...validJob, state })).not.toThrow();
    }
  });

  it('accepts all valid urgency values', () => {
    const urgencies = ['emergency', 'within_48h', 'this_week', 'this_month', 'flexible'];
    for (const urgency of urgencies) {
      expect(() => CreateJobSchema.parse({ ...validJob, urgency })).not.toThrow();
    }
  });

  it('rejects an invalid urgency value', () => {
    expect(() => CreateJobSchema.parse({ ...validJob, urgency: 'yesterday' })).toThrow();
  });

  it('defaults publish to false if omitted', () => {
    const { publish: _, ...withoutPublish } = validJob;
    const result = CreateJobSchema.parse(withoutPublish);
    expect(result.publish).toBe(false);
  });
});

// ── SubmitQuoteSchema ─────────────────────────────────────────────────────────

describe('SubmitQuoteSchema', () => {
  const validFixed = {
    quote_type: 'fixed',
    price_fixed: 50000, // $500 in cents
    is_gst_included: false,
    scope_notes: 'Will replace the tap washer and reseal the joint.',
  };

  it('accepts a valid fixed-price quote', () => {
    expect(() => SubmitQuoteSchema.parse(validFixed)).not.toThrow();
  });

  it('accepts an estimate range quote with min and max', () => {
    expect(() =>
      SubmitQuoteSchema.parse({
        quote_type: 'estimate_range',
        price_min: 30000,
        price_max: 80000,
        is_gst_included: false,
        scope_notes: 'Depends on the extent of the damage found.',
      })
    ).not.toThrow();
  });

  it('accepts a call_for_quote type', () => {
    expect(() =>
      SubmitQuoteSchema.parse({
        quote_type: 'call_for_quote',
        is_gst_included: false,
      })
    ).not.toThrow();
  });

  it('rejects an invalid quote_type', () => {
    expect(() =>
      SubmitQuoteSchema.parse({ ...validFixed, quote_type: 'daily_rate' })
    ).toThrow();
  });

  it('rejects a fixed quote with a negative price', () => {
    expect(() =>
      SubmitQuoteSchema.parse({ ...validFixed, price_fixed: -100 })
    ).toThrow();
  });

  it('rejects a timeline_days of 0', () => {
    expect(() =>
      SubmitQuoteSchema.parse({ ...validFixed, timeline_days: 0 })
    ).toThrow();
  });

  it('accepts a valid timeline_days', () => {
    expect(() =>
      SubmitQuoteSchema.parse({ ...validFixed, timeline_days: 3 })
    ).not.toThrow();
  });
});
