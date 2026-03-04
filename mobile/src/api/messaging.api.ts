import { apiClient } from './client';
import type { Conversation, Message } from '../types';

export const messagingAPI = {
  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    return apiClient.get('/conversations');
  },

  getConversationById: async (id: string): Promise<{ conversation: Conversation }> => {
    return apiClient.get(`/conversations/${id}`);
  },

  getMessages: async (
    conversationId: string,
    before?: string
  ): Promise<{ messages: Message[] }> => {
    const params = before ? `?before=${before}&limit=30` : '?limit=30';
    return apiClient.get(`/conversations/${conversationId}/messages${params}`);
  },

  sendMessage: async (conversationId: string, body: string): Promise<{ message: Message }> => {
    return apiClient.post(`/conversations/${conversationId}/messages`, { body });
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    return apiClient.patch(`/conversations/${conversationId}/read`);
  },

  openConversation: async (
    jobId: string,
    customerId: string
  ): Promise<{ conversation: Conversation }> => {
    return apiClient.post('/conversations', { job_id: jobId, customer_id: customerId });
  },
};
