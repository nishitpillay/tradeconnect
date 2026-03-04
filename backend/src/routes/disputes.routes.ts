import { Router } from 'express';
import * as disputesCtrl from '../controllers/disputes.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  RaiseDisputeSchema,
  UpdateDisputeStatusSchema,
  ListDisputesQuerySchema,
} from '../schemas/disputes.schema';

const router = Router();

router.use(requireAuth, requireActive);

// Raise a dispute
router.post(
  '/',
  requireRole('customer', 'provider'),
  validate(RaiseDisputeSchema),
  disputesCtrl.raiseDispute
);

// List disputes (own for users, all for admin)
router.get(
  '/',
  validateQuery(ListDisputesQuerySchema),
  disputesCtrl.listDisputes
);

// Get a single dispute (service enforces party/admin check)
router.get('/:id', disputesCtrl.getDispute);

// Admin: update dispute status
router.patch(
  '/:id/status',
  requireRole('admin'),
  validate(UpdateDisputeStatusSchema),
  disputesCtrl.updateDisputeStatus
);

export default router;
