import { apiClient } from './client';
import type { LoginInput, RegisterInput } from '@tradeconnect/shared';
import type { LoginResponse, User, AuthTokens } from '../types';

export const authAPI = {
  login: async (data: LoginInput): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterInput): Promise<LoginResponse> => {
    return apiClient.post('/auth/register', data);
  },

  logout: async (refreshToken: string): Promise<void> => {
    return apiClient.post('/auth/logout', { refresh_token: refreshToken });
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken });
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/reset-password', { token, new_password: newPassword });
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/verify-email', { token });
  },

  requestPhoneOTP: async (phone: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/phone-otp/request', { phone });
  },

  verifyPhoneOTP: async (phone: string, otp: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/phone-otp/verify', { phone, otp });
  },

  getMe: async (): Promise<{ user: User }> => {
    return apiClient.get('/auth/me');
  },
};
