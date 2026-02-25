import { db } from '../config/database';

type TargetType = 'user' | 'job' | 'quote' | 'message' | 'document' | 'notification';

interface WriteLogOptions {
  action: string;
  actorId?: string;
  targetType?: TargetType;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry.
 * Fire-and-forget — errors are caught and logged but never thrown.
 * Callers must NOT await this unless they explicitly need confirmation.
 */
export function writeLog(opts: WriteLogOptions): void {
  db.query(
    `INSERT INTO audit_logs
       (action, actor_id, target_type, target_id, before_state, after_state, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      opts.action,
      opts.actorId ?? null,
      opts.targetType ?? null,
      opts.targetId ?? null,
      opts.before ? JSON.stringify(opts.before) : null,
      opts.after ? JSON.stringify(opts.after) : null,
      opts.ipAddress ?? null,
      opts.userAgent ?? null,
    ]
  ).catch((err: Error) => {
    // Never throw — audit log must not break application flow
    console.error('[Audit] Failed to write log:', err.message, { action: opts.action });
  });
}

/** Awaitable version for cases where you need confirmation (e.g. tests). */
export async function writeLogAsync(opts: WriteLogOptions): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs
       (action, actor_id, target_type, target_id, before_state, after_state, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      opts.action,
      opts.actorId ?? null,
      opts.targetType ?? null,
      opts.targetId ?? null,
      opts.before ? JSON.stringify(opts.before) : null,
      opts.after ? JSON.stringify(opts.after) : null,
      opts.ipAddress ?? null,
      opts.userAgent ?? null,
    ]
  );
}
