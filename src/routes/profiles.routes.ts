import { Router } from 'express';
import * as profilesCtrl from '../controllers/profiles.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  UpdateUserSchema,
  UpdateProviderSchema,
  UpdateCustomerSchema,
  ToggleAvailabilitySchema,
} from '../schemas/profile.schema';
import { UpdateNotificationPrefsSchema } from '../schemas/auth.schema';

const router = Router();

// ── Public routes (no auth required) ─────────────────────────────────────────

router.get('/providers/:userId', profilesCtrl.getProvider);

// ── Authenticated routes ───────────────────────────────────────────────────────

router.use(requireAuth, requireActive);

router.get('/me', profilesCtrl.getMe);

router.patch(
  '/me',
  validate(UpdateUserSchema),
  profilesCtrl.patchMe
);

router.patch(
  '/me/provider',
  requireRole('provider'),
  validate(UpdateProviderSchema),
  profilesCtrl.patchProvider
);

router.patch(
  '/me/customer',
  requireRole('customer'),
  validate(UpdateCustomerSchema),
  profilesCtrl.patchCustomer
);

router.patch(
  '/me/availability',
  requireRole('provider'),
  validate(ToggleAvailabilitySchema),
  profilesCtrl.patchAvailability
);

router.patch(
  '/me/notifications',
  validate(UpdateNotificationPrefsSchema),
  profilesCtrl.patchNotifications
);

router.get(
  '/customers/:userId',
  profilesCtrl.getCustomer
);

export default router;
