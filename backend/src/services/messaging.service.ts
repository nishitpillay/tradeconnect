import * as messagingRepo from '../repositories/messaging.repo';
import type { Conversation, Message } from '../repositories/messaging.repo';
import { findJobById } from '../repositories/job.repo';
import { findPrimaryActiveAdmin } from '../repositories/user.repo';
import { Errors } from '../middleware/errors';
import { getIo } from '../config/socket';
import { notify } from './notification.service';
import {
  conversationRoom,
  LEGACY_SOCKET_EVENTS,
  SOCKET_EVENTS,
  userRoom,
} from '../realtime/socket.events';

const PII_PATTERNS = [
  /\b04\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/,
  /\b0[2-9]\d{8}\b/,
  /\b1[38]00[\s.-]?\d{3}[\s.-]?\d{3}\b/,
  /[\w.+]+@[\w.-]+\.[a-z]{2,}\b/i,
];

const PROFANITY_PATTERNS = [
  /\bfuck(?:ing|ed|er)?\b/i,
  /\bshit(?:ty)?\b/i,
  /\bbitch(?:es)?\b/i,
  /\bcunt(?:s)?\b/i,
  /\basshole(?:s)?\b/i,
  /\bbastard(?:s)?\b/i,
  /\bdickhead(?:s)?\b/i,
  /\bmotherfucker(?:s)?\b/i,
];

function containsPii(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}

function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some((re) => re.test(text));
}

const OPEN_JOB_STATUSES = new Set(['posted', 'quoting', 'awarded', 'in_progress']);

export interface SendMessageInput {
  message_type?: 'text' | 'voice';
  body?: string;
  attachment_url?: string;
  attachment_mime?: string;
}

export async function openConversation(
  providerId: string,
  jobId: string,
  customerId: string
): Promise<Conversation> {
  const job = await findJobById(jobId);
  if (!job) throw Errors.notFound('Job');

  if (!OPEN_JOB_STATUSES.has(job.status)) {
    throw Errors.badRequest(
      `Cannot start a conversation on a job with status '${job.status}'.`
    );
  }

  if (job.customer_id !== customerId) {
    throw Errors.badRequest('customer_id does not match the job owner.');
  }

  const existing = await messagingRepo.findConversationByParticipants(
    jobId, customerId, providerId
  );
  if (existing) return existing;

  return messagingRepo.createConversation({
    job_id: jobId,
    customer_id: customerId,
    provider_id: providerId,
  });
}

export async function openAdminSupportConversation(requesterUserId: string): Promise<Conversation> {
  const adminUser = await findPrimaryActiveAdmin(requesterUserId);
  if (!adminUser) {
    throw Errors.badRequest('No active TradeConnect Admin team member is available.');
  }

  const existing = await messagingRepo.findAdminSupportConversation(requesterUserId, adminUser.id);
  if (existing) return existing;

  return messagingRepo.createConversation({
    job_id: null,
    conversation_type: 'admin_support',
    customer_id: requesterUserId,
    provider_id: adminUser.id,
  });
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput
): Promise<Message> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  const isCustomer = conversation.customer_id === userId;
  const isProvider = conversation.provider_id === userId;
  const isParticipant = isCustomer || isProvider;
  if (!isParticipant) throw Errors.forbidden();

  const messageType = input.message_type ?? 'text';
  const body = input.body?.trim();
  const attachmentUrl = input.attachment_url ?? null;
  const attachmentMime = input.attachment_mime ?? null;

  if (messageType === 'voice') {
    if (!attachmentUrl || !attachmentMime || !attachmentMime.toLowerCase().startsWith('audio/')) {
      throw Errors.badRequest('Voice message requires audio attachment_url and attachment_mime.');
    }
  } else {
    if (!body) throw Errors.badRequest('Message body is required.');

    if (containsProfanity(body)) {
      throw Errors.badRequest('Message blocked: inappropriate language is not allowed.');
    }

    if (containsPii(body)) {
      messagingRepo.upsertPiiViolation(userId).catch((err: Error) => {
        console.error('[Messaging] PII violation upsert failed:', err.message);
      });
      throw Errors.badRequest('Message blocked: contains contact information');
    }
  }

  const message = await messagingRepo.createMessage({
    conversation_id: conversationId,
    sender_id: userId,
    message_type: messageType,
    body: body ?? null,
    attachment_url: attachmentUrl,
    attachment_mime: attachmentMime,
  });

  const recipientId = isCustomer ? conversation.provider_id : conversation.customer_id;

  const io = getIo();
  if (io) {
    const eventPayload = {
      conversationId,
      messageId: message.id,
      messageType: message.message_type,
      createdAt: message.created_at.toISOString(),
    };

    io.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.messageCreated, eventPayload);
    io.to(userRoom(recipientId)).emit(SOCKET_EVENTS.messageCreated, eventPayload);

    // Temporary legacy events; remove after all clients are migrated.
    io.to(conversationRoom(conversationId)).emit(LEGACY_SOCKET_EVENTS.messageCreated, { message });
    io.to(userRoom(recipientId)).emit(LEGACY_SOCKET_EVENTS.messageCreated, { conversationId, message });
  }

  notify({
    userId: recipientId,
    type: 'new_message',
    channel: 'in_app',
    title: 'New message',
    body: messageType === 'voice'
      ? 'Sent a voice recording'
      : (body!.length > 100 ? `${body!.slice(0, 97)}...` : body!),
    data: { conversationId },
  });

  return message;
}

export async function listConversations(userId: string, userRole: string): Promise<Conversation[]> {
  if (userRole === 'admin') {
    return messagingRepo.listAllConversations();
  }
  return messagingRepo.listConversations(userId);
}

export async function getConversation(
  userId: string,
  userRole: string,
  conversationId: string
): Promise<Conversation> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  if (userRole === 'admin') return conversation;

  const isParticipant =
    conversation.customer_id === userId || conversation.provider_id === userId;
  if (!isParticipant) throw Errors.forbidden();

  return conversation;
}

export async function getMessages(
  userId: string,
  userRole: string,
  conversationId: string,
  before?: string,
  limit?: number
): Promise<Message[]> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  if (userRole === 'admin') {
    return messagingRepo.listMessages(conversationId, before, limit);
  }

  const isParticipant =
    conversation.customer_id === userId || conversation.provider_id === userId;
  if (!isParticipant) throw Errors.forbidden();

  return messagingRepo.listMessages(conversationId, before, limit);
}

export async function markAsRead(
  userId: string,
  userRole: string,
  conversationId: string
): Promise<void> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  if (userRole === 'admin' && conversation.provider_id !== userId && conversation.customer_id !== userId) {
    return;
  }

  if (conversation.customer_id === userId) {
    await messagingRepo.markAsRead(conversationId, 'customer');
  } else if (conversation.provider_id === userId) {
    await messagingRepo.markAsRead(conversationId, 'provider');
  } else {
    throw Errors.forbidden();
  }
}

export async function deleteMessage(
  userId: string,
  userRole: string,
  conversationId: string,
  messageId: string
): Promise<Message> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  const message = await messagingRepo.findMessageById(messageId);
  if (!message || message.conversation_id !== conversationId) {
    throw Errors.notFound('Message');
  }

  if (message.is_deleted) throw Errors.notFound('Message');

  const isSender = message.sender_id === userId;
  const isAdmin = userRole === 'admin';
  if (!isSender && !isAdmin) throw Errors.forbidden();

  const deleted = await messagingRepo.softDeleteMessage(messageId, userId);

  const io = getIo();
  if (io) {
    const eventPayload = {
      conversationId,
      messageId,
      deletedAt: deleted.deleted_at?.toISOString() ?? new Date().toISOString(),
    };
    io.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.messageDeleted, eventPayload);
    io.to(conversationRoom(conversationId)).emit(LEGACY_SOCKET_EVENTS.messageDeleted, { messageId });
  }

  return deleted;
}
