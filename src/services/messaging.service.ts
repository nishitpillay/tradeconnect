/**
 * Messaging Service
 *
 * Business logic for conversations and messages.
 *
 * Key rules:
 *   - Providers can open a conversation on any posted/quoting/awarded/in_progress job
 *   - Customers can only reply to conversations already opened by a provider
 *   - One conversation per (job_id, customer_id, provider_id) — DB enforced
 *   - PII in message bodies is blocked (400) and counted against the sender
 *   - Messages are broadcast via Socket.IO to conversation + recipient rooms
 */

import * as messagingRepo from '../repositories/messaging.repo';
import type { Conversation, Message } from '../repositories/messaging.repo';
import { findJobById } from '../repositories/job.repo';
import { Errors } from '../middleware/errors';
import { getIo } from '../config/socket';
import { notify } from './notification.service';

// ── PII detection ─────────────────────────────────────────────────────────────

const PII_PATTERNS = [
  /\b04\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/,       // AU mobile
  /\b0[2-9]\d{8}\b/,                              // AU landline
  /\b1[38]00[\s.-]?\d{3}[\s.-]?\d{3}\b/,        // AU freecall
  /[\w.+]+@[\w.-]+\.[a-z]{2,}\b/i,               // email address
];

function containsPii(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}

// ── Business logic ────────────────────────────────────────────────────────────

const OPEN_JOB_STATUSES = new Set(['posted', 'quoting', 'awarded', 'in_progress']);

/**
 * Provider opens (or retrieves existing) conversation on a job.
 */
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

  // Upsert: return existing conversation or create a new one
  const existing = await messagingRepo.findConversationByParticipants(
    jobId, customerId, providerId
  );
  if (existing) return existing;

  return messagingRepo.createConversation({ job_id: jobId, customer_id: customerId, provider_id: providerId });
}

/**
 * Send a message. Runs PII scan; blocks and records violations.
 */
export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string
): Promise<Message> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  const isCustomer  = conversation.customer_id === userId;
  const isProvider  = conversation.provider_id === userId;
  if (!isCustomer && !isProvider) throw Errors.forbidden();

  // PII scan
  if (containsPii(body)) {
    // Fire-and-forget — violation tracking should not block response
    messagingRepo.upsertPiiViolation(userId).catch((err: Error) => {
      console.error('[Messaging] PII violation upsert failed:', err.message);
    });
    throw Errors.badRequest('Message blocked: contains contact information');
  }

  const message = await messagingRepo.createMessage({
    conversation_id: conversationId,
    sender_id: userId,
    body,
  });

  // Determine recipient
  const recipientId = isCustomer ? conversation.provider_id : conversation.customer_id;

  // Real-time emit (best-effort)
  const io = getIo();
  if (io) {
    io.to(`conversation:${conversationId}`).emit('new_message', { message });
    io.to(`user:${recipientId}`).emit('new_message', { conversationId, message });
  }

  // Notification (fire-and-forget)
  notify({
    userId: recipientId,
    type:    'new_message',
    channel: 'in_app',
    title:   'New message',
    body:    body.length > 100 ? `${body.slice(0, 97)}…` : body,
    data:    { conversationId },
  });

  return message;
}

/**
 * List all conversations for the authenticated user.
 */
export async function listConversations(userId: string): Promise<Conversation[]> {
  return messagingRepo.listConversations(userId);
}

/**
 * Get a single conversation (participant only).
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  const isParticipant =
    conversation.customer_id === userId || conversation.provider_id === userId;
  if (!isParticipant) throw Errors.forbidden();

  return conversation;
}

/**
 * List messages in a conversation (paginated, oldest-first).
 */
export async function getMessages(
  userId: string,
  conversationId: string,
  before?: string,
  limit?: number
): Promise<Message[]> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  const isParticipant =
    conversation.customer_id === userId || conversation.provider_id === userId;
  if (!isParticipant) throw Errors.forbidden();

  return messagingRepo.listMessages(conversationId, before, limit);
}

/**
 * Mark conversation as read (reset own unread count to 0).
 */
export async function markAsRead(
  userId: string,
  conversationId: string
): Promise<void> {
  const conversation = await messagingRepo.findConversationById(conversationId);
  if (!conversation) throw Errors.notFound('Conversation');

  if (conversation.customer_id === userId) {
    await messagingRepo.markAsRead(conversationId, 'customer');
  } else if (conversation.provider_id === userId) {
    await messagingRepo.markAsRead(conversationId, 'provider');
  } else {
    throw Errors.forbidden();
  }
}

/**
 * Soft-delete a message (sender or admin only).
 */
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
  const isAdmin  = userRole === 'admin';
  if (!isSender && !isAdmin) throw Errors.forbidden();

  const deleted = await messagingRepo.softDeleteMessage(messageId, userId);

  // Notify room of deletion
  const io = getIo();
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message_deleted', { messageId });
  }

  return deleted;
}
