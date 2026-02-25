import { Request, Response, NextFunction } from 'express';
import * as profileService from '../services/profile.service';

// ── GET /profiles/me ──────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await profileService.getMyProfile(req.user!.userId, req.user!.role);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /profiles/me ────────────────────────────────────────────────────────

export async function patchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await profileService.updateMyProfile(req.user!.userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /profiles/me/provider ───────────────────────────────────────────────

export async function patchProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.updateProviderProfile(req.user!.userId, req.body);
    res.json({ provider_profile: profile });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /profiles/me/customer ───────────────────────────────────────────────

export async function patchCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.updateCustomerProfile(req.user!.userId, req.body);
    res.json({ customer_profile: profile });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /profiles/me/availability ──────────────────────────────────────────

export async function patchAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.toggleAvailability(req.user!.userId, req.body);
    res.json({ provider_profile: profile });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /profiles/me/notifications ─────────────────────────────────────────

export async function patchNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await profileService.updateNotificationPrefs(req.user!.userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ── GET /profiles/providers/:userId ──────────────────────────────────────────

export async function getProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.getPublicProviderProfile(req.params.userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

// ── GET /profiles/customers/:userId ──────────────────────────────────────────

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.getPublicCustomerProfile(req.params.userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
