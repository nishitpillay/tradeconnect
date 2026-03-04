import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { jobsAPI } from '../../../src/api/jobs.api';
import { FEATURED_CATEGORIES, getFeaturedCategoryById } from '../../../src/content/categories';
import type { Job, JobFeedResponse } from '../../../src/types';

export default function ProviderFeedScreen() {
  const router = useRouter();
  const previewCategories = FEATURED_CATEGORIES.slice(0, 4);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['jobFeed'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => jobsAPI.getFeed({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const jobs = data?.pages.flatMap((page: JobFeedResponse) => page.jobs) || [];

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min || !max) return null;
    return `$${(min / 100).toFixed(0)} - $${(max / 100).toFixed(0)}`;
  };

  const getUrgencyVariant = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'error';
      case 'within_48h':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <Card onPress={() => router.push(`/(tabs)/(provider)/jobs/${item.id}`)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
        <Badge
          type="urgency"
          label={item.urgency.replace('_', ' ')}
          variant={getUrgencyVariant(item.urgency)}
        />
      </View>
      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </Text>
      {getFeaturedCategoryById(item.category_id) ? (
        <Text style={styles.jobCategoryCopy} numberOfLines={2}>
          {getFeaturedCategoryById(item.category_id)?.short}
        </Text>
      ) : null}
      <View style={styles.jobFooter}>
        <View>
          <Text style={styles.jobLocation}>{item.suburb}, {item.state}</Text>
          <Text style={styles.jobDate}>
            Posted {new Date(item.published_at || item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {formatBudget(item.budget_min, item.budget_max) && (
          <Text style={styles.jobBudget}>
            {formatBudget(item.budget_min, item.budget_max)}
          </Text>
        )}
      </View>
      <View style={styles.quoteInfo}>
        <Text style={styles.quoteCount}>{item.quote_count} quotes submitted</Text>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No jobs available</Text>
      <Text style={styles.emptyText}>
        Check back soon for new opportunities in your area
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
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Browse by trade</Text>
            <Text style={styles.headerText}>
              Use the category notes below to judge fit quickly before opening a job.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              style={styles.categoryScroller}
            >
              {previewCategories.map((category) => (
                <View key={category.id} style={styles.categoryCard}>
                  <Text style={styles.categoryBadge}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCopy} numberOfLines={3}>
                    {category.short}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        }
        contentContainerStyle={styles.list}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  list: {
    padding: 16,
  },
  headerBlock: {
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryScroller: {
    marginBottom: 6,
  },
  categoryRow: {
    gap: 12,
    paddingRight: 4,
  },
  categoryCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  categoryBadge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  categoryCopy: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  jobCategoryCopy: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  jobLocation: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  jobDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  jobBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  quoteInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quoteCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
