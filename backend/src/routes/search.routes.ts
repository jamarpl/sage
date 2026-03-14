import { Router } from 'express';
import { search, searchPins, searchEvents } from '../controllers/search.controller';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting to search
router.use(searchLimiter);

// POST /api/search - AI-powered natural language search
router.post('/', search);

// GET /api/search/pins - Direct pin search
router.get('/pins', searchPins);

// GET /api/search/events - Direct event search
router.get('/events', searchEvents);

export default router;
