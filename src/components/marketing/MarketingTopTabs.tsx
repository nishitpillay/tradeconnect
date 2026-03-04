import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

type TabKey = 'user-experiences' | 'pricing';

interface MarketingTopTabsProps {
  activeTab: TabKey;
}

export function MarketingTopTabs({ activeTab }: MarketingTopTabsProps) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/user-experiences')}
          activeOpacity={0.85}
          style={[styles.tab, activeTab === 'user-experiences' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'user-experiences' && styles.tabTextActive]}>
            User Experiences
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/pricing')}
          activeOpacity={0.85}
          style={[styles.tab, activeTab === 'pricing' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'pricing' && styles.tabTextActive]}>
            Pricing
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
    gap: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tabActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
