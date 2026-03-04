import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

class APIClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: inject auth token
    this.client.interceptors.request.use(
      (config) => {
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request until token is refreshed
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const { refreshToken } = useAuthStore.getState();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token: new_refresh } = response.data;
            if (new_refresh) {
              await useAuthStore.getState().setTokens(access_token, new_refresh);
            } else {
              useAuthStore.getState().setAccessToken(access_token);
            }

            // Retry all queued requests
            this.refreshSubscribers.forEach((callback) => callback(access_token));
            this.refreshSubscribers = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout user
            useAuthStore.getState().clearTokens();
            useUIStore.getState().showToast({
              type: 'error',
              message: 'Session expired. Please log in again.',
            });
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle 429 Rate Limit
        if (error.response?.status === 429) {
          useUIStore.getState().showToast({
            type: 'warning',
            message: 'Too many requests. Please slow down.',
          });
        }

        // Handle network errors
        if (!error.response) {
          useUIStore.getState().showToast({
            type: 'error',
            message: 'Network error. Please check your connection.',
          });
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: AxiosError): { message: string; status?: number; errors?: any } {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data?.error?.message || data?.message || 'An error occurred',
        status: error.response.status,
        errors: data?.errors,
      };
    }
    return { message: error.message || 'Network error' };
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (MOCK_MODE) {
      console.log('[MOCK] GET:', url);
      return {} as T;
    }
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (MOCK_MODE) {
      console.log('[MOCK] POST:', url, data);
      return {} as T;
    }
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (MOCK_MODE) {
      console.log('[MOCK] PUT:', url, data);
      return {} as T;
    }
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (MOCK_MODE) {
      console.log('[MOCK] PATCH:', url, data);
      return {} as T;
    }
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (MOCK_MODE) {
      console.log('[MOCK] DELETE:', url);
      return {} as T;
    }
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
