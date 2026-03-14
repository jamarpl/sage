import { Router } from 'express';
import * as reportChatController from '../controllers/reportChat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/unread', authenticate, reportChatController.getUnreadCounts);
router.post('/:reportId/read', authenticate, reportChatController.markAsRead);
router.get('/:reportId/messages', authenticate, reportChatController.getReportMessages);
router.delete('/messages/:messageId', authenticate, reportChatController.deleteReportMessage);

export default router;
