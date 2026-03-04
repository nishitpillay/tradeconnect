import { Router } from 'express';
import * as messagingCtrl from '../controllers/messaging.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { messageHourlyLimit } from '../middleware/rateLimit.middleware';
import {
  CreateConversationSchema,
  SendMessageSchema,
  ListMessagesQuerySchema,
} from '../schemas/messaging.schema';

const router = Router();

// All messaging routes require authentication and an active account
router.use(requireAuth, requireActive);

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/', messagingCtrl.listConversations);

router.post(
  '/',
  requireRole('provider'),
  validate(CreateConversationSchema),
  messagingCtrl.openConversation
);

router.get('/:id', messagingCtrl.getConversation);

// ── Messages ──────────────────────────────────────────────────────────────────

router.get(
  '/:id/messages',
  validateQuery(ListMessagesQuerySchema),
  messagingCtrl.listMessages
);

router.post(
  '/:id/messages',
  messageHourlyLimit,
  validate(SendMessageSchema),
  messagingCtrl.sendMessage
);

// ── Read receipt ──────────────────────────────────────────────────────────────

router.patch('/:id/read', messagingCtrl.markAsRead);

// ── Soft delete ───────────────────────────────────────────────────────────────

router.delete('/:id/messages/:msgId', messagingCtrl.deleteMessage);

export default router;
