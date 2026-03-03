import { apiClient } from './client';
import type { SubmitQuoteInput } from '@tradeconnect/shared/schemas/quote.schema';
import { Quote } from '@/types';

export const quotesAPI = {
  // Provider: submit a quote on a specific job (prices in AUD cents)
  async submitQuote(jobId: string, data: SubmitQuoteInput): Promise<Quote> {
    const res = await apiClient.post<{ quote: Quote }>(`/jobs/${jobId}/quotes`, data);
    return res.quote;
  },

  // Provider: list own quotes
  async getMyQuotes(status?: string): Promise<Quote[]> {
    const params = status ? { status } : {};
    return apiClient.get<Quote[]>('/quotes/my-quotes', { params });
  },

  async getQuoteById(id: string): Promise<Quote> {
    return apiClient.get<Quote>(`/quotes/${id}`);
  },

  // Provider: withdraw a quote
  async withdrawQuote(jobId: string, quoteId: string): Promise<void> {
    return apiClient.delete<void>(`/jobs/${jobId}/quotes/${quoteId}`);
  },

  // Provider: accept the job after their quote was awarded
  async acceptJob(jobId: string): Promise<void> {
    return apiClient.post<void>(`/jobs/${jobId}/accept`);
  },

  // Customer: list all quotes for a job
  async getQuotesForJob(jobId: string): Promise<Quote[]> {
    const res = await apiClient.get<{ quotes: Quote[] }>(`/jobs/${jobId}/quotes`);
    return res.quotes;
  },

  // Customer: shortlist or reject a specific quote
  async quoteAction(jobId: string, quoteId: string, action: 'shortlisted' | 'rejected'): Promise<Quote> {
    const res = await apiClient.patch<{ quote: Quote }>(`/jobs/${jobId}/quotes/${quoteId}`, { action });
    return res.quote;
  },
};
