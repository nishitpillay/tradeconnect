import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { MarketingTopTabs } from '../../src/components/marketing/MarketingTopTabs';
import { PRICING_PLANS, PRICING_POLICY_NOTES } from '../../src/content/marketing';

export default function PricingScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <MarketingTopTabs activeTab="pricing" />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Simple pricing</Text>
        <Text style={styles.title}>Four options. Clear monthly path. One-time pass included.</Text>
        <Text style={styles.copy}>
          TradeConnect pricing is presented as a simple monthly ladder plus a one-time 30-day no lock-in access pass.
        </Text>
      </View>

      <View style={styles.planList}>
        {PRICING_PLANS.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.highlight && styles.planCardHighlight]}>
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, plan.highlight && styles.planNameHighlight]}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceValue, plan.highlight && styles.priceValueHighlight]}>{plan.priceLabel}</Text>
                  <Text style={[styles.priceCadence, plan.highlight && styles.priceCadenceHighlight]}>{plan.cadence}</Text>
                </View>
              </View>
              {plan.highlight ? (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.planDescription, plan.highlight && styles.planDescriptionHighlight]}>
              {plan.description}
            </Text>

            <View style={styles.bulletList}>
              {plan.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, plan.highlight && styles.bulletDotHighlight]} />
                  <Text style={[styles.bulletText, plan.highlight && styles.bulletTextHighlight]}>{bullet}</Text>
                </View>
              ))}
            </View>

            <Button
              variant={plan.highlight ? 'secondary' : 'primary'}
              fullWidth
              onPress={() => router.push('/(auth)/register')}
              style={styles.planButton}
              className={plan.highlight ? 'bg-white' : ''}
            >
              {plan.cta}
            </Button>
          </View>
        ))}
      </View>

      <View style={styles.policyCard}>
        <Text style={styles.policyTitle}>No lock-in pass policy</Text>
        <View style={styles.policyList}>
          {PRICING_POLICY_NOTES.map((note) => (
            <View key={note} style={styles.policyNote}>
              <Text style={styles.policyText}>{note}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerActions}>
        <Button variant="primary" fullWidth onPress={() => router.push('/(auth)/register')}>
          Get Started
        </Button>
        <Button variant="outline" fullWidth onPress={() => router.push('/(auth)/user-experiences')}>
          See User Experiences
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
  planList: {
    gap: 14,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  planCardHighlight: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  planNameHighlight: {
    color: '#BAE6FD',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 10,
  },
  priceValue: {
    color: '#0F172A',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  priceValueHighlight: {
    color: '#FFFFFF',
  },
  priceCadence: {
    color: '#64748B',
    fontSize: 13,
    paddingBottom: 6,
  },
  priceCadenceHighlight: {
    color: '#CBD5E1',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  planDescription: {
    marginTop: 12,
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  planDescriptionHighlight: {
    color: '#CBD5E1',
  },
  bulletList: {
    gap: 10,
    marginTop: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#0EA5E9',
    marginTop: 7,
  },
  bulletDotHighlight: {
    backgroundColor: '#7DD3FC',
  },
  bulletText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 21,
  },
  bulletTextHighlight: {
    color: '#E2E8F0',
  },
  planButton: {
    marginTop: 18,
    borderRadius: 999,
  },
  policyCard: {
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  policyTitle: {
    color: '#0F172A',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  policyList: {
    gap: 10,
    marginTop: 14,
  },
  policyNote: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  policyText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 21,
  },
  footerActions: {
    marginTop: 20,
    gap: 12,
  },
});
