import { apiClient } from './client';
import type { CreateJobInput } from '@tradeconnect/shared';
import type { Job, JobFeedResponse } from '../types';

interface JobFeedQuery {
  category_id?: string;
  state?: string;
  postcode?: string;
  radius_km?: number;
  urgency?: string[];
  budget_min?: number;
  budget_max?: number;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export const jobsAPI = {
  getFeed: async (query: JobFeedQuery): Promise<JobFeedResponse> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    return apiClient.get(`/jobs/feed?${params.toString()}`);
  },

  getMyJobs: async (status?: string): Promise<{ jobs: Job[]; nextCursor: string | null }> => {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`/jobs/${params}`);
  },

  getJobById: async (id: string): Promise<{ job: Job }> => {
    return apiClient.get(`/jobs/${id}`);
  },

  createJob: async (data: CreateJobInput): Promise<{ job: Job }> => {
    return apiClient.post('/jobs', data);
  },

  updateJob: async (id: string, data: Partial<CreateJobInput>): Promise<{ job: Job }> => {
    return apiClient.patch(`/jobs/${id}`, data);
  },

  publishJob: async (id: string): Promise<{ job: Job }> => {
    return apiClient.post(`/jobs/${id}/publish`);
  },

  cancelJob: async (id: string, reason?: string): Promise<{ job: Job }> => {
    return apiClient.post(`/jobs/${id}/cancel`, { cancellation_reason: reason });
  },

  awardJob: async (jobId: string, quoteId: string): Promise<{ job: Job }> => {
    return apiClient.post(`/jobs/${jobId}/award`, { quote_id: quoteId });
  },

  completeJob: async (id: string): Promise<{ job: Job }> => {
    return apiClient.post(`/jobs/${id}/complete`);
  },
};
