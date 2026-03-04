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
      const publicRoutes = new Set(['/', '/login', '/register', '/forgot-password', '/pricing', '/user-experiences']);
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

      // Public pages should not trigger auth bootstrap redirects.
      if (publicRoutes.has(pathname)) {
        setLoading(false);
        return;
      }
      try {
        // Try to fetch current user (will use refresh token if access token expired)
        const user = await authAPI.getMe();
        setUser(user);
        setAuthenticated(true);

        // Connect socket if authenticated
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          socketClient.connect(accessToken);
        }
      } catch (error) {
        // Not authenticated or refresh token expired
        setUser(null);
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
  }, [setUser, setAuthenticated, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
