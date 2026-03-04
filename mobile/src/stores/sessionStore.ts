import { create } from 'zustand';
import type { User, CustomerProfile, ProviderProfile } from '../types';

interface SessionState {
  user: User | null;
  role: 'customer' | 'provider' | null;
  customerProfile: CustomerProfile | null;
  providerProfile: ProviderProfile | null;

  setUser: (user: User) => void;
  setCustomerProfile: (profile: CustomerProfile) => void;
  setProviderProfile: (profile: ProviderProfile) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  role: null,
  customerProfile: null,
  providerProfile: null,

  setUser: (user) => {
    set({ user, role: user.role as 'customer' | 'provider' });
  },

  setCustomerProfile: (profile) => {
    set({ customerProfile: profile });
  },

  setProviderProfile: (profile) => {
    set({ providerProfile: profile });
  },

  clearSession: () => {
    set({ user: null, role: null, customerProfile: null, providerProfile: null });
  },
}));
