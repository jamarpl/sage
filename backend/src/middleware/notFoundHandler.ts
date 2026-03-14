import { Request, Response } from 'express';
import { sendError } from '../utils/response';

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(res, 'NOT_FOUND', `Route ${req.url} not found`, 404);
};
