'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { profilesAPI } from '@/lib/api/profiles';
import type { CategoryProvider } from '@/types';

type Category = {
  slug: string;
  name: string;
  short: string;
  tooltip: string;
  seo: string;
  detail: string;
};

const CATEGORIES: Category[] = [
  {
    slug: 'plumbing',
    name: 'Plumbing',
    short: 'Fix leaks, blocked drains, hot water systems, taps, toilets, and full plumbing installs.',
    tooltip: 'Pipes, drains, taps, toilets, leaks, and hot water work.',
    seo: 'Find trusted plumbers for leak repairs, blocked drains, hot water systems, bathroom plumbing, kitchen plumbing, and new plumbing installations.',
    detail:
      'Plumbing jobs cover everything from urgent leaks to planned installations. Customers can post work for blocked drains, burst pipes, hot water systems, toilet repairs, tap replacements, kitchen plumbing, and bathroom upgrades. This category suits both emergency callouts and larger renovation projects.',
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    short: 'Get help with lighting, wiring, switchboards, power points, appliances, and fault repairs.',
    tooltip: 'Lighting, wiring, outlets, switchboards, and electrical repairs.',
    seo: 'Connect with licensed electricians for wiring, lighting installation, switchboard upgrades, power points, appliance setup, and electrical fault finding.',
    detail:
      'Electrical services include repairs, upgrades, and new installations around the home or business. Common jobs include lighting replacement, switchboard upgrades, power point installation, appliance connection, rewiring, smoke alarm work, and diagnosing electrical faults. This category is ideal when licensed electrical work is required.',
  },
  {
    slug: 'carpentry',
    name: 'Carpentry',
    short: 'Book carpenters for framing, decking, doors, cabinets, shelving, and timber repairs.',
    tooltip: 'Decking, framing, doors, cabinetry, and timber jobs.',
    seo: 'Hire skilled carpenters for decking, framing, doors, custom shelving, cabinetry, timber repairs, and general woodwork projects.',
    detail:
      'Carpentry covers structural timber work and detailed finishing jobs. Customers can request help with framing, doors, decking, pergolas, skirting, shelving, cabinetry, repairs, and general woodwork. It works well for both small fixes and larger build projects.',
  },
  {
    slug: 'painting',
    name: 'Painting',
    short: 'Find painters for interior walls, exterior surfaces, prep work, coatings, and touch-ups.',
    tooltip: 'Interior, exterior, prep, coatings, and repainting.',
    seo: 'Compare painters for interior painting, exterior painting, surface preparation, protective coatings, feature walls, and residential repainting jobs.',
    detail:
      'Painting services improve appearance, durability, and property value. This category includes interior walls, ceilings, trim, exterior surfaces, fences, touch-ups, surface preparation, and protective coatings. It is useful for refresh jobs, end-of-lease work, and full repaints.',
  },
  {
    slug: 'landscaping',
    name: 'Landscaping',
    short: 'Upgrade outdoor spaces with paving, turf, garden design, planting, retaining walls, and irrigation.',
    tooltip: 'Gardens, paving, turf, planting, and outdoor improvements.',
    seo: 'Book landscaping professionals for garden makeovers, paving, turf laying, retaining walls, irrigation systems, and outdoor living upgrades.',
    detail:
      'Landscaping helps transform and maintain outdoor spaces. Jobs may include paving, turf installation, planting, garden design, retaining walls, mulching, irrigation, and general yard improvements. This category suits both cosmetic upgrades and practical outdoor construction.',
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    short: 'Hire roofing specialists for repairs, replacement, guttering, storm damage, and leak detection.',
    tooltip: 'Roof repairs, replacement, gutters, and leak checks.',
    seo: 'Get roofing experts for roof repairs, roof restoration, gutter replacement, flashing work, storm damage, and roof leak detection.',
    detail:
      'Roofing work includes maintenance, repair, and replacement for residential and commercial properties. Customers can post jobs for roof leaks, damaged tiles, metal roofing, guttering, flashing, storm repairs, inspections, and restoration. This category is especially useful for weather-related damage and preventative upkeep.',
  },
  {
    slug: 'tiling',
    name: 'Tiling',
    short: 'Tackle bathrooms, kitchens, floors, splashbacks, grout, waterproofing, and tile replacement.',
    tooltip: 'Wall and floor tiling, grout, and waterproofing.',
    seo: 'Find tilers for bathroom tiling, kitchen splashbacks, floor tiling, grout replacement, waterproofing, and tile repair services.',
    detail:
      'Tiling covers both decorative and functional surface work. Jobs often involve bathroom walls, shower areas, splashbacks, kitchen floors, outdoor tiling, waterproofing, grout renewal, and tile repair. This category is a strong fit for renovation and finishing stages.',
  },
  {
    slug: 'demolition',
    name: 'Demolition',
    short: 'Arrange safe removal of sheds, kitchens, bathrooms, walls, flooring, and renovation debris.',
    tooltip: 'Removal, strip-outs, site clearing, and prep for renovation.',
    seo: 'Hire demolition contractors for bathroom strip-outs, kitchen removal, wall removal, flooring demolition, shed demolition, and site clearing.',
    detail:
      'Demolition is for safe removal and site preparation before construction or renovation begins. Customers can request bathroom strip-outs, kitchen removal, non-structural wall removal, flooring demolition, shed removal, and cleanup. This category is best for projects that need controlled teardown before the next trade begins.',
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
                rating:
                  typeof review.rating === 'number'
                    ? review.rating
                    : Number(review.rating),
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-primary-600">TradeConnect</div>
            <div className="space-x-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Connect with <span className="text-primary-600">Trusted Tradies</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Post your job, get competitive quotes from verified tradespeople, and hire with confidence. All in one platform.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register">
              <Button size="lg">Post a Job</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg">
                Find Work
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="text-4xl mb-4">Post</div>
            <h3 className="text-xl font-semibold mb-2">Post Your Job</h3>
            <p className="text-gray-600">
              Describe your project and get quotes from qualified tradies in your area.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="text-4xl mb-4">Compare</div>
            <h3 className="text-xl font-semibold mb-2">Compare Quotes</h3>
            <p className="text-gray-600">
              Review quotes side-by-side and choose the best tradie for your budget.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="text-4xl mb-4">Done</div>
            <h3 className="text-xl font-semibold mb-2">Get It Done</h3>
            <p className="text-gray-600">
              Message directly, track progress, and pay securely when satisfied.
            </p>
          </div>
        </div>

        <div className="mt-20 bg-primary-600 text-white rounded-2xl p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Are You a Tradie?</h2>
            <p className="text-lg text-primary-100 mb-6">
              Join thousands of tradespeople growing their business on TradeConnect. Browse jobs in your area, send quotes, and get hired.
            </p>
            <Link href="/register">
              <Button variant="secondary" size="lg">
                Join as a Provider
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Popular Categories</h2>
            <p className="text-gray-600">
              Click a category to view available contractors and the reviews customers have already submitted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {CATEGORIES.map((category) => {
              const isSelected = category.slug === selectedCategory.slug;

              return (
                <button
                  key={category.slug}
                  type="button"
                  title={category.tooltip}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-left bg-white p-6 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary-600 shadow-lg ring-2 ring-primary-100'
                      : 'border-gray-200 hover:shadow-md hover:border-primary-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-2">{category.name}</div>
                  <p className="text-sm text-gray-600 leading-6">{category.short}</p>
                  <p className="sr-only">{category.seo}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200 pb-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 mb-2">
                  {selectedCategory.name}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Available contractors</h3>
                <p className="text-gray-700 leading-7">{selectedCategory.detail}</p>
              </div>
              <Link href="/register" className="shrink-0">
                <Button>Post {selectedCategory.name} Work</Button>
              </Link>
            </div>

            <div className="mt-8">
              {isLoadingProviders ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-gray-600">
                  Loading {selectedCategory.name.toLowerCase()} contractors...
                </div>
              ) : null}

              {!isLoadingProviders && providersError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                  {providersError}
                </div>
              ) : null}

              {!isLoadingProviders && !providersError && providers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-gray-600">
                  No contractors are listed for this category yet.
                </div>
              ) : null}

              {!isLoadingProviders && !providersError && providers.length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {providers.map((provider) => (
                    <article
                      key={provider.user_id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
                            {provider.available ? 'Available now' : 'Currently busy'}
                          </p>
                          <h4 className="mt-2 text-xl font-semibold text-gray-900">
                            {provider.business_name || provider.display_name || provider.full_name}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {provider.display_name || provider.full_name}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                          <div className="text-sm text-gray-500">Average rating</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatRating(provider.avg_rating)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {provider.total_reviews} reviews, {provider.jobs_completed} jobs completed
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                        {provider.years_experience != null ? (
                          <span className="rounded-full bg-white px-3 py-1">
                            {provider.years_experience}+ years experience
                          </span>
                        ) : null}
                        {provider.categories.map((label) => (
                          <span key={label} className="rounded-full bg-white px-3 py-1">
                            {label}
                          </span>
                        ))}
                      </div>

                      {provider.bio ? (
                        <p className="mt-4 text-sm leading-6 text-gray-700">{provider.bio}</p>
                      ) : null}

                      <div className="mt-6">
                        <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                          User submitted reviews
                        </h5>
                        {provider.recent_reviews.length === 0 ? (
                          <p className="mt-3 rounded-xl bg-white p-4 text-sm text-gray-600">
                            No reviews submitted yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {provider.recent_reviews.map((review) => (
                              <div key={review.id} className="rounded-xl bg-white p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="font-medium text-gray-900">{review.reviewer_name}</div>
                                  <div className="text-sm font-semibold text-primary-600">
                                    {review.rating}/10
                                  </div>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                  {review.body || 'No written review provided.'}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">{formatDate(review.created_at)}</p>
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
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-4">TradeConnect</div>
            <p className="mb-4">Connecting customers with trusted tradespeople</p>
            <div className="text-sm text-gray-400">Copyright 2026 TradeConnect. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
