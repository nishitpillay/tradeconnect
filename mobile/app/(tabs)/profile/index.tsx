import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSessionStore } from '../../../src/stores/sessionStore';
import { useUIStore } from '../../../src/stores/uiStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { clearTokens } = useAuthStore();
  const { user, clearSession } = useSessionStore();
  const { showToast } = useUIStore();

  const handleLogout = async () => {
    await clearTokens();
    clearSession();
    showToast({ type: 'success', message: 'Logged out successfully' });
    router.replace('/(auth)/welcome');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'customer' ? 'Customer' : 'Provider'}
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile/edit')}>
          <Card style={styles.menuCard}>
            <Text style={styles.menuItem}>Edit Profile  →</Text>
          </Card>
        </TouchableOpacity>
        <Card style={styles.menuCard}>
          <Text style={styles.menuItem}>Settings</Text>
        </Card>
        <Card style={styles.menuCard}>
          <Text style={styles.menuItem}>Help & Support</Text>
        </Card>
      </View>

      <Button
        variant="danger"
        fullWidth
        onPress={handleLogout}
        leftIcon="log-out-outline"
      >
        Log Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  menuCard: {
    marginBottom: 8,
  },
  menuItem: {
    fontSize: 16,
    color: '#111827',
  },
});
