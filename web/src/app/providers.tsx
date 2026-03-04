'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api/auth';
import { socketClient } from '@/lib/socket/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const { setUser, setAccessToken, setAuthenticated, setLoading } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    async function initializeAuth() {
      try {
        const user = await authAPI.getMe({ skipAuthRedirect: true });
        setUser(user);
        setAuthenticated(true);

        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          socketClient.connect(accessToken);
        }
      } catch (error) {
        setUser(null);
        setAccessToken(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    // Cleanup socket on unmount
    return () => {
      socketClient.disconnect();
    };
  }, [setUser, setAccessToken, setAuthenticated, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
