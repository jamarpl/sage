import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import chatService from '../services/chat.service';
import { sendSuccess, sendError } from '../utils/response';

export const getEventMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit, offset } = req.query;
    
    const messages = await chatService.getEventMessages(
      eventId,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );
    
    return sendSuccess(res, { messages });
  } catch (error) {
    return sendError(res, 'FETCH_FAILED', 'Failed to get messages', 500);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    
    const { messageId } = req.params;
    await chatService.deleteMessage(messageId, req.user.id);
    
    return sendSuccess(res, { message: 'Message deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return sendError(res, 'FORBIDDEN', 'Not authorized to delete this message', 403);
    }
    return sendError(res, 'DELETE_FAILED', 'Failed to delete message', 500);
  }
};

export const getEventUnreadCounts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);

    const eventIdsParam = req.query.eventIds as string;
    if (!eventIdsParam) {
      return sendSuccess(res, { counts: {} });
    }

    const eventIds = eventIdsParam.split(',').filter(Boolean);
    const counts = await chatService.getUnreadCounts(req.user.id, eventIds);

    return sendSuccess(res, { counts });
  } catch (error) {
    return sendError(res, 'FETCH_FAILED', 'Failed to get event unread counts', 500);
  }
};

export const markEventAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);

    const { eventId } = req.params;
    await chatService.markAsRead(eventId, req.user.id);

    return sendSuccess(res, { message: 'Marked as read' });
  } catch (error) {
    return sendError(res, 'UPDATE_FAILED', 'Failed to mark event as read', 500);
  }
};
