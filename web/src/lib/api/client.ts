import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { APIError } from '@/types';

class APIClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    console.log("[API Client] Base URL:", process.env.NEXT_PUBLIC_API_BASE_URL);
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for sending cookies (refresh token)
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach access token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useAuthStore.getState();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Refresh the token
            const newAccessToken = await this.refreshAccessToken();

            // Update the original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            // Retry the original request
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Send refresh token cookie
        );

        const { access_token } = response.data;
        useAuthStore.getState().setAccessToken(access_token);

        return access_token;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private normalizeError(error: AxiosError): APIError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data?.error?.message || data?.message || 'An error occurred',
        code: data?.error?.code || data?.code,
        statusCode: error.response.status,
      };
    }

    if (error.request) {
      return {
        message: 'No response from server. Please check your connection.',
        statusCode: 0,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 0,
    };
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
