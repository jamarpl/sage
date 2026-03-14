import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

// Push token (authenticated)
router.post('/push-token', authenticate, userController.savePushToken);

// Live location routes (authenticated)
router.post('/location', authenticate, userController.updateMyLiveLocation);
router.get('/nearby-live', authenticate, userController.getNearbyLiveUsers);

// Account deletion (authenticated — own account only)
router.delete('/me', authenticate, userController.deleteAccount);

// Leaderboard (public)
router.get('/leaderboard', userController.getLeaderboard);

// User profile routes
router.get('/:id', userController.getUserProfile);
router.put('/:id', authenticate, userController.updateUserProfile);

// User content routes
router.get('/:id/pins', userController.getUserPins);
router.get('/:id/reports', userController.getUserReports);
router.get('/:id/events', userController.getUserEvents);
router.get('/:id/rsvps', userController.getUserRSVPs);
router.get('/:id/activity', userController.getUserActivity);

export default router;
