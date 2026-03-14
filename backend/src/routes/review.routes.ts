import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reviewController from '../controllers/review.controller';

const router = Router();

// Review CRUD routes
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

// Get reviews for an item
router.get('/:itemType/:itemId', reviewController.getReviews);

// Mark review as helpful
router.post('/:id/helpful', authenticate, reviewController.markHelpful);

// Get user's reviews
router.get('/user/:userId', reviewController.getUserReviews);

export default router;
