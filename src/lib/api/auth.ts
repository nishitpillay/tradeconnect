import { apiClient } from './client';
import { AuthResponse, User } from '@/types';
import { LoginInput, RegisterInput } from '@tradeconnect/shared/schemas/auth.schema';

export const authAPI = {
  async login(data: LoginInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data);
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data);
  },

  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout');
  },

  async getMe(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.post('/auth/reset-password', { token, new_password: password });
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient.post('/auth/verify-email', { token });
  },
};
