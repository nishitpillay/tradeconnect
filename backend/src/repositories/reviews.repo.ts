import { db } from '../config/database';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Review {
  id:                    string;
  job_id:                string;
  quote_id:              string | null;
  reviewer_id:           string;
  reviewee_id:           string;
  rating:                number;
  rating_quality:        number | null;
  rating_timeliness:     number | null;
  rating_communication:  number | null;
  rating_value:          number | null;
  body:                  string | null;
  provider_response:     string | null;
  provider_responded_at: Date | null;
  is_verified:           boolean;
  is_flagged:            boolean;
  is_hidden:             boolean;
  created_at:            Date;
  updated_at:            Date;
}

export interface CreateReviewInput {
  job_id:                string;
  quote_id:              string | null;
  reviewer_id:           string;
  reviewee_id:           string;
  rating:                number;
  rating_quality?:       number;
  rating_timeliness?:    number;
  rating_communication?: number;
  rating_value?:         number;
  body?:                 string;
}

interface ReviewCursor {
  created_at: string;
  id:         string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findReviewById(id: string): Promise<Review | null> {
  const { rows } = await db.query<Review>(
    'SELECT * FROM reviews WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function findReviewsByJob(jobId: string): Promise<Review[]> {
  const { rows } = await db.query<Review>(
    `SELECT * FROM reviews
     WHERE job_id = $1 AND is_hidden = FALSE
     ORDER BY created_at ASC`,
    [jobId]
  );
  return rows;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { rows } = await db.query<Review>(
    `INSERT INTO reviews
       (job_id, quote_id, reviewer_id, reviewee_id,
        rating, rating_quality, rating_timeliness, rating_communication, rating_value,
        body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.job_id,
      input.quote_id,
      input.reviewer_id,
      input.reviewee_id,
      input.rating,
      input.rating_quality       ?? null,
      input.rating_timeliness    ?? null,
      input.rating_communication ?? null,
      input.rating_value         ?? null,
      input.body                 ?? null,
    ]
  );
  return rows[0];
}

export async function findReviewsByProvider(
  providerId: string,
  cursor?: string,
  limit = 20
): Promise<{ reviews: Review[]; nextCursor: string | null }> {
  const pageSize = Math.min(limit, 50);
  const conditions: string[] = [
    'reviewee_id = $1',
    'is_hidden = FALSE',
  ];
  const values: (string | number)[] = [providerId];
  let idx = 2;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        `(created_at < $${idx++} OR (created_at = $${idx++} AND id > $${idx++}))`
      );
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  const where = conditions.join(' AND ');
  const { rows } = await db.query<Review>(
    `SELECT * FROM reviews
     WHERE ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const reviews = hasMore ? rows.slice(0, pageSize) : rows;
  const last = reviews[reviews.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;

  return { reviews, nextCursor };
}

export async function setProviderResponse(
  reviewId: string,
  response: string
): Promise<Review> {
  const { rows } = await db.query<Review>(
    `UPDATE reviews
     SET provider_response = $1, provider_responded_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [response, reviewId]
  );
  return rows[0];
}

export async function hideReview(reviewId: string): Promise<Review> {
  const { rows } = await db.query<Review>(
    `UPDATE reviews SET is_hidden = TRUE WHERE id = $1 RETURNING *`,
    [reviewId]
  );
  return rows[0];
}

// ── Cursor Helpers ────────────────────────────────────────────────────────────

function encodeCursor(cursor: ReviewCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): ReviewCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as ReviewCursor;
  } catch {
    return null;
  }
}
