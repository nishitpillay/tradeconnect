import { Router } from 'express';
import * as notificationsCtrl from '../controllers/notifications.controller';
import { validateQuery } from '../middleware/validate.middleware';
import { requireAuth, requireActive } from '../middleware/auth.middleware';
import { ListNotificationsQuerySchema } from '../schemas/notifications.schema';

const router = Router();

router.use(requireAuth, requireActive);

router.get('/', validateQuery(ListNotificationsQuerySchema), notificationsCtrl.listNotifications);

// Must be registered before /:id to avoid "unread-count" being captured as an :id param
router.get('/unread-count', notificationsCtrl.getUnreadCount);

router.patch('/:id/read', notificationsCtrl.markRead);

router.post('/read-all', notificationsCtrl.markAllRead);

export default router;
