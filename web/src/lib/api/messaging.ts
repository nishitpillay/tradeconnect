import { apiClient } from './client';
import type { Conversation, Message } from '@/types';

export type SendMessagePayload =
  | { body: string; message_type?: 'text' }
  | { message_type: 'voice'; attachment_url: string; attachment_mime: string; body?: string };

export const messagingAPI = {
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get<{ conversations: Conversation[] }>('/conversations');
    return res.conversations;
  },

  async getConversationById(id: string): Promise<Conversation> {
    const res = await apiClient.get<{ conversation: Conversation }>(`/conversations/${id}`);
    return res.conversation;
  },

  async getMessages(conversationId: string, before?: string, limit?: number): Promise<Message[]> {
    const params: Record<string, string | number> = {};
    if (before) params.before = before;
    if (limit) params.limit = limit;
    const res = await apiClient.get<{ messages: Message[] }>(
      `/conversations/${conversationId}/messages`,
      { params }
    );
    return res.messages;
  },

  async sendMessage(conversationId: string, payload: string | SendMessagePayload): Promise<Message> {
    const body =
      typeof payload === 'string'
        ? { body: payload }
        : payload;
    const res = await apiClient.post<{ message: Message }>(
      `/conversations/${conversationId}/messages`,
      body
    );
    return res.message;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.patch<{ ok: boolean }>(`/conversations/${conversationId}/read`);
  },

  async openConversation(jobId: string, customerId: string): Promise<Conversation> {
    const res = await apiClient.post<{ conversation: Conversation }>('/conversations', {
      job_id: jobId,
      customer_id: customerId,
    });
    return res.conversation;
  },

  async openAdminSupportConversation(): Promise<Conversation> {
    const res = await apiClient.post<{ conversation: Conversation }>('/conversations/admin-support', {});
    return res.conversation;
  },
};
