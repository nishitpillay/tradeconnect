import { randomUUID } from 'crypto';
import { Errors, AppError } from '../middleware/errors';
import { notify } from './notification.service';
import { writeLog } from './audit.service';
import { generatePresignedPutUrl, mimeToExt, buildCdnUrl } from '../config/s3';
import * as verificationsRepo from '../repositories/verifications.repo';
import * as userRepo from '../repositories/user.repo';
import * as profileRepo from '../repositories/profile.repo';
import type { Verification } from '../repositories/verifications.repo';
import type {
  UploadUrlInput,
  SubmitVerificationInput,
  ReviewVerificationInput,
  ListVerificationsQuery,
} from '../schemas/verifications.schema';
import { env } from '../config/env';

// ── Map verification type to provider flag field ──────────────────────────────

const TYPE_TO_FLAG: Record<string, keyof {
  identity_verified: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  abn_verified: boolean;
}> = {
  identity:      'identity_verified',
  trade_license: 'license_verified',
  insurance:     'insurance_verified',
  abn:           'abn_verified',
};

// ── Get Presigned Upload URL ──────────────────────────────────────────────────

export async function getUploadUrl(
  providerId: string,
  input: UploadUrlInput
): Promise<{ upload_url: string; s3_key: string; cdn_url: string; expires_in: number }> {
  const ext = mimeToExt(input.file_mime);
  const uuid = randomUUID();
  const s3Key = `verifications/${providerId}/${input.verification_type}/${uuid}.${ext}`;

  const uploadUrl = await generatePresignedPutUrl(s3Key, input.file_mime);
  const cdnUrl = buildCdnUrl(s3Key);

  return {
    upload_url: uploadUrl,
    s3_key:     s3Key,
    cdn_url:    cdnUrl,
    expires_in: env.S3_PRESIGN_EXPIRY_SECONDS,
  };
}

// ── Submit Verification ───────────────────────────────────────────────────────

export async function submitVerification(
  providerId: string,
  input: SubmitVerificationInput
): Promise<Verification> {
  const hasPending = await verificationsRepo.hasPendingForType(
    providerId,
    input.verification_type
  );
  if (hasPending) {
    throw new AppError(
      409,
      'DUPLICATE_PENDING_VERIFICATION',
      `A pending verification for '${input.verification_type}' already exists.`
    );
  }

  const verification = await verificationsRepo.createVerification({
    provider_id:       providerId,
    verification_type: input.verification_type as verificationsRepo.VerificationType,
    document_type:     input.document_type as verificationsRepo.DocumentType,
    s3_key:            input.s3_key,
    expires_at:        input.expires_at,
  });

  // Upgrade provider status to 'pending' if currently 'unverified'
  const profile = await userRepo.findProviderProfile(providerId);
  if (profile && profile.verification_status === 'unverified') {
    await profileRepo.updateProviderVerificationFlags(providerId, {
      verification_status: 'pending',
    });
  }

  writeLog({
    action:     'verification_submitted',
    actorId:    providerId,
    targetType: 'document',
    targetId:   verification.id,
    after:      { verification_type: input.verification_type, s3_key: input.s3_key },
  });

  return verification;
}

// ── List Verifications ────────────────────────────────────────────────────────

export async function listVerifications(
  actorId: string,
  actorRole: string,
  query: ListVerificationsQuery
): Promise<{ verifications: Verification[]; nextCursor: string | null }> {
  if (actorRole === 'admin') {
    return verificationsRepo.listAll({
      status:      query.status,
      provider_id: query.provider_id,
      cursor:      query.cursor,
      limit:       query.limit,
    });
  }

  // Providers only see their own
  return verificationsRepo.listByProvider(actorId, {
    status: query.status,
    cursor: query.cursor,
    limit:  query.limit,
  });
}

// ── Get Single Verification ───────────────────────────────────────────────────

export async function getVerification(
  actorId: string,
  actorRole: string,
  id: string
): Promise<Verification> {
  const verification = await verificationsRepo.findById(id);
  if (!verification) throw Errors.notFound('Verification');

  if (actorRole !== 'admin' && verification.provider_id !== actorId) {
    throw Errors.forbidden();
  }

  return verification;
}

// ── Review Verification (Admin) ───────────────────────────────────────────────

export async function reviewVerification(
  adminId: string,
  id: string,
  input: ReviewVerificationInput
): Promise<Verification> {
  const verification = await verificationsRepo.findById(id);
  if (!verification) throw Errors.notFound('Verification');

  if (verification.status !== 'pending') {
    throw new AppError(
      409,
      'VERIFICATION_NOT_PENDING',
      `Cannot review a verification with status '${verification.status}'.`
    );
  }

  const rejectionReason = input.status === 'rejected' ? input.rejection_reason : undefined;
  const adminNotes = 'admin_notes' in input ? input.admin_notes : undefined;

  const updated = await verificationsRepo.updateVerificationStatus(id, {
    status:           input.status as verificationsRepo.VerificationStatus,
    reviewed_by:      adminId,
    rejection_reason: rejectionReason,
    admin_notes:      adminNotes,
  });

  if (!updated) throw Errors.notFound('Verification');

  const providerId = verification.provider_id;

  if (input.status === 'verified') {
    // Set the specific flag for the verified document type
    const flagField = TYPE_TO_FLAG[verification.verification_type];
    const flagUpdate: Parameters<typeof profileRepo.updateProviderVerificationFlags>[1] = {
      [flagField]: true,
    };

    // Recalculate overall verification_status:
    // Set to 'verified' if identity is now confirmed (identity is the gate)
    const profile = await userRepo.findProviderProfile(providerId);
    if (profile) {
      const willBeIdentityVerified =
        verification.verification_type === 'identity' || profile.identity_verified;

      flagUpdate.verification_status = willBeIdentityVerified ? 'verified' : 'pending';
    }

    await profileRepo.updateProviderVerificationFlags(providerId, flagUpdate);

    notify({
      userId:  providerId,
      type:    'verification_approved',
      channel: 'in_app',
      title:   'Verification approved',
      body:    `Your ${verification.verification_type} document has been approved.`,
      data:    { verificationId: id, verification_type: verification.verification_type },
    });

    writeLog({
      action:     'verification_approved',
      actorId:    adminId,
      targetType: 'document',
      targetId:   id,
      before:     { status: 'pending' },
      after:      { status: 'verified', verification_type: verification.verification_type },
    });
  } else {
    // Rejected — check if provider still has any pending or verified verifications
    const remaining = await verificationsRepo.listByProvider(providerId, { limit: 1 });
    const hasOtherActiveVerifications = remaining.verifications.some(
      (v) => v.id !== id && (v.status === 'pending' || v.status === 'verified')
    );

    if (!hasOtherActiveVerifications) {
      await profileRepo.updateProviderVerificationFlags(providerId, {
        verification_status: 'rejected',
      });
    }

    notify({
      userId:  providerId,
      type:    'verification_rejected',
      channel: 'in_app',
      title:   'Verification rejected',
      body:    `Your ${verification.verification_type} document was rejected.`,
      data:    {
        verificationId:   id,
        verification_type: verification.verification_type,
        rejection_reason:  rejectionReason,
      },
    });

    writeLog({
      action:     'verification_rejected',
      actorId:    adminId,
      targetType: 'document',
      targetId:   id,
      before:     { status: 'pending' },
      after:      { status: 'rejected', rejection_reason: rejectionReason },
    });
  }

  return updated;
}
