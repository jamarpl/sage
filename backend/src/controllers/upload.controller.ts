import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import uploadService from '../services/upload.service';
import { sendSuccess, sendError } from '../utils/response';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

export const uploadMiddleware = (req: any, res: Response, next: any) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 'FILE_TOO_LARGE', 'Image must be 10MB or smaller', 400);
        }
        return sendError(res, 'UPLOAD_INVALID', err.message || 'Invalid upload payload', 400);
      }
      return sendError(res, 'UPLOAD_INVALID', err.message || 'Invalid upload payload', 400);
    }

    // Support either "image" field or any first uploaded image file.
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      const picked = req.files.find((f: Express.Multer.File) => f.mimetype?.startsWith('image/'));
      if (picked) {
        req.file = picked;
      }
    }

    return next();
  });
};

export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }

    if (!req.file) {
      return sendError(res, 'NO_FILE', 'No image file provided', 400);
    }

    // Upload image to Supabase Storage
    const urls = await uploadService.uploadImage(req.file);

    return sendSuccess(res, {
      mainUrl: urls.url,
      thumbnailUrl: urls.thumbnailUrl,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return sendError(res, 'UPLOAD_FAILED', error.message || 'Failed to upload image', 500);
  }
};
