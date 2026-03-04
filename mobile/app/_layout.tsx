import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';
import { useSocketStore } from '../src/stores/socketStore';
import { ToastContainer } from '../src/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, loadTokens, accessToken } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  // Handle socket connection
  useEffect(() => {
    const enableSocket = process.env.EXPO_PUBLIC_ENABLE_SOCKET === 'true';

    if (isAuthenticated && accessToken && enableSocket) {
      connect(accessToken);
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [isAuthenticated, accessToken]);

  // Protected route logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authLeaf = segments[1];
    const isPublicMarketingScreen = authLeaf === 'pricing' || authLeaf === 'user-experiences';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to welcome if not authenticated
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup && !isPublicMarketingScreen) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)/(customer)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/review"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Write Review',
          }}
        />
        <Stack.Screen
          name="modal/report"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Report Content',
          }}
        />
      </Stack>
      <StatusBar style="dark" />
      <ToastContainer />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
