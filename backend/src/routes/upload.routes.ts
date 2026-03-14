import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { uploadMiddleware, uploadImage } from '../controllers/upload.controller';

const router = Router();

router.use(authenticate);
router.use(uploadLimiter);

// Image upload endpoint with multer middleware
router.post('/image', uploadMiddleware, uploadImage);

export default router;
