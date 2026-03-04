import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/stores/authStore';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useUIStore } from '../../src/stores/uiStore';
import { authAPI } from '../../src/api/auth.api';
import { RegisterSchema } from '@tradeconnect/shared';
import type { RegisterInput } from '../../src/types';

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'customer' as 'customer' | 'provider',
    phone: '',
    business_name: '',
    terms_accepted: false,
    privacy_accepted: false,
    marketing_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setTokens } = useAuthStore();
  const { setUser } = useSessionStore();
  const { showToast } = useUIStore();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => authAPI.register(data),
    onSuccess: async (data) => {
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      showToast({ type: 'success', message: 'Account created successfully!' });

      // Navigate based on role
      if (data.user.role === 'customer') {
        router.replace('/(tabs)/(customer)');
      } else {
        router.replace('/(tabs)/(provider)');
      }
    },
    onError: (error: any) => {
      showToast({ type: 'error', message: error.message || 'Registration failed' });
    },
  });

  const handleRegister = () => {
    setErrors({});

    if (!formData.terms_accepted || !formData.privacy_accepted) {
      showToast({ type: 'error', message: 'Please accept the terms and privacy policy' });
      return;
    }

    const result = RegisterSchema.safeParse({
      ...formData,
      terms_accepted: true,
      privacy_accepted: true,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err: { path: (string | number)[]; message: string }) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    registerMutation.mutate(result.data);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join TradeConnect today</Text>

      {/* Role Selection */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, formData.role === 'customer' && styles.roleButtonActive]}
          onPress={() => setFormData({ ...formData, role: 'customer' })}
        >
          <Text style={[styles.roleText, formData.role === 'customer' && styles.roleTextActive]}>
            I need services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, formData.role === 'provider' && styles.roleButtonActive]}
          onPress={() => setFormData({ ...formData, role: 'provider' })}
        >
          <Text style={[styles.roleText, formData.role === 'provider' && styles.roleTextActive]}>
            I'm a tradie
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Input
          label="Full Name"
          placeholder="John Smith"
          value={formData.full_name}
          onChangeText={(text) => setFormData({ ...formData, full_name: text })}
          error={errors.full_name}
          required
          leftIcon="person-outline"
        />

        <Input
          label="Email"
          placeholder="you@example.com"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          type="email"
          autoCapitalize="none"
          error={errors.email}
          required
          leftIcon="mail-outline"
        />

        <Input
          label="Password"
          placeholder="Min 8 characters"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          type="password"
          error={errors.password}
          required
          leftIcon="lock-closed-outline"
        />

        <Input
          label="Phone (optional)"
          placeholder="+61412345678"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          type="phone"
          error={errors.phone}
          leftIcon="call-outline"
        />

        {formData.role === 'provider' && (
          <Input
            label="Business Name (optional)"
            placeholder="Smith Plumbing"
            value={formData.business_name}
            onChangeText={(text) => setFormData({ ...formData, business_name: text })}
            leftIcon="business-outline"
          />
        )}

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setFormData({ ...formData, terms_accepted: !formData.terms_accepted })}
        >
          <View style={[styles.checkboxBox, formData.terms_accepted && styles.checkboxBoxActive]}>
            {formData.terms_accepted && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>I accept the Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setFormData({ ...formData, privacy_accepted: !formData.privacy_accepted })}
        >
          <View style={[styles.checkboxBox, formData.privacy_accepted && styles.checkboxBoxActive]}>
            {formData.privacy_accepted && <Text style={styles.checkboxCheck}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>I accept the Privacy Policy</Text>
        </TouchableOpacity>

        <Button
          variant="primary"
          fullWidth
          loading={registerMutation.isPending}
          onPress={handleRegister}
        >
          Create Account
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.footerLink}>Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#3B82F6',
  },
  form: {
    gap: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
