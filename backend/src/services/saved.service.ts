import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

export class SavedService {
  async saveItem(userId: string, itemType: 'pin' | 'event', itemId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('saved_items')
        .insert({
          user_id: userId,
          item_type: itemType,
          item_id: itemId,
        })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          logger.warn('Item already saved');
          return { alreadySaved: true };
        }
        logger.error('Error saving item:', error);
        throw new Error('Failed to save item');
      }

      return data;
    } catch (error) {
      logger.error('Error in saveItem:', error);
      throw error;
    }
  }

  async unsaveItem(userId: string, itemType: 'pin' | 'event', itemId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) {
        logger.error('Error unsaving item:', error);
        throw new Error('Failed to unsave item');
      }

      return true;
    } catch (error) {
      logger.error('Error in unsaveItem:', error);
      throw error;
    }
  }

  async getSavedItems(userId: string, itemType?: 'pin' | 'event') {
    try {
      let query = supabaseAdmin
        .from('saved_items')
        .select('*')
        .eq('user_id', userId);

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting saved items:', error);
        return [];
      }

      // Fetch the actual items (pins or events) with their details
      const enrichedData = await Promise.all(
        (data || []).map(async (saved) => {
          const table = saved.item_type === 'pin' ? 'pins' : 'events';
          const { data: itemData } = await supabaseAdmin
            .from(table)
            .select('*')
            .eq('id', saved.item_id)
            .single();

          return {
            ...saved,
            item: itemData,
          };
        })
      );

      return enrichedData;
    } catch (error) {
      logger.error('Error in getSavedItems:', error);
      return [];
    }
  }

  async isSaved(userId: string, itemType: 'pin' | 'event', itemId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('saved_items')
        .select('id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error checking if saved:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      logger.error('Error in isSaved:', error);
      return false;
    }
  }
}

export default new SavedService();
