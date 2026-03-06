import * as profileRepo from '../repositories/profile.repo';
import * as userRepo from '../repositories/user.repo';
import { Errors } from '../middleware/errors';
import { writeLog } from './audit.service';
import { env } from '../config/env';
import {
  cacheTagForProvider,
  getOrSetJson,
  invalidateTags,
  providerDirectoryCacheKey,
  providerProfileCacheKey,
} from './cache.service';
import type { UpdateUserInput, UpdateProviderInput, UpdateCustomerInput, ToggleAvailabilityInput } from '../schemas/profile.schema';
import type { UpdateNotificationPrefsInput } from '../schemas/auth.schema';

// ── GET me (user + role-specific profile) ─────────────────────────────────────

export async function getMyProfile(userId: string, role: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw Errors.notFound('User not found');

  // Strip sensitive fields
  const { password_hash, ...safeUser } = user as typeof user & { password_hash: string };

  if (role === 'provider') {
    const profile = await userRepo.findProviderProfile(userId);
    return { user: safeUser, provider_profile: profile };
  }
  if (role === 'customer') {
    const profile = await userRepo.findCustomerProfile(userId);
    return { user: safeUser, customer_profile: profile };
  }
  return { user: safeUser };
}

// ── PATCH me (user-level fields) ──────────────────────────────────────────────

export async function updateMyProfile(userId: string, input: UpdateUserInput) {
  const updated = await profileRepo.updateUserFields(userId, input);
  const providerProfile = await userRepo.findProviderProfile(userId);
  if (providerProfile) {
    await invalidateTags([cacheTagForProvider(userId), 'provider-directory']);
  }

  writeLog({
    action: 'user_updated',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    after: input as Record<string, unknown>,
  });

  return updated;
}

// ── PATCH me/provider ─────────────────────────────────────────────────────────

export async function updateProviderProfile(userId: string, input: UpdateProviderInput) {
  const existing = await userRepo.findProviderProfile(userId);
  if (!existing) throw Errors.notFound('Provider profile not found');

  const updated = await profileRepo.updateProviderFields(userId, input);
  await invalidateTags([cacheTagForProvider(userId), 'provider-directory']);

  writeLog({
    action: 'user_updated',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    after: input as Record<string, unknown>,
  });

  return updated;
}

// ── PATCH me/customer ─────────────────────────────────────────────────────────

export async function updateCustomerProfile(userId: string, input: UpdateCustomerInput) {
  const existing = await userRepo.findCustomerProfile(userId);
  if (!existing) throw Errors.notFound('Customer profile not found');

  const updated = await profileRepo.updateCustomerFields(userId, input);

  writeLog({
    action: 'user_updated',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    after: input as Record<string, unknown>,
  });

  return updated;
}

// ── PATCH me/availability ─────────────────────────────────────────────────────

export async function toggleAvailability(userId: string, input: ToggleAvailabilityInput) {
  const updated = await profileRepo.updateProviderFields(userId, { available: input.available });
  await invalidateTags([cacheTagForProvider(userId), 'provider-directory']);

  writeLog({
    action: 'user_updated',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    after: { available: input.available },
  });

  return updated;
}

// ── PATCH me/notifications ────────────────────────────────────────────────────

export async function updateNotificationPrefs(userId: string, input: UpdateNotificationPrefsInput) {
  const updated = await profileRepo.updateNotificationPrefs(userId, input);

  writeLog({
    action: 'user_updated',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    after: input as Record<string, unknown>,
  });

  return updated;
}

// ── GET /profiles/providers/:userId (public) ──────────────────────────────────

export async function getPublicProviderProfile(userId: string) {
  const profile = await getOrSetJson(
    providerProfileCacheKey(userId),
    env.CACHE_TTL_PROVIDER_PROFILE_SECONDS,
    () => profileRepo.getProviderPublicProfile(userId),
    {
      namespace: 'provider_profile',
      tags: ['provider-directory', cacheTagForProvider(userId)],
    }
  );
  if (!profile) throw Errors.notFound('Provider not found');
  return profile;
}

export async function getCategoryProviders(slug: string) {
  return getOrSetJson(
    providerDirectoryCacheKey(slug, 12),
    env.CACHE_TTL_CATEGORY_DIRECTORY_SECONDS,
    () => profileRepo.listProvidersByCategorySlug(slug),
    {
      namespace: 'category_directory',
      tags: ['provider-directory', `category:${slug}`],
    }
  );
}

// ── GET /profiles/customers/:userId (authenticated, limited fields) ────────────

export async function getPublicCustomerProfile(targetId: string) {
  const user = await userRepo.findById(targetId);
  if (!user || user.role !== 'customer') throw Errors.notFound('Customer not found');

  const profile = await userRepo.findCustomerProfile(targetId);
  return {
    user_id:      user.id,
    full_name:    user.full_name,
    display_name: user.display_name,
    avatar_url:   user.avatar_url,
    avg_rating:   profile?.avg_rating ?? null,
    jobs_posted:  profile?.jobs_posted ?? 0,
    member_since: user.created_at,
  };
}
