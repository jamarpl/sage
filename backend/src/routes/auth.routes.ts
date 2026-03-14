import { Router } from 'express';
import { body } from 'express-validator';
import {
  signup,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  requestMagicLink,
  requestSignupMagicLink,
  verifyMagicLink,
  pendingSignup,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to all auth routes
router.use(apiLimiter);

// POST /api/auth/signup (legacy password signup – consider removing after full magic-link rollout)
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2, max: 100 })
  ],
  signup
);

// POST /api/auth/login (email or username + password)
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email or username required'),
    body('password').notEmpty()
  ],
  login
);

// Magic link auth
router.post(
  '/magic-link',
  [body('email').isEmail().normalizeEmail()],
  requestMagicLink
);
router.post(
  '/signup-magic-link',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('username').optional().trim().isLength({ min: 3, max: 100 }),
  ],
  requestSignupMagicLink
);
router.post(
  '/verify-magic-link',
  [body('token').notEmpty().trim()],
  verifyMagicLink
);

// Store name/username before Supabase signInWithOtp (no auth required)
router.post(
  '/pending-signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('username').optional().trim().isLength({ min: 3, max: 100 }),
  ],
  pendingSignup
);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// GET /api/auth/me
router.get('/me', authenticate, getCurrentUser);

export default router;
