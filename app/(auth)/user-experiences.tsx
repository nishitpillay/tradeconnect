import React from 'react';
import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { MarketingTopTabs } from '../../src/components/marketing/MarketingTopTabs';
import { EXPERIENCE_STORIES } from '../../src/content/marketing';

export default function UserExperiencesScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <MarketingTopTabs activeTab="user-experiences" />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Demo transformations</Text>
        <Text style={styles.title}>See how TradeConnect can present real job outcomes.</Text>
        <Text style={styles.copy}>
          These dummy stories show the kind of before-and-after experience, customer proof, and trade-specific outcomes
          the product is designed to surface.
        </Text>
      </View>

      <View style={styles.storyList}>
        {EXPERIENCE_STORIES.map((story) => (
          <View key={story.id} style={styles.storyCard}>
            <View style={styles.storyMeta}>
              <Text style={styles.storyTrade}>{story.trade}</Text>
              <Text style={styles.storyLocation}>{story.location}</Text>
            </View>

            <Text style={styles.storyTitle}>{story.title}</Text>
            <Text style={styles.storyOutcome}>{story.outcome}</Text>

            <View style={styles.imageRow}>
              <View style={styles.imageCard}>
                <Image source={{ uri: story.beforeImage }} style={styles.image} />
                <View style={styles.beforeBadge}>
                  <Text style={styles.badgeText}>Before</Text>
                </View>
              </View>
              <View style={styles.imageCard}>
                <Image source={{ uri: story.afterImage }} style={styles.image} />
                <View style={styles.afterBadge}>
                  <Text style={styles.badgeText}>After</Text>
                </View>
              </View>
            </View>

            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>“{story.quote}”</Text>
              <Text style={styles.quoteAuthor}>{story.customer}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footerActions}>
        <Button variant="primary" fullWidth onPress={() => router.push('/(auth)/register')}>
          Get Started
        </Button>
        <Button variant="outline" fullWidth onPress={() => router.push('/(auth)/pricing')}>
          View Pricing
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 20,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    padding: 22,
  },
  eyebrow: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  copy: {
    marginTop: 12,
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  storyList: {
    gap: 16,
  },
  storyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  storyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storyTrade: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  storyLocation: {
    color: '#64748B',
    fontSize: 12,
  },
  storyTitle: {
    color: '#0F172A',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  storyOutcome: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  imageRow: {
    marginTop: 14,
    gap: 12,
  },
  imageCard: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
  },
  beforeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  afterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quoteCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  quoteText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
  },
  quoteAuthor: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  footerActions: {
    marginTop: 20,
    gap: 12,
  },
});
