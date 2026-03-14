import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendation.controller';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(searchLimiter);
router.post('/', getRecommendations);

export default router;
