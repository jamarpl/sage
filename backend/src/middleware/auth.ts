import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import logger from '../utils/logger';
import { supabaseAdmin } from '../config/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  /** Set when Bearer token is a valid Supabase access token but we don't have a users row yet (first sign-in). */
  supabaseAuth?: {
    id: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
        req.user = { id: decoded.userId, email: decoded.email };
        return next();
      } catch (err) {
        if (!(err instanceof jwt.TokenExpiredError) && !(err instanceof jwt.JsonWebTokenError)) {
          throw err;
        }
        // Fall through to try Supabase
      }
    }

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      if (authRes.ok) {
        const authUser = await authRes.json() as { id: string; email?: string };
        const sub = authUser?.id;
        const email = (authUser?.email ?? '').trim().toLowerCase();
        if (sub && email) {
          const { data: appUser } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('supabase_auth_id', sub)
            .single();
          if (appUser) {
            req.user = { id: appUser.id, email: appUser.email };
            return next();
          }
          req.supabaseAuth = { id: sub, email };
          return next();
        }
      }
    }

    return sendError(res, 'INVALID_TOKEN', 'Invalid token', 401);
  } catch (error) {
    logger.error('Authentication error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Authentication failed', 500);
  }
};
