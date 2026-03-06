import { Router } from 'express';
import * as messagingCtrl from '../controllers/messaging.controller';
import { validate, validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  conversationListPerMinuteLimit,
  messageHourlyLimit,
  messageListPerMinuteLimit,
} from '../middleware/rateLimit.middleware';
import {
  CreateConversationSchema,
  OpenAdminSupportConversationSchema,
  SendMessageSchema,
  ListMessagesQuerySchema,
} from '../schemas/messaging.schema';

const router = Router();

// All messaging routes require authentication and an active account
router.use(requireAuth, requireActive);

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/', conversationListPerMinuteLimit, messagingCtrl.listConversations);

router.post(
  '/',
  requireRole('provider'),
  validate(CreateConversationSchema),
  messagingCtrl.openConversation
);

router.post(
  '/admin-support',
  requireRole('customer', 'provider'),
  validate(OpenAdminSupportConversationSchema),
  messagingCtrl.openAdminSupportConversation
);

router.get('/:id', messagingCtrl.getConversation);

// ── Messages ──────────────────────────────────────────────────────────────────

router.get(
  '/:id/messages',
  messageListPerMinuteLimit,
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
