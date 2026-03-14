import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as savedController from '../controllers/saved.controller';

const router = Router();

// All saved routes require authentication
router.post('/', authenticate, savedController.saveItem);
router.delete('/:itemType/:itemId', authenticate, savedController.unsaveItem);
router.get('/', authenticate, savedController.getSavedItems);
router.get('/:itemType/:itemId/status', authenticate, savedController.checkSaved);

export default router;
