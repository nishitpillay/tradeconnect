/**
 * S3 Client Configuration
 *
 * Initialises an S3Client using environment variables.
 * S3_ENDPOINT is optional — set it to a LocalStack URL for local development.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

// ── Client ────────────────────────────────────────────────────────────────────

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
});

// ── Presigned URL ─────────────────────────────────────────────────────────────

/**
 * Generate a presigned S3 PUT URL for direct client uploads.
 *
 * @param s3Key    - The full S3 object key (e.g. `verifications/{uid}/{type}/{uuid}.pdf`)
 * @param fileMime - MIME type of the file being uploaded (validated by caller)
 * @returns        - Presigned URL valid for S3_PRESIGN_EXPIRY_SECONDS seconds
 */
export async function generatePresignedPutUrl(
  s3Key: string,
  fileMime: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      env.S3_BUCKET_NAME,
    Key:         s3Key,
    ContentType: fileMime,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: env.S3_PRESIGN_EXPIRY_SECONDS,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a MIME type to a file extension. */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg':       'jpg',
    'image/png':        'png',
    'image/webp':       'webp',
    'application/pdf':  'pdf',
  };
  return map[mime] ?? 'bin';
}

/** Build a CDN URL from an S3 key. */
export function buildCdnUrl(s3Key: string): string {
  return `${env.CDN_BASE_URL}/${s3Key}`;
}
