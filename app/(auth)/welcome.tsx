import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TradeConnect</Text>
        <Text style={styles.subtitle}>Connect with trusted tradies for your next project</Text>
        <View style={styles.marketingLinks}>
          <TouchableOpacity
            style={styles.marketingChip}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/user-experiences')}
          >
            <Text style={styles.marketingChipText}>User Experiences</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.marketingChip}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/pricing')}
          >
            <Text style={styles.marketingChipText}>Pricing</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
        >
          Get Started
        </Button>
        <Button
          variant="outline"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
        >
          Log In
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  marketingLinks: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  marketingChip: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  marketingChipText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
});
