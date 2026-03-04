import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),

  setAccessToken: (token) => set({ accessToken: token }),

  setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () => {
    // Clear refresh token cookie via API
    if (typeof window !== 'undefined') {
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  initializeAuth: () => {
    // This will be called on app mount to check for existing session
    set({ isLoading: true });
    // Auth initialization happens in the API client
  },
}));
