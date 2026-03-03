import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { StatusPill } from '../../../src/components/ui/StatusPill';
import { jobsAPI } from '../../../src/api/jobs.api';
import { FEATURED_CATEGORIES } from '../../../src/content/categories';
import type { Job } from '../../../src/types';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const previewCategories = FEATURED_CATEGORIES.slice(0, 4);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myJobs'],
    queryFn: () => jobsAPI.getMyJobs(),
  });

  const handleCreateJob = () => {
    router.push('/(tabs)/(customer)/post-job');
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <Card onPress={() => router.push(`/(tabs)/(customer)/jobs/${item.id}`)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
        <StatusPill status={item.status} size="sm" />
      </View>
      <Text style={styles.jobSuburb}>{item.suburb}, {item.state}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.quoteCount}>{item.quote_count} quotes</Text>
        <Text style={styles.jobDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No jobs yet</Text>
      <Text style={styles.emptyText}>
        Post your first job to get quotes from trusted tradies
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.jobs || []}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Button
              variant="primary"
              fullWidth
              onPress={handleCreateJob}
              leftIcon="add"
              style={styles.createButton}
            >
              Post a New Job
            </Button>
            <View style={styles.categoryIntro}>
              <Text style={styles.categoryIntroTitle}>Popular job types</Text>
              <Text style={styles.categoryIntroText}>
                Start with a category and we will guide you through the right job details.
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              style={styles.categoryScroller}
            >
              {previewCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  activeOpacity={0.85}
                  onPress={handleCreateJob}
                >
                  <Text style={styles.categoryBadge}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCopy} numberOfLines={3}>
                    {category.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={styles.list}
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
  createButton: {
    marginBottom: 16,
  },
  categoryIntro: {
    marginBottom: 12,
  },
  categoryIntroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categoryIntroText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  categoryScroller: {
    marginBottom: 18,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  jobSuburb: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteCount: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  jobDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
