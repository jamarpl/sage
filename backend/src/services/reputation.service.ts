import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

export type ReputationAction =
  | 'create_pin'       // +5
  | 'delete_pin'       // -3  (own pin removed)
  | 'create_report'    // +3
  | 'create_event'     // +8
  | 'verify_pin_accurate'    // +2
  | 'verify_pin_inaccurate'; // -1

const POINTS: Record<ReputationAction, number> = {
  create_pin:             5,
  delete_pin:            -3,
  create_report:          3,
  create_event:           8,
  verify_pin_accurate:    2,
  verify_pin_inaccurate: -1,
};

class ReputationService {
  async award(userId: string, action: ReputationAction): Promise<void> {
    const delta = POINTS[action];
    if (delta === 0) return;

    try {
      // Use a single atomic RPC to avoid race conditions
      const { error } = await supabaseAdmin.rpc('increment_reputation', {
        uid: userId,
        delta,
      });

      if (error) {
        // RPC may not exist yet — fall back to read-modify-write
        await this._fallback(userId, delta);
      }
    } catch (err) {
      logger.error('reputation.award error:', err);
      // Non-fatal — don't let reputation errors break the main action
    }
  }

  private async _fallback(userId: string, delta: number): Promise<void> {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('reputation_score')
      .eq('id', userId)
      .single();

    const current = typeof u?.reputation_score === 'number' ? u.reputation_score : 0;
    const next = Math.max(0, current + delta);

    await supabaseAdmin
      .from('users')
      .update({ reputation_score: next })
      .eq('id', userId);
  }
}

export default new ReputationService();
