'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { PublicNav } from '@/components/marketing/PublicNav';
import { profilesAPI } from '@/lib/api/profiles';
import type { CategoryProvider } from '@/types';

type Category = {
  slug: string;
  name: string;
  short: string;
  tooltip: string;
  seo: string;
  detail: string;
  accent: string;
  sampleNeeds: string[];
};

const CATEGORIES: Category[] = [
  {
    slug: 'plumbing',
    name: 'Plumbing',
    short: 'Leaks, hot water, blocked drains, bathroom upgrades, and urgent callouts.',
    tooltip: 'Pipes, drains, taps, toilets, leaks, and hot water work.',
    seo: 'Find trusted plumbers for leak repairs, blocked drains, hot water systems, bathroom plumbing, kitchen plumbing, and new plumbing installations.',
    detail:
      'Plumbing jobs range from urgent repairs to planned upgrades. Customers commonly post blocked drains, burst pipes, hot water replacements, tap repairs, toilet issues, and full bathroom or kitchen plumbing work.',
    accent: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    sampleNeeds: ['Burst pipe repair', 'Hot water replacement', 'Drain clearing'],
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    short: 'Lighting, switchboards, rewiring, fault finding, and appliance installs.',
    tooltip: 'Lighting, wiring, outlets, switchboards, and electrical repairs.',
    seo: 'Connect with licensed electricians for wiring, lighting installation, switchboard upgrades, power points, appliance setup, and electrical fault finding.',
    detail:
      'Electrical work covers repairs, upgrades, and installations for homes and businesses. Typical requests include lighting replacement, power points, switchboard upgrades, smoke alarms, rewiring, and fault diagnostics.',
    accent: 'from-amber-500/20 via-yellow-500/10 to-transparent',
    sampleNeeds: ['Switchboard upgrade', 'LED lighting install', 'Power fault diagnosis'],
  },
  {
    slug: 'carpentry',
    name: 'Carpentry',
    short: 'Decking, framing, doors, shelving, cabinetry, and timber repairs.',
    tooltip: 'Decking, framing, doors, cabinetry, and timber jobs.',
    seo: 'Hire skilled carpenters for decking, framing, doors, custom shelving, cabinetry, timber repairs, and general woodwork projects.',
    detail:
      'Carpentry spans structural and finish work. Customers regularly need help with framing, decking, pergolas, skirting, cabinetry, shelving, doors, and general timber repair or fabrication.',
    accent: 'from-orange-500/20 via-amber-500/10 to-transparent',
    sampleNeeds: ['Custom shelving', 'Deck restoration', 'Door replacement'],
  },
  {
    slug: 'painting',
    name: 'Painting',
    short: 'Interior refreshes, exterior repainting, prep work, coatings, and touch-ups.',
    tooltip: 'Interior, exterior, prep, coatings, and repainting.',
    seo: 'Compare painters for interior painting, exterior painting, surface preparation, protective coatings, feature walls, and residential repainting jobs.',
    detail:
      'Painting improves presentation and protection. Common jobs include interior walls, ceilings, trims, exteriors, fences, weatherproof coatings, end-of-lease refreshes, and feature wall work.',
    accent: 'from-rose-500/20 via-pink-500/10 to-transparent',
    sampleNeeds: ['Full interior repaint', 'Fence repaint', 'Exterior touch-up'],
  },
  {
    slug: 'landscaping',
    name: 'Landscaping',
    short: 'Garden redesign, paving, turf, irrigation, retaining walls, and clean-ups.',
    tooltip: 'Gardens, paving, turf, planting, and outdoor improvements.',
    seo: 'Book landscaping professionals for garden makeovers, paving, turf laying, retaining walls, irrigation systems, and outdoor living upgrades.',
    detail:
      'Landscaping combines visual upgrades and practical outdoor works. Customers often post paving, turf laying, planting, irrigation, retaining walls, garden clean-ups, and complete outdoor makeovers.',
    accent: 'from-emerald-500/20 via-lime-500/10 to-transparent',
    sampleNeeds: ['Turf installation', 'Retaining wall', 'Garden makeover'],
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    short: 'Leaks, restoration, guttering, flashing, storm repairs, and replacements.',
    tooltip: 'Roof repairs, replacement, gutters, and leak checks.',
    seo: 'Get roofing experts for roof repairs, roof restoration, gutter replacement, flashing work, storm damage, and roof leak detection.',
    detail:
      'Roofing services cover maintenance, repairs, and replacement. Typical jobs include storm damage, roof leaks, flashing, gutters, restoration, tile replacement, and inspection work.',
    accent: 'from-slate-500/20 via-zinc-500/10 to-transparent',
    sampleNeeds: ['Roof leak repair', 'Gutter replacement', 'Storm damage inspection'],
  },
  {
    slug: 'tiling',
    name: 'Tiling',
    short: 'Bathrooms, floors, splashbacks, waterproofing, grout, and tile repairs.',
    tooltip: 'Wall and floor tiling, grout, and waterproofing.',
    seo: 'Find tilers for bathroom tiling, kitchen splashbacks, floor tiling, grout replacement, waterproofing, and tile repair services.',
    detail:
      'Tiling combines finish quality with waterproofing performance. Customers post bathroom tiling, kitchen splashbacks, floor tiling, grout renewal, tile repairs, and renovation finishing work.',
    accent: 'from-indigo-500/20 via-blue-500/10 to-transparent',
    sampleNeeds: ['Bathroom wall tiling', 'Kitchen splashback', 'Grout refresh'],
  },
  {
    slug: 'demolition',
    name: 'Demolition',
    short: 'Strip-outs, shed removal, wall removal, flooring removal, and site clearing.',
    tooltip: 'Removal, strip-outs, site clearing, and prep for renovation.',
    seo: 'Hire demolition contractors for bathroom strip-outs, kitchen removal, wall removal, flooring demolition, shed demolition, and site clearing.',
    detail:
      'Demolition is used to safely clear space before rebuild or renovation. Customers commonly request bathroom strip-outs, kitchen removals, shed demolition, wall removal, flooring removal, and disposal.',
    accent: 'from-stone-500/20 via-neutral-500/10 to-transparent',
    sampleNeeds: ['Bathroom strip-out', 'Shed removal', 'Flooring removal'],
  },
];

const HERO_STATS = [
  { label: 'Featured trades', value: '8' },
  { label: 'Demo contractors', value: '40' },
  { label: 'Seeded reviews', value: '80' },
];

const PROCESS_STEPS = [
  {
    title: 'Brief your job once',
    copy: 'Share scope, urgency, budget, and photos in one clean intake flow instead of repeating yourself across listings and messages.',
  },
  {
    title: 'Review matched tradies',
    copy: 'TradeConnect keeps category fit, recent customer proof, availability, and profile context together so the shortlist is obvious faster.',
  },
  {
    title: 'Compare quotes with context',
    copy: 'Pricing means more when you can read the review history, jobs completed, and trade alignment beside the quote workflow.',
  },
  {
    title: 'Move from award to completed job',
    copy: 'Use one platform for messaging, awarding work, and post-job reviews instead of stitching together separate tools and inboxes.',
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRating(value: number | string | null): string {
  if (value == null) return 'No rating';
  const normalized = typeof value === 'number' ? value : Number(value);
  return `${normalized.toFixed(1)}/10`;
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [providers, setProviders] = useState<CategoryProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadProviders() {
      setIsLoadingProviders(true);
      setProvidersError(null);

      try {
        const response = await profilesAPI.listProvidersByCategory(selectedCategory.slug);
        if (!isCancelled) {
          setProviders(
            response.providers.map((provider) => ({
              ...provider,
              avg_rating:
                provider.avg_rating == null
                  ? null
                  : typeof provider.avg_rating === 'number'
                    ? provider.avg_rating
                    : Number(provider.avg_rating),
              recent_reviews: provider.recent_reviews.map((review) => ({
                ...review,
                rating: typeof review.rating === 'number' ? review.rating : Number(review.rating),
              })),
            }))
          );
        }
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : 'Unable to load providers right now.';
          setProviders([]);
          setProvidersError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProviders(false);
        }
      }
    }

    loadProviders();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory.slug]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7fb_48%,_#f4f7fb_100%)]" />
        <div className="absolute left-[-8rem] top-24 -z-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <PublicNav />

        <section className="container pt-16 pb-10 md:pt-24">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Modern job posting, quote comparison, and contractor discovery in one workflow
              </div>

              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight text-slate-950 md:text-7xl">
                Post a job. Compare trusted tradies. Hire with confidence.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                TradeConnect gives customers and contractors a cleaner marketplace experience. Start with the trade,
                inspect real provider history, compare quotes with context, and move from request to completed work in
                one product.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="rounded-full bg-slate-900 px-7 py-4 text-base hover:bg-slate-800"
                  >
                    Post a Job
                  </Button>
                </Link>
                <Link href="#categories">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full border-slate-300 px-7 py-4 text-base text-slate-800 hover:bg-white"
                  >
                    Browse Contractors
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm">Real category-based discovery</span>
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm">Verified customer reviews</span>
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm">Customer and provider flows</span>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur">
                    <div className="text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</div>
                    <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-10 top-8 -z-10 h-64 rounded-[2rem] bg-gradient-to-br from-sky-400/20 via-cyan-300/10 to-white blur-3xl" />
              <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-[0_40px_90px_-45px_rgba(15,23,42,0.6)]">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Live marketplace view</div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">Contractor discovery</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      Updated from category selection
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-6 py-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {CATEGORIES.slice(0, 3).map((category) => (
                      <div key={category.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm text-slate-300">{category.name}</div>
                        <div className="mt-1 text-lg font-semibold">{category.sampleNeeds[0]}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Recommended provider</div>
                        <div className="mt-2 text-2xl font-semibold">Northside Plumbing Co.</div>
                        <div className="mt-1 text-sm text-slate-300">Plumbing, hot water, maintenance</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right text-slate-950">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Rating</div>
                        <div className="text-2xl font-semibold">9.2</div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <div className="text-sm font-medium">Recent customer feedback</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Quick diagnosis, clear quote, and the hot water replacement was done the same day.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <div className="text-sm font-medium">Current trade signals</div>
                        <ul className="mt-2 space-y-2 text-sm text-slate-300">
                          <li>41 jobs completed</li>
                          <li>12 reviews in the last cycle</li>
                          <li>Available for urgent work</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Post jobs</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Compare quotes</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Review providers</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Message directly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="container pb-8">
          <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur md:grid-cols-2 xl:grid-cols-4">
            {PROCESS_STEPS.map((step, index) => (
              <div key={step.title} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-6">
                <div className="text-xs uppercase tracking-[0.28em] text-slate-400">0{index + 1}</div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section id="categories" className="container py-16 md:py-20">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Categories</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Browse contractors the way customers actually think.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Start with the trade, then immediately inspect provider availability, recent reviews, and category-fit.
            </p>
          </div>
          <Link href="/register">
            <Button className="rounded-full bg-slate-900 px-6 hover:bg-slate-800">Create a customer account</Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((category) => {
            const isSelected = category.slug === selectedCategory.slug;

            return (
              <button
                key={category.slug}
                type="button"
                title={category.tooltip}
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(category)}
                className={`group relative overflow-hidden rounded-[1.75rem] border p-6 text-left transition duration-300 ${
                  isSelected
                    ? 'border-slate-900 bg-slate-950 text-white shadow-[0_30px_70px_-45px_rgba(15,23,42,0.85)]'
                    : 'border-white/80 bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)] hover:-translate-y-0.5 hover:border-sky-200'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.accent} ${isSelected ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100'}`} />
                <div className="relative">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-sky-100' : 'text-slate-900'}`}>{category.name}</div>
                  <p className={`mt-3 text-sm leading-7 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                    {category.short}
                  </p>
                  <div className={`mt-5 flex flex-wrap gap-2 text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                    {category.sampleNeeds.map((need) => (
                      <span
                        key={need}
                        className={`rounded-full px-3 py-1.5 ${
                          isSelected ? 'border border-white/15 bg-white/10' : 'bg-slate-100'
                        }`}
                      >
                        {need}
                      </span>
                    ))}
                  </div>
                  <p className="sr-only">{category.seo}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="providers" className="container pb-20">
        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)]">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">{selectedCategory.name}</div>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Available contractors</h3>
            <p className="mt-4 text-base leading-8 text-slate-600">{selectedCategory.detail}</p>

            <div className="mt-8 rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">What customers ask for</div>
              <div className="mt-4 space-y-3">
                {selectedCategory.sampleNeeds.map((need) => (
                  <div key={need} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {need}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm text-slate-500">Contractor count</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{providers.length}</div>
                <div className="mt-1 text-sm text-slate-500">visible for this category right now</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm text-slate-500">Customer proof</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {providers.reduce((count, provider) => count + provider.recent_reviews.length, 0)}
                </div>
                <div className="mt-1 text-sm text-slate-500">recent reviews shown below</div>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button className="w-full rounded-full bg-slate-900 py-3 hover:bg-slate-800">
                  Post {selectedCategory.name} Work
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.45)] md:p-8">
            {isLoadingProviders ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
                Loading {selectedCategory.name.toLowerCase()} contractors...
              </div>
            ) : null}

            {!isLoadingProviders && providersError ? (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-8 text-rose-700">
                {providersError}
              </div>
            ) : null}

            {!isLoadingProviders && !providersError && providers.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
                No contractors are listed for this category yet.
              </div>
            ) : null}

            {!isLoadingProviders && !providersError && providers.length > 0 ? (
              <div className="grid gap-5">
                {providers.map((provider) => (
                  <article
                    key={provider.user_id}
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)]"
                  >
                    <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                              provider.available
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {provider.available ? 'Available now' : 'Currently busy'}
                          </span>
                          {provider.years_experience != null ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                              {provider.years_experience}+ years experience
                            </span>
                          ) : null}
                        </div>

                        <h4 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                          {provider.business_name || provider.display_name || provider.full_name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {provider.display_name || provider.full_name}
                        </p>

                        {provider.bio ? (
                          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{provider.bio}</p>
                        ) : null}

                        <div className="mt-5 flex flex-wrap gap-2">
                          {provider.categories.map((label) => (
                            <span key={label} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="min-w-[13rem] rounded-[1.5rem] border border-slate-200 bg-white p-5 text-right shadow-sm">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Average rating</div>
                        <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                          {formatRating(provider.avg_rating)}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {provider.total_reviews} reviews · {provider.jobs_completed} jobs completed
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 bg-white/60 px-6 py-5">
                      <div className="flex items-center justify-between gap-4">
                        <h5 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                          User submitted reviews
                        </h5>
                        <span className="text-xs text-slate-400">
                          {provider.recent_reviews.length} recent {provider.recent_reviews.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      {provider.recent_reviews.length === 0 ? (
                        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          No reviews submitted yet.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {provider.recent_reviews.map((review) => (
                            <div key={review.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="font-medium text-slate-950">{review.reviewer_name}</div>
                                <div className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                                  {review.rating}/10
                                </div>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-slate-600">
                                {review.body || 'No written review provided.'}
                              </p>
                              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                                {formatDate(review.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="overflow-hidden rounded-[2.25rem] bg-slate-950 text-white shadow-[0_35px_90px_-50px_rgba(15,23,42,0.85)]">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-white/10 px-8 py-10 lg:border-b-0 lg:border-r">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">For customers</div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Need quotes this week?</h3>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
                Post once, browse contractors by trade, and compare reviews before you commit. TradeConnect is built to
                reduce friction at the start of the job.
              </p>
              <div className="mt-7">
                <Link href="/register">
                  <Button className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
                    Post a Job
                  </Button>
                </Link>
              </div>
            </div>

            <div className="px-8 py-10">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">For providers</div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Ready to win more local work?</h3>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
                Join the provider side of the marketplace, receive trade-relevant opportunities, quote directly, and
                build proof through customer reviews.
              </p>
              <div className="mt-7">
                <Link href="/register">
                  <Button className="rounded-full bg-sky-500 px-6 hover:bg-sky-400">
                    Join as a Provider
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
