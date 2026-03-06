/**
 * Query-path indexes for feed, messaging, and reviews.
 * All indexes are idempotent.
 */

exports.up = async function up(knex) {
  // Jobs feed: posted/quoting ordered by recency and filtered by category/state.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_feed_status_published_hardening
      ON jobs(status, published_at DESC)
      WHERE status IN ('posted', 'quoting') AND is_flagged = FALSE;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_feed_category_state_hardening
      ON jobs(category_id, state, published_at DESC)
      WHERE status IN ('posted', 'quoting') AND is_flagged = FALSE;
  `);

  // Messaging: recent message retrieval in conversation thread.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_recent_hardening
      ON messages(conversation_id, created_at DESC)
      WHERE is_deleted = FALSE;
  `);

  // Messaging inbox: active conversation list by last message.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_conversations_inbox_customer_hardening
      ON conversations(customer_id, last_message_at DESC)
      WHERE is_archived = FALSE;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_conversations_inbox_provider_hardening
      ON conversations(provider_id, last_message_at DESC)
      WHERE is_archived = FALSE;
  `);

  // Reviews: provider profile review lookup and sort.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_recent_rating_hardening
      ON reviews(reviewee_id, created_at DESC, rating DESC)
      WHERE is_hidden = FALSE;
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_reviews_reviewee_recent_rating_hardening;');
  await knex.raw('DROP INDEX IF EXISTS idx_conversations_inbox_provider_hardening;');
  await knex.raw('DROP INDEX IF EXISTS idx_conversations_inbox_customer_hardening;');
  await knex.raw('DROP INDEX IF EXISTS idx_messages_conversation_recent_hardening;');
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_feed_category_state_hardening;');
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_feed_status_published_hardening;');
};
