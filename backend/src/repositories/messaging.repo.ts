import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { db } from '../config/database';
import { env } from '../config/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  job_id: string | null;
  conversation_type: 'job' | 'admin_support';
  customer_id: string;
  provider_id: string;
  quote_id: string | null;
  last_message_at: Date | null;
  customer_unread: number;
  provider_unread: number;
  is_archived: boolean;
  created_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  body: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  deleted_by: string | null;
  pii_detected: boolean;
  pii_blocked: boolean;
  is_flagged: boolean;
  read_by_recipient_at: Date | null;
  created_at: Date;
}

export interface CreateConversationInput {
  job_id: string | null;
  conversation_type?: 'job' | 'admin_support';
  customer_id: string;
  provider_id: string;
}

export interface CreateMessageInput {
  conversation_id: string;
  sender_id: string;
  message_type?: 'text' | 'voice';
  body?: string | null;
  attachment_url?: string | null;
  attachment_mime?: string | null;
  pii_detected?: boolean;
  pii_blocked?: boolean;
}

// Allows passing either a PoolClient (for transactions) or the db pool wrapper
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

// ── Conversations ─────────────────────────────────────────────────────────────

export async function findConversationById(id: string): Promise<Conversation | null> {
  const { rows } = await db.query<Conversation>(
    'SELECT * FROM conversations WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function isConversationParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1
     FROM conversations
     WHERE id = $1
       AND (customer_id = $2 OR provider_id = $2)
     LIMIT 1`,
    [conversationId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function findConversationByParticipants(
  jobId: string,
  customerId: string,
  providerId: string
): Promise<Conversation | null> {
  const { rows } = await db.query<Conversation>(
    `SELECT * FROM conversations
     WHERE job_id = $1 AND customer_id = $2 AND provider_id = $3`,
    [jobId, customerId, providerId]
  );
  return rows[0] ?? null;
}

export async function findAdminSupportConversation(
  customerId: string,
  adminUserId: string
): Promise<Conversation | null> {
  const { rows } = await db.query<Conversation>(
    `SELECT *
     FROM conversations
     WHERE conversation_type = 'admin_support'
       AND customer_id = $1
       AND provider_id = $2`,
    [customerId, adminUserId]
  );
  return rows[0] ?? null;
}

export async function createConversation(
  input: CreateConversationInput,
  client?: PoolClient
): Promise<Conversation> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<Conversation>(
    `INSERT INTO conversations (job_id, customer_id, provider_id, conversation_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.job_id, input.customer_id, input.provider_id, input.conversation_type ?? 'job']
  );
  return rows[0];
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const { rows } = await db.query<Conversation>(
    `SELECT * FROM conversations
     WHERE (customer_id = $1 OR provider_id = $1)
       AND is_archived = FALSE
     ORDER BY last_message_at DESC NULLS LAST, created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllConversations(): Promise<Conversation[]> {
  const { rows } = await db.query<Conversation>(
    `SELECT *
     FROM conversations
     WHERE is_archived = FALSE
     ORDER BY last_message_at DESC NULLS LAST, created_at DESC`
  );
  return rows;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function createMessage(
  input: CreateMessageInput,
  client?: PoolClient
): Promise<Message> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<Message>(
    `INSERT INTO messages (
      conversation_id, sender_id, message_type, body, attachment_url, attachment_mime, pii_detected, pii_blocked
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.conversation_id,
      input.sender_id,
      input.message_type ?? 'text',
      input.body,
      input.attachment_url ?? null,
      input.attachment_mime ?? null,
      input.pii_detected ?? false,
      input.pii_blocked ?? false,
    ]
  );
  return rows[0];
}

export async function listMessages(
  conversationId: string,
  before?: string,
  limit = 30
): Promise<Message[]> {
  if (before) {
    const { rows } = await db.query<Message>(
      `SELECT * FROM messages
       WHERE conversation_id = $1
         AND is_deleted = FALSE
         AND created_at < (SELECT created_at FROM messages WHERE id = $2)
       ORDER BY created_at ASC
       LIMIT $3`,
      [conversationId, before, limit]
    );
    return rows;
  }

  const { rows } = await db.query<Message>(
    `SELECT * FROM messages
     WHERE conversation_id = $1
       AND is_deleted = FALSE
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  );
  return rows;
}

export async function findMessageById(id: string): Promise<Message | null> {
  const { rows } = await db.query<Message>(
    'SELECT * FROM messages WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function softDeleteMessage(id: string, deletedBy: string): Promise<Message> {
  const { rows } = await db.query<Message>(
    `UPDATE messages
     SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2
     WHERE id = $1
     RETURNING *`,
    [id, deletedBy]
  );
  return rows[0];
}

export async function markAsRead(
  conversationId: string,
  role: 'customer' | 'provider'
): Promise<void> {
  const col = role === 'customer' ? 'customer_unread' : 'provider_unread';
  await db.query(
    `UPDATE conversations SET ${col} = 0 WHERE id = $1`,
    [conversationId]
  );
}

// ── PII ───────────────────────────────────────────────────────────────────────

export async function upsertPiiViolation(
  userId: string
): Promise<{ count: number; auto_flagged: boolean }> {
  const threshold = env.PII_VIOLATIONS_BEFORE_FLAG;
  const { rows } = await db.query<{ count: number; auto_flagged: boolean }>(
    `INSERT INTO pii_violations (user_id, count, last_at, auto_flagged)
     VALUES ($1, 1, NOW(), FALSE)
     ON CONFLICT (user_id) DO UPDATE
       SET count        = pii_violations.count + 1,
           last_at      = NOW(),
           auto_flagged = CASE
             WHEN pii_violations.count + 1 >= $2 THEN TRUE
             ELSE pii_violations.auto_flagged
           END,
           updated_at   = NOW()
     RETURNING count, auto_flagged`,
    [userId, threshold]
  );
  return rows[0];
}
