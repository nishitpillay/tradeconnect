import { apiClient } from './client';
import type { SubmitQuoteInput } from '@tradeconnect/shared';
import type { Quote } from '../types';

export const quotesAPI = {
  // Customer: list all quotes for a job
  getQuotesForJob: async (jobId: string): Promise<{ quotes: Quote[] }> => {
    return apiClient.get(`/jobs/${jobId}/quotes`);
  },

  // Provider: list own quotes
  getMyQuotes: async (status?: string): Promise<{ quotes: Quote[] }> => {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`/quotes/my-quotes${params}`);
  },

  getQuoteById: async (id: string): Promise<{ quote: Quote }> => {
    return apiClient.get(`/quotes/${id}`);
  },

  // Provider: submit quote on a specific job (prices in AUD cents)
  submitQuote: async (jobId: string, data: SubmitQuoteInput): Promise<{ quote: Quote }> => {
    return apiClient.post(`/jobs/${jobId}/quotes`, data);
  },

  // Provider: withdraw a quote
  withdrawQuote: async (jobId: string, quoteId: string): Promise<void> => {
    return apiClient.delete(`/jobs/${jobId}/quotes/${quoteId}`);
  },

  // Provider: accept the job after their quote was awarded
  acceptJob: async (jobId: string): Promise<void> => {
    return apiClient.post(`/jobs/${jobId}/accept`);
  },

  // Customer: shortlist or reject a specific quote
  quoteAction: async (jobId: string, quoteId: string, action: 'shortlisted' | 'rejected'): Promise<{ quote: Quote }> => {
    return apiClient.patch(`/jobs/${jobId}/quotes/${quoteId}`, { action });
  },
};
