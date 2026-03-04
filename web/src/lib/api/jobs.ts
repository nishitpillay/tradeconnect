import { apiClient } from './client';
import { Job } from '@/types';
import type { CreateJobInput } from '@tradeconnect/shared/schemas/job.schema';

function normalizeJob(job: Job): Job {
  const location = [job.suburb, job.state, job.postcode].filter(Boolean).join(' ');
  const budgetRange =
    job.budget_min != null && job.budget_max != null
      ? `$${Math.round(job.budget_min / 100).toLocaleString('en-AU')} - $${Math.round(job.budget_max / 100).toLocaleString('en-AU')}`
      : null;

  return {
    ...job,
    approximate_address: job.approximate_address ?? location,
    budget_range: job.budget_range ?? budgetRange,
    preferred_date: job.preferred_date ?? job.preferred_start_date,
  };
}

export const jobsAPI = {
  // Customer endpoints
  async getMyJobs(status?: string): Promise<{ jobs: Job[]; nextCursor: string | null }> {
    const params = status ? { status } : {};
    return apiClient.get<{ jobs: Job[]; nextCursor: string | null }>('/jobs', { params });
  },

  async createJob(data: CreateJobInput): Promise<Job> {
    const res = await apiClient.post<{ job: Job }>('/jobs', data);
    return normalizeJob(res.job);
  },

  async getJobById(id: string): Promise<Job> {
    const res = await apiClient.get<{ job: Job }>(`/jobs/${id}`);
    return normalizeJob(res.job);
  },

  async updateJob(id: string, data: Partial<CreateJobInput>): Promise<Job> {
    const res = await apiClient.patch<{ job: Job }>(`/jobs/${id}`, data);
    return normalizeJob(res.job);
  },

  async deleteJob(id: string): Promise<void> {
    return apiClient.delete<void>(`/jobs/${id}`);
  },

  async publishJob(id: string): Promise<Job> {
    const res = await apiClient.post<{ job: Job }>(`/jobs/${id}/publish`);
    return normalizeJob(res.job);
  },

  async cancelJob(id: string): Promise<Job> {
    const res = await apiClient.post<{ job: Job }>(`/jobs/${id}/cancel`);
    return normalizeJob(res.job);
  },

  async awardJob(id: string, quoteId: string): Promise<Job> {
    const res = await apiClient.post<{ job: Job }>(`/jobs/${id}/award`, { quote_id: quoteId });
    return normalizeJob(res.job);
  },

  async completeJob(id: string): Promise<Job> {
    const res = await apiClient.post<{ job: Job }>(`/jobs/${id}/complete`);
    return normalizeJob(res.job);
  },

  // Provider endpoints
  async getFeed(params: {
    cursor?: string;
    limit?: number;
    category_id?: string;
    state?: string;
    radius_km?: number;
    urgency?: string;
    budget_min?: number;
    budget_max?: number;
    sort?: 'recommended' | 'newest' | 'budget_high' | 'budget_low' | 'distance';
  }): Promise<{ jobs: Job[]; nextCursor: string | null }> {
    return apiClient.get<{ jobs: Job[]; nextCursor: string | null }>('/jobs/feed', { params });
  },

};
