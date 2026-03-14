import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

export const signup = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, username } = req.body;

    const result = await authService.signup({ email, password, name, username });

    return sendSuccess(res, result, 201);
  } catch (error: any) {
    logger.error('Signup error:', error);
    if (error.message === 'Email already exists') {
      return sendError(res, 'EMAIL_EXISTS', error.message, 400);
    }
    if (error.message === 'Username is already taken') {
      return sendError(res, 'USERNAME_TAKEN', error.message, 409);
    }
    return sendError(res, 'SIGNUP_FAILED', 'Failed to create account', 500);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { identifier, password } = req.body;

    const result = await authService.login({ identifier, password });

    return sendSuccess(res, result);
  } catch (error: any) {
    logger.error('Login error:', error);
    return sendError(res, 'LOGIN_FAILED', 'Invalid email or password', 401);
  }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return sendError(res, 'MISSING_TOKEN', 'Refresh token is required', 400);
    }

    const result = await authService.refreshToken(token);

    return sendSuccess(res, result);
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    return sendError(res, 'INVALID_TOKEN', 'Invalid refresh token', 401);
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      const user = await authService.getCurrentUser(req.user.id);
      return sendSuccess(res, user);
    }
    if (req.supabaseAuth) {
      const user = await authService.findOrCreateUserFromSupabaseAuth(
        req.supabaseAuth.id,
        req.supabaseAuth.email
      );
      return sendSuccess(res, user);
    }
    return sendError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
  } catch (error: any) {
    logger.error('Get current user error:', error);
    return sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
  }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  try {
    // In a production app, you'd invalidate the refresh token here
    return sendSuccess(res, { message: 'Successfully logged out' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    return sendError(res, 'LOGOUT_FAILED', 'Logout failed', 500);
  }
};

export const requestMagicLink = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    const result = await authService.requestMagicLink(email);
    return sendSuccess(res, result);
  } catch (error: any) {
    logger.error('Request magic link error:', error);
    if (error.message?.includes('No account found')) {
      return sendError(res, 'USER_NOT_FOUND', error.message, 404);
    }
    return sendError(res, 'MAGIC_LINK_FAILED', error.message || 'Failed to send magic link', 500);
  }
};

export const requestSignupMagicLink = async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, username } = req.body;
    const result = await authService.requestSignupMagicLink({ email, name, username });
    return sendSuccess(res, result);
  } catch (error: any) {
    logger.error('Request signup magic link error:', error);
    if (error.message === 'Username is already taken') {
      return sendError(res, 'USERNAME_TAKEN', error.message, 409);
    }
    if (error.message?.includes('already exists')) {
      return sendError(res, 'EMAIL_EXISTS', error.message, 400);
    }
    return sendError(res, 'MAGIC_LINK_FAILED', error.message || 'Failed to send magic link', 500);
  }
};

export const verifyMagicLink = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const result = await authService.verifyMagicLink(token);
    return sendSuccess(res, result);
  } catch (error: any) {
    logger.error('Verify magic link error:', error);
    return sendError(res, 'INVALID_LINK', error.message || 'Invalid or expired link', 401);
  }
};

/** Store name/username before frontend calls Supabase signInWithOtp (Supabase sends the email). */
export const pendingSignup = async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, username } = req.body;
    await authService.savePendingSignup({ email, name, username });
    return sendSuccess(res, { message: 'OK' });
  } catch (error: any) {
    logger.error('Pending signup error:', error);
    if (error.message === 'Username is already taken') {
      return sendError(res, 'USERNAME_TAKEN', error.message, 409);
    }
    if (error.message?.includes('already exists')) {
      return sendError(res, 'EMAIL_EXISTS', error.message, 400);
    }
    return sendError(res, 'PENDING_SIGNUP_FAILED', error.message || 'Failed to save', 500);
  }
};
