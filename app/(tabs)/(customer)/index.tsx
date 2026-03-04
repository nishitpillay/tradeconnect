import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { StatusPill } from '../../../src/components/ui/StatusPill';
import { jobsAPI } from '../../../src/api/jobs.api';
import { profilesAPI } from '../../../src/api/profiles.api';
import { FEATURED_CATEGORIES } from '../../../src/content/categories';
import type { CategoryProvider, Job } from '../../../src/types';

const JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Brief your job once',
    copy: 'Add the trade, urgency, budget, and photos without repeating the same scope across multiple listings.',
  },
  {
    step: '02',
    title: 'Review matched tradies',
    copy: 'Browse contractor fit, review history, and availability in one place before you shortlist anyone.',
  },
  {
    step: '03',
    title: 'Compare quotes with context',
    copy: 'Pricing makes more sense when ratings, completed jobs, and customer comments sit beside it.',
  },
  {
    step: '04',
    title: 'Move from award to completed work',
    copy: 'Keep job progress, messages, and post-job reviews in the same workflow.',
  },
];

function normalizeProviders(providers: CategoryProvider[]): CategoryProvider[] {
  return providers.map((provider) => ({
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
  }));
}

function formatRating(value: number | string | null): string {
  if (value == null) return 'No rating';
  const normalized = typeof value === 'number' ? value : Number(value);
  return `${normalized.toFixed(1)}/10`;
}

function formatReviewDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState(FEATURED_CATEGORIES[0].id);

  const selectedCategory = useMemo(
    () => FEATURED_CATEGORIES.find((category) => category.id === selectedCategoryId) ?? FEATURED_CATEGORIES[0],
    [selectedCategoryId]
  );

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myJobs'],
    queryFn: () => jobsAPI.getMyJobs(),
  });

  const {
    data: providerData,
    isLoading: isLoadingProviders,
    error: providersError,
  } = useQuery({
    queryKey: ['categoryProviders', selectedCategory.slug],
    queryFn: async () => {
      const response = await profilesAPI.listProvidersByCategory(selectedCategory.slug);
      return normalizeProviders(response.providers);
    },
  });

  const jobs = data?.jobs || [];
  const providerCount = providerData?.length ?? 0;
  const visibleReviewCount = providerData?.reduce((count, provider) => count + provider.recent_reviews.length, 0) ?? 0;

  const handleCreateJob = () => {
    router.push('/(tabs)/(customer)/post-job');
  };

  const handleBrowseProviders = () => {
    setSelectedCategoryId(FEATURED_CATEGORIES[0].id);
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <Card onPress={() => router.push(`/(tabs)/(customer)/jobs/${item.id}`)} style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
        <StatusPill status={item.status} size="sm" />
      </View>
      <Text style={styles.jobSuburb}>{item.suburb}, {item.state}</Text>
      <View style={styles.jobCardFooter}>
        <Text style={styles.jobQuoteCount}>{item.quote_count} quotes</Text>
        <Text style={styles.jobDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </Card>
  );

  const renderEmptyJobs = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No jobs posted yet</Text>
      <Text style={styles.emptyText}>
        Start with a category below and post your first job when you are ready to collect quotes.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Modern trade marketplace</Text>
              </View>
              <Text style={styles.heroTitle}>Post a job. Compare trusted tradies. Hire with confidence.</Text>
              <Text style={styles.heroCopy}>
                TradeConnect gives customers a cleaner way to move from job request to contractor shortlist using
                category-based discovery, real reviews, and quote context in one product.
              </Text>

              <View style={styles.heroActions}>
                <Button variant="secondary" onPress={handleCreateJob} className="bg-white" style={styles.heroPrimaryButton}>
                  Post a Job
                </Button>
                <Button variant="outline" onPress={handleBrowseProviders} style={styles.heroSecondaryButton}>
                  Browse Contractors
                </Button>
              </View>

              <View style={styles.heroMarketingLinks}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroMarketingChip}
                  onPress={() => router.push('/(auth)/user-experiences')}
                >
                  <Text style={styles.heroMarketingChipText}>User Experiences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.heroMarketingChip}
                  onPress={() => router.push('/(auth)/pricing')}
                >
                  <Text style={styles.heroMarketingChipText}>Pricing</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>8</Text>
                  <Text style={styles.heroStatLabel}>Featured trades</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>40</Text>
                  <Text style={styles.heroStatLabel}>Demo contractors</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>80</Text>
                  <Text style={styles.heroStatLabel}>Seeded reviews</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>How it works</Text>
              <Text style={styles.sectionTitle}>A cleaner customer journey from job brief to contractor decision.</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.journeyRow}
              style={styles.journeyScroller}
            >
              {JOURNEY_STEPS.map((step) => (
                <View key={step.step} style={styles.journeyCard}>
                  <Text style={styles.journeyStep}>{step.step}</Text>
                  <Text style={styles.journeyTitle}>{step.title}</Text>
                  <Text style={styles.journeyCopy}>{step.copy}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Categories</Text>
              <Text style={styles.sectionTitle}>Browse providers the way customers actually think.</Text>
              <Text style={styles.sectionCopy}>
                Start with the trade, then inspect availability, ratings, and recent customer feedback.
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              style={styles.categoryScroller}
            >
              {FEATURED_CATEGORIES.map((category) => {
                const isSelected = category.id === selectedCategory.id;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedCategoryId(category.id)}
                  >
                    <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapSelected]}>
                      <Text style={[styles.categoryIcon, isSelected && styles.categoryIconSelected]}>{category.icon}</Text>
                    </View>
                    <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>{category.name}</Text>
                    <Text style={[styles.categoryCopy, isSelected && styles.categoryCopySelected]} numberOfLines={3}>
                      {category.short}
                    </Text>
                    <View style={styles.categoryFooter}>
                      <Text style={[styles.categoryFooterText, isSelected && styles.categoryFooterTextSelected]}>
                        Tap to view contractors
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.directoryShell}>
              <View style={styles.directoryHeader}>
                <View style={styles.directoryHeaderCopy}>
                  <Text style={styles.directoryEyebrow}>{selectedCategory.name}</Text>
                  <Text style={styles.directoryTitle}>Available contractors</Text>
                  <Text style={styles.directoryText}>{selectedCategory.detail}</Text>
                </View>
                <Button variant="outline" onPress={handleCreateJob} style={styles.directoryButton}>
                  Post {selectedCategory.name} Job
                </Button>
              </View>

              <View style={styles.directoryStatsRow}>
                <View style={styles.directoryStatCard}>
                  <Text style={styles.directoryStatValue}>{providerCount}</Text>
                  <Text style={styles.directoryStatLabel}>visible providers</Text>
                </View>
                <View style={styles.directoryStatCard}>
                  <Text style={styles.directoryStatValue}>{visibleReviewCount}</Text>
                  <Text style={styles.directoryStatLabel}>recent reviews shown</Text>
                </View>
              </View>

              {isLoadingProviders ? (
                <View style={styles.directoryMessage}>
                  <Text style={styles.directoryMessageText}>
                    Loading {selectedCategory.name.toLowerCase()} contractors...
                  </Text>
                </View>
              ) : null}

              {!isLoadingProviders && providersError ? (
                <View style={[styles.directoryMessage, styles.directoryError]}>
                  <Text style={[styles.directoryMessageText, styles.directoryErrorText]}>
                    Unable to load contractors right now.
                  </Text>
                </View>
              ) : null}

              {!isLoadingProviders && !providersError && providerCount === 0 ? (
                <View style={styles.directoryMessage}>
                  <Text style={styles.directoryMessageText}>
                    No contractors are listed for this category yet.
                  </Text>
                </View>
              ) : null}

              {!isLoadingProviders && !providersError && providerCount > 0 ? (
                <View style={styles.providerList}>
                  {providerData?.map((provider) => (
                    <View key={provider.user_id} style={styles.providerCard}>
                      <View style={styles.providerTopRow}>
                        <View style={styles.providerTopCopy}>
                          <Text style={[styles.providerAvailability, provider.available ? styles.providerAvailable : styles.providerBusy]}>
                            {provider.available ? 'Available now' : 'Currently busy'}
                          </Text>
                          <Text style={styles.providerBusiness}>
                            {provider.business_name || provider.display_name || provider.full_name}
                          </Text>
                          <Text style={styles.providerName}>
                            {provider.display_name || provider.full_name}
                          </Text>
                        </View>

                        <View style={styles.providerRatingCard}>
                          <Text style={styles.providerRatingLabel}>Average rating</Text>
                          <Text style={styles.providerRatingValue}>{formatRating(provider.avg_rating)}</Text>
                          <Text style={styles.providerRatingMeta}>
                            {provider.total_reviews} reviews · {provider.jobs_completed} jobs
                          </Text>
                        </View>
                      </View>

                      <View style={styles.providerTags}>
                        {provider.years_experience != null ? (
                          <Text style={styles.providerTag}>{provider.years_experience}+ years</Text>
                        ) : null}
                        {provider.categories.map((category) => (
                          <Text key={category} style={styles.providerTag}>{category}</Text>
                        ))}
                      </View>

                      {provider.bio ? (
                        <Text style={styles.providerBio}>{provider.bio}</Text>
                      ) : null}

                      <Text style={styles.reviewHeading}>User submitted reviews</Text>

                      {provider.recent_reviews.length === 0 ? (
                        <View style={styles.reviewCard}>
                          <Text style={styles.reviewBody}>No reviews submitted yet.</Text>
                        </View>
                      ) : (
                        provider.recent_reviews.map((review) => (
                          <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                              <Text style={styles.reviewAuthor}>{review.reviewer_name}</Text>
                              <View style={styles.reviewRatingBadge}>
                                <Text style={styles.reviewRating}>{review.rating}/10</Text>
                              </View>
                            </View>
                            <Text style={styles.reviewBody}>
                              {review.body || 'No written review provided.'}
                            </Text>
                            <Text style={styles.reviewDate}>{formatReviewDate(review.created_at)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Your work</Text>
              <Text style={styles.sectionTitle}>Track the jobs you have already posted.</Text>
            </View>
          </View>
        }
        ListEmptyComponent={!isLoading ? renderEmptyJobs : null}
        ListFooterComponent={
          <View style={styles.footerCtaWrap}>
            <View style={styles.footerCta}>
              <View style={styles.footerCtaBlock}>
                <Text style={styles.footerEyebrow}>For customers</Text>
                <Text style={styles.footerTitle}>Need quotes this week?</Text>
                <Text style={styles.footerCopy}>
                  Post once, browse by trade, and compare providers with actual review context before you commit.
                </Text>
                <Button variant="secondary" onPress={handleCreateJob} className="bg-white" style={styles.footerButton}>
                  Post a Job
                </Button>
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.footerCtaBlock}>
                <Text style={styles.footerEyebrow}>For providers</Text>
                <Text style={styles.footerTitle}>Ready to win more local work?</Text>
                <Text style={styles.footerCopy}>
                  Join the provider side of TradeConnect and start receiving category-relevant opportunities.
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(auth)/register')}
                  style={styles.providerJoinButton}
                >
                  Join as a Provider
                </Button>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  list: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroCopy: {
    marginTop: 14,
    color: '#D6E7FF',
    fontSize: 15,
    lineHeight: 24,
  },
  heroActions: {
    marginTop: 20,
    gap: 12,
  },
  heroPrimaryButton: {
    borderRadius: 999,
  },
  heroSecondaryButton: {
    borderRadius: 999,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroMarketingLinks: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  heroMarketingChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMarketingChipText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '700',
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroStatLabel: {
    marginTop: 4,
    color: '#D6E7FF',
    fontSize: 11,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  sectionCopy: {
    marginTop: 6,
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  journeyScroller: {
    marginBottom: 24,
  },
  journeyRow: {
    gap: 12,
    paddingRight: 4,
  },
  journeyCard: {
    width: 250,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  journeyStep: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  journeyTitle: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  journeyCopy: {
    marginTop: 10,
    color: '#475569',
    fontSize: 13,
    lineHeight: 21,
  },
  categoryScroller: {
    marginBottom: 20,
  },
  categoryRow: {
    gap: 12,
    paddingRight: 4,
  },
  categoryCard: {
    width: 236,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  categoryCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  categoryIconWrap: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  categoryIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoryIcon: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '800',
  },
  categoryIconSelected: {
    color: '#E0F2FE',
  },
  categoryName: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  categoryNameSelected: {
    color: '#FFFFFF',
  },
  categoryCopy: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
  },
  categoryCopySelected: {
    color: '#CBD5E1',
  },
  categoryFooter: {
    marginTop: 16,
  },
  categoryFooterText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryFooterTextSelected: {
    color: '#E0F2FE',
  },
  directoryShell: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginBottom: 26,
    shadowColor: '#0F172A',
    shadowOpacity: 0.09,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  directoryHeader: {
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 18,
    marginBottom: 16,
  },
  directoryHeaderCopy: {
    gap: 6,
  },
  directoryEyebrow: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  directoryTitle: {
    color: '#0F172A',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  directoryText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  directoryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  directoryStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  directoryStatCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  directoryStatValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  directoryStatLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
  },
  directoryMessage: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  directoryMessageText: {
    color: '#64748B',
    fontSize: 14,
  },
  directoryError: {
    borderColor: '#FDA4AF',
    backgroundColor: '#FFF1F2',
  },
  directoryErrorText: {
    color: '#BE123C',
  },
  providerList: {
    gap: 14,
  },
  providerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FBFF',
    padding: 16,
  },
  providerTopRow: {
    gap: 14,
  },
  providerTopCopy: {
    gap: 4,
  },
  providerAvailability: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  providerAvailable: {
    color: '#0F766E',
  },
  providerBusy: {
    color: '#B45309',
  },
  providerBusiness: {
    color: '#0F172A',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
  },
  providerName: {
    color: '#64748B',
    fontSize: 13,
  },
  providerRatingCard: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  providerRatingLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
  },
  providerRatingValue: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  providerRatingMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  providerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  providerTag: {
    color: '#334155',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    overflow: 'hidden',
  },
  providerBio: {
    marginTop: 14,
    color: '#475569',
    fontSize: 13,
    lineHeight: 21,
  },
  reviewHeading: {
    marginTop: 18,
    marginBottom: 10,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewAuthor: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  reviewRatingBadge: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewRating: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewBody: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 21,
  },
  reviewDate: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  jobCard: {
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  jobSuburb: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 10,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobQuoteCount: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  jobDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footerCtaWrap: {
    marginTop: 10,
  },
  footerCta: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
  },
  footerCtaBlock: {
    gap: 8,
  },
  footerEyebrow: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  footerCopy: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  footerButton: {
    marginTop: 10,
    borderRadius: 999,
  },
  providerJoinButton: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#0EA5E9',
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 18,
  },
});
