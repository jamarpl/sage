import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Default error
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication failed';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    code = err.code || code;
    message = err.message || message;
  }

  return sendError(res, code, message, statusCode, err.details);
};

export const notFoundHandler = (
  req: Request,
  res: Response
): Response => {
  return sendError(res, 'NOT_FOUND', `Route ${req.url} not found`, 404);
};
