import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import feedService from '../services/feed.service';
import { sendSuccess, sendError } from '../utils/response';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    
    const { eventId } = req.params;
    const { content, imageUrl } = req.body;
    
    if (!content && !imageUrl) {
      return sendError(res, 'INVALID_DATA', 'Post must have content or image', 400);
    }
    
    const post = await feedService.createPost(eventId, req.user.id, content, imageUrl);
    return sendSuccess(res, { post }, 201);
  } catch (error) {
    return sendError(res, 'CREATE_FAILED', 'Failed to create post', 500);
  }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit, offset } = req.query;
    
    const posts = await feedService.getFeedForEvent(
      eventId,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );
    
    return sendSuccess(res, { posts });
  } catch (error) {
    return sendError(res, 'FETCH_FAILED', 'Failed to get feed', 500);
  }
};

export const addReaction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    
    const { postId } = req.params;
    const { reactionType } = req.body;
    
    if (!reactionType) {
      return sendError(res, 'INVALID_DATA', 'Reaction type is required', 400);
    }
    
    const reaction = await feedService.addReaction(postId, req.user.id, reactionType);
    return sendSuccess(res, { reaction });
  } catch (error: any) {
    if (error.message === 'Invalid reaction type') {
      return sendError(res, 'INVALID_REACTION', 'Invalid reaction type', 400);
    }
    return sendError(res, 'REACTION_FAILED', 'Failed to add reaction', 500);
  }
};

export const removeReaction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    
    const { postId } = req.params;
    await feedService.removeReaction(postId, req.user.id);
    
    return sendSuccess(res, { message: 'Reaction removed successfully' });
  } catch (error) {
    return sendError(res, 'REMOVE_FAILED', 'Failed to remove reaction', 500);
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    
    const { postId } = req.params;
    await feedService.deletePost(postId, req.user.id);
    
    return sendSuccess(res, { message: 'Post deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return sendError(res, 'FORBIDDEN', 'Not authorized to delete this post', 403);
    }
    return sendError(res, 'DELETE_FAILED', 'Failed to delete post', 500);
  }
};
