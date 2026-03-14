import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import reportChatService from '../services/reportChat.service';
import { sendSuccess, sendError } from '../utils/response';

export const getReportMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { limit, offset } = req.query;

    const messages = await reportChatService.getReportMessages(
      reportId,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    return sendSuccess(res, { messages });
  } catch (error) {
    return sendError(res, 'FETCH_FAILED', 'Failed to get report messages', 500);
  }
};

export const deleteReportMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);

    const { messageId } = req.params;
    await reportChatService.deleteMessage(messageId, req.user.id);

    return sendSuccess(res, { message: 'Message deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return sendError(res, 'FORBIDDEN', 'Not authorized to delete this message', 403);
    }
    return sendError(res, 'DELETE_FAILED', 'Failed to delete message', 500);
  }
};

export const getUnreadCounts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);

    const reportIdsParam = req.query.reportIds as string;
    if (!reportIdsParam) {
      return sendSuccess(res, { counts: {} });
    }

    const reportIds = reportIdsParam.split(',').filter(Boolean);
    const counts = await reportChatService.getUnreadCounts(req.user.id, reportIds);

    return sendSuccess(res, { counts });
  } catch (error) {
    return sendError(res, 'FETCH_FAILED', 'Failed to get unread counts', 500);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);

    const { reportId } = req.params;
    await reportChatService.markAsRead(reportId, req.user.id);

    return sendSuccess(res, { message: 'Marked as read' });
  } catch (error) {
    return sendError(res, 'UPDATE_FAILED', 'Failed to mark as read', 500);
  }
};
