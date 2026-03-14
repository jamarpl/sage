/**
 * In-memory cooldown tracker for push notifications.
 * Prevents spamming users with repeated notifications for the same conversation.
 *
 * Key format: `${userId}:${conversationType}:${conversationId}`
 * Once notified, further notifications for that key are suppressed
 * for COOLDOWN_MS milliseconds.
 */

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const lastNotified = new Map<string, number>();

// Periodically clean up stale entries to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - COOLDOWN_MS;
  for (const [key, ts] of lastNotified) {
    if (ts < cutoff) lastNotified.delete(key);
  }
}, COOLDOWN_MS * 2);

/**
 * Returns the subset of userIds that are NOT on cooldown for this conversation,
 * and records them as notified (starts their cooldown).
 */
export function filterCooldown(
  userIds: string[],
  conversationType: string,
  conversationId: string
): string[] {
  const now = Date.now();
  const eligible: string[] = [];

  for (const uid of userIds) {
    const key = `${uid}:${conversationType}:${conversationId}`;
    const last = lastNotified.get(key) ?? 0;
    if (now - last >= COOLDOWN_MS) {
      eligible.push(uid);
      lastNotified.set(key, now);
    }
  }

  return eligible;
}
