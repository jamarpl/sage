import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import savedService from '../services/saved.service';
import { sendSuccess, sendError } from '../utils/response';

export const saveItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    
    const { itemType, itemId } = req.body;
    
    if (!itemType || !itemId) {
      return sendError(res, 'INVALID_INPUT', 'itemType and itemId are required', 400);
    }
    
    if (itemType !== 'pin' && itemType !== 'event') {
      return sendError(res, 'INVALID_INPUT', 'itemType must be "pin" or "event"', 400);
    }
    
    const result = await savedService.saveItem(req.user.id, itemType, itemId);
    
    if (result.alreadySaved) {
      return sendSuccess(res, { message: 'Item already saved', alreadySaved: true });
    }
    
    return sendSuccess(res, { saved: result }, 201);
  } catch (error: any) {
    return sendError(res, 'SAVE_FAILED', error.message || 'Failed to save item', 500);
  }
};

export const unsaveItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    
    const { itemType, itemId } = req.params;
    
    if (itemType !== 'pin' && itemType !== 'event') {
      return sendError(res, 'INVALID_INPUT', 'itemType must be "pin" or "event"', 400);
    }
    
    await savedService.unsaveItem(req.user.id, itemType as 'pin' | 'event', itemId);
    return sendSuccess(res, { message: 'Item unsaved successfully' });
  } catch (error: any) {
    return sendError(res, 'UNSAVE_FAILED', error.message || 'Failed to unsave item', 500);
  }
};

export const getSavedItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    
    const { itemType } = req.query;
    
    if (itemType && itemType !== 'pin' && itemType !== 'event') {
      return sendError(res, 'INVALID_INPUT', 'itemType must be "pin" or "event"', 400);
    }
    
    const items = await savedService.getSavedItems(
      req.user.id,
      itemType as 'pin' | 'event' | undefined
    );
    
    return sendSuccess(res, { items });
  } catch (error) {
    return sendError(res, 'GET_FAILED', 'Failed to get saved items', 500);
  }
};

export const checkSaved = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    
    const { itemType, itemId } = req.params;
    
    if (itemType !== 'pin' && itemType !== 'event') {
      return sendError(res, 'INVALID_INPUT', 'itemType must be "pin" or "event"', 400);
    }
    
    const isSaved = await savedService.isSaved(
      req.user.id,
      itemType as 'pin' | 'event',
      itemId
    );
    
    return sendSuccess(res, { isSaved });
  } catch (error) {
    return sendError(res, 'CHECK_FAILED', 'Failed to check saved status', 500);
  }
};
