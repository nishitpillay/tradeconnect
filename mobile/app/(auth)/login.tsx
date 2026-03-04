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
import { LoginSchema } from '@tradeconnect/shared';
import type { LoginInput } from '../../src/types';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setTokens } = useAuthStore();
  const { setUser } = useSessionStore();
  const { showToast } = useUIStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => authAPI.login(data),
    onSuccess: async (data) => {
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      showToast({ type: 'success', message: 'Welcome back!' });

      // Navigate based on role
      if (data.user.role === 'customer') {
        router.replace('/(tabs)/(customer)');
      } else {
        router.replace('/(tabs)/(provider)');
      }
    },
    onError: (error: any) => {
      showToast({ type: 'error', message: error.message || 'Login failed' });
    },
  });

  const handleLogin = () => {
    setErrors({});

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err: { path: (string | number)[]; message: string }) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    loginMutation.mutate(result.data);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
          leftIcon="mail-outline"
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          type="password"
          error={errors.password}
          leftIcon="lock-closed-outline"
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          variant="primary"
          fullWidth
          loading={loginMutation.isPending}
          onPress={handleLogin}
        >
          Log In
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.footerLink}>Sign up</Text>
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
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#3B82F6',
    textAlign: 'right',
    marginTop: -8,
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
