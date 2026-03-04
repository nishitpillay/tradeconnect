import { apiClient } from './client';
import type { User, CustomerProfile, ProviderProfile, CategoryProvider } from '@/types';

export const profilesAPI = {
  getMe: async (): Promise<{
    user: User;
    customer_profile?: CustomerProfile;
    provider_profile?: ProviderProfile;
  }> => {
    return apiClient.get('/profiles/me');
  },

  updateUser: async (data: {
    full_name?: string;
    display_name?: string;
    timezone?: string;
  }): Promise<{ user: User }> => {
    return apiClient.patch('/profiles/me', data);
  },

  updateCustomerProfile: async (data: {
    suburb?: string;
    state?: string;
    postcode?: string;
  }): Promise<{ customer_profile: CustomerProfile }> => {
    return apiClient.patch('/profiles/me/customer', data);
  },

  updateProviderProfile: async (data: {
    bio?: string;
    years_experience?: number;
    service_radius_km?: number;
    business_name?: string;
    abn?: string;
  }): Promise<{ provider_profile: ProviderProfile }> => {
    return apiClient.patch('/profiles/me/provider', data);
  },

  toggleAvailability: async (available: boolean): Promise<{ provider_profile: ProviderProfile }> => {
    return apiClient.patch('/profiles/me/availability', { available });
  },

  listProvidersByCategory: async (slug: string): Promise<{ providers: CategoryProvider[] }> => {
    return apiClient.get(`/profiles/categories/${slug}/providers`);
  },
};
