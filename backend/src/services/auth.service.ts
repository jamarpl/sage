import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';
import { sendMagicLinkEmail, getMagicLinkExpiryMinutes } from './email.service';

const SALT_ROUNDS = 12;

export interface SignupData {
  email: string;
  password: string;
  name: string;
  username?: string;
}

export interface LoginData {
  identifier: string; // email or username
  password: string;
}

export class AuthService {
  private generateToken(userId: string, email: string, expiresIn: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    // @ts-ignore - JWT library type inference issue with expiresIn string type
    return jwt.sign({ userId, email }, secret, { expiresIn });
  }

  async signup(data: SignupData) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Check username uniqueness if provided
      if (data.username) {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', data.username)
          .single();
        if (existing) throw new Error('Username is already taken');
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: data.email,
          name: data.name,
          username: data.username || null,
          password_hash: hashedPassword,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          if (error.message?.includes('username')) throw new Error('Username is already taken');
          throw new Error('Email already exists');
        }
        logger.error('Error creating user:', error);
        throw new Error('Failed to create user');
      }

      // Generate tokens
      const token = this.generateToken(user.id, user.email, process.env.JWT_EXPIRES_IN || '15m');
      const refreshToken = this.generateToken(
        user.id,
        user.email,
        process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          reputationScore: user.reputation_score ?? 0,
          pinsCreated: user.pins_created ?? 0,
          eventsCreated: user.events_created ?? 0,
        },
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Error in signup:', error);
      throw error;
    }
  }

  async login(data: LoginData) {
    try {
      // Support login by email OR username
      const isEmail = data.identifier.includes('@') && data.identifier.includes('.');
      const query = supabaseAdmin.from('users').select('*');
      const { data: user, error } = isEmail
        ? await query.eq('email', data.identifier).single()
        : await query.eq('username', data.identifier.replace(/^@/, '')).single();

      if (error || !user) {
        throw new Error('Invalid email/username or password');
      }

      if (user.password_hash) {
        const passwordValid = await bcrypt.compare(data.password, user.password_hash);
        if (!passwordValid) {
          throw new Error('Invalid email or password');
        }
      }

      // Generate tokens
      const token = this.generateToken(user.id, user.email, process.env.JWT_EXPIRES_IN || '15m');
      const refreshToken = this.generateToken(
        user.id,
        user.email,
        process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
      );

      // Update last active
      await supabaseAdmin
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          reputationScore: user.reputation_score ?? 0,
          pinsCreated: user.pins_created ?? 0,
          eventsCreated: user.events_created ?? 0,
        },
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Error in login:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(refreshToken, secret) as { userId: string; email: string };

      const newToken = this.generateToken(decoded.userId, decoded.email, process.env.JWT_EXPIRES_IN || '15m');
      const newRefreshToken = this.generateToken(
        decoded.userId,
        decoded.email,
        process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
      );

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async getCurrentUser(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        throw new Error('User not found');
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        username: data.username,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        reputationScore: data.reputation_score,
        pinsCreated: data.pins_created,
        eventsCreated: data.events_created
      };
    } catch (error) {
      logger.error('Error getting current user:', error);
      throw error;
    }
  }

  /** Create or return app user when first signing in with Supabase Auth (magic link). */
  async findOrCreateUserFromSupabaseAuth(supabaseAuthId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const { data: existingByAuth } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('supabase_auth_id', supabaseAuthId)
      .single();
    if (existingByAuth) {
      return this.getCurrentUser(existingByAuth.id);
    }

    const { data: existingByEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalized)
      .single();
    if (existingByEmail) {
      await supabaseAdmin
        .from('users')
        .update({ supabase_auth_id: supabaseAuthId })
        .eq('id', existingByEmail.id);
      return this.getCurrentUser(existingByEmail.id);
    }

    const { data: pending } = await supabaseAdmin
      .from('pending_signups')
      .select('name, username')
      .eq('email', normalized)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const name = pending?.name?.trim() || '';
    const username = pending?.username?.trim() || null;
    if (username) {
      const { data: taken } = await supabaseAdmin.from('users').select('id').eq('username', username).single();
      if (taken) {
        logger.warn('Pending signup username already taken, creating without', { username });
      }
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        supabase_auth_id: supabaseAuthId,
        email: normalized,
        name: name || 'User',
        username: username || null,
        password_hash: null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: byAuth } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('supabase_auth_id', supabaseAuthId)
          .single();
        if (byAuth) return this.getCurrentUser(byAuth.id);
      }
      logger.error('Error creating user from Supabase Auth:', error);
      throw new Error('Failed to create user');
    }

    await supabaseAdmin.from('pending_signups').delete().eq('email', normalized);
    return this.getCurrentUser(user.id);
  }

  /** Store name/username for signup; frontend then calls Supabase signInWithOtp (Supabase sends the email). */
  async savePendingSignup(data: { email: string; name: string; username?: string }) {
    const email = data.email.trim().toLowerCase();
    if (data.username) {
      const { data: existing } = await supabaseAdmin.from('users').select('id').eq('username', data.username).single();
      if (existing) throw new Error('Username is already taken');
    }
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) throw new Error('An account with this email already exists. Log in instead.');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await supabaseAdmin.from('pending_signups').upsert(
      { email, name: data.name.trim(), username: data.username?.trim() || null, expires_at: expiresAt.toISOString() },
      { onConflict: 'email' }
    );
    return { message: 'OK' };
  }

  /** Request a magic link for login (email only). */
  async requestMagicLink(email: string) {
    const normalized = email.trim().toLowerCase();
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', normalized).single();
    if (!user) {
      throw new Error('No account found with this email. Sign up first.');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + getMagicLinkExpiryMinutes() * 60 * 1000);
    await supabaseAdmin.from('magic_links').insert({
      token,
      email: normalized,
      type: 'login',
      expires_at: expiresAt.toISOString(),
    });
    await sendMagicLinkEmail(normalized, token, false);
    return { message: 'Check your email for the login link.' };
  }

  /** Request a magic link for signup (email + name + username). */
  async requestSignupMagicLink(data: { email: string; name: string; username?: string }) {
    const email = data.email.trim().toLowerCase();
    if (data.username) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', data.username)
        .single();
      if (existing) throw new Error('Username is already taken');
    }
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) throw new Error('An account with this email already exists. Log in instead.');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + getMagicLinkExpiryMinutes() * 60 * 1000);
    await supabaseAdmin.from('magic_links').insert({
      token,
      email,
      type: 'signup',
      name: data.name.trim(),
      username: data.username?.trim() || null,
      expires_at: expiresAt.toISOString(),
    });
    await sendMagicLinkEmail(email, token, true);
    return { message: 'Check your email to complete signup.' };
  }

  /** Verify magic link token and return user + tokens (creates user for signup). */
  async verifyMagicLink(token: string) {
    const { data: row, error } = await supabaseAdmin
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .single();
    if (error || !row) throw new Error('Invalid or expired link. Request a new one.');
    if (new Date(row.expires_at) < new Date()) {
      await supabaseAdmin.from('magic_links').delete().eq('token', token);
      throw new Error('This link has expired. Request a new one.');
    }
    const email = row.email;

    if (row.type === 'signup') {
      const { data: user, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          name: row.name,
          username: row.username || null,
          password_hash: null,
        })
        .select()
        .single();
      if (insertError) {
        if (insertError.code === '23505') throw new Error('An account with this email already exists. Log in instead.');
        logger.error('Error creating user from magic link:', insertError);
        throw new Error('Failed to create account');
      }
      await supabaseAdmin.from('magic_links').delete().eq('token', token);
      const accessToken = this.generateToken(user.id, user.email, process.env.JWT_EXPIRES_IN || '15m');
      const refreshToken = this.generateToken(user.id, user.email, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          reputationScore: user.reputation_score ?? 0,
          pinsCreated: user.pins_created ?? 0,
          eventsCreated: user.events_created ?? 0,
        },
        token: accessToken,
        refreshToken,
      };
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (userError || !user) throw new Error('User not found. Request a new link.');
    await supabaseAdmin.from('magic_links').delete().eq('token', token);
    await supabaseAdmin.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
    const accessToken = this.generateToken(user.id, user.email, process.env.JWT_EXPIRES_IN || '15m');
    const refreshToken = this.generateToken(user.id, user.email, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        reputationScore: user.reputation_score ?? 0,
        pinsCreated: user.pins_created ?? 0,
        eventsCreated: user.events_created ?? 0,
      },
      token: accessToken,
      refreshToken,
    };
  }
}

export default new AuthService();
