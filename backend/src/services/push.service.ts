import https from 'https';
import logger from '../utils/logger';
import { supabaseAdmin } from '../config/supabase';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

/**
 * Send Expo push notifications via the Expo Push HTTP v2 API.
 * Silently swallows errors — push is non-critical.
 */
async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;

  // Filter out obviously invalid tokens
  const valid = messages.filter(m => typeof m.to === 'string' && m.to.startsWith('ExponentPushToken['));
  if (!valid.length) return;

  const body = JSON.stringify(valid);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            logger.warn('[push] Expo push API error', { status: res.statusCode, data });
          }
          resolve();
        });
      }
    );
    req.on('error', (err) => {
      logger.warn('[push] Network error sending push', { err: err.message });
      resolve();
    });
    req.write(body);
    req.end();
  });
}

/**
 * Look up the push token(s) for one or more userIds and send them a notification.
 * Skips users who haven't granted push permissions (no token stored).
 */
async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!userIds.length) return;

  try {
    const { data: rows } = await supabaseAdmin
      .from('users')
      .select('push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    if (!rows || !rows.length) return;

    const messages: PushMessage[] = rows
      .filter((r: any) => r.push_token)
      .map((r: any) => ({
        to: r.push_token as string,
        title,
        body,
        sound: 'default',
        data: data ?? {},
      }));

    await sendPushNotifications(messages);
  } catch (err) {
    logger.warn('[push] Failed to look up push tokens', { err });
  }
}

export default { notifyUsers, sendPushNotifications };
