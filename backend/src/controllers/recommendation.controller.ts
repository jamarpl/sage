import { Request, Response } from 'express';
import recommendationService from '../services/recommendation.service';
import { sendError, sendSuccess } from '../utils/response';

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { query, location, radius, mode } = req.body as {
      query?: string;
      location?: { lat?: number; lng?: number };
      radius?: number;
      mode?: 'open_world' | 'campus';
    };

    const lat = location?.lat;
    const lng = location?.lng;
    if (!query || typeof query !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') {
      return sendError(res, 'VALIDATION_ERROR', 'query and location {lat,lng} are required', 400);
    }

    const result = await recommendationService.getRecommendations({
      query,
      location: { lat, lng },
      radius: typeof radius === 'number' ? radius : undefined,
      mode: mode === 'campus' ? 'campus' : 'open_world',
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, 'RECOMMENDATIONS_FAILED', 'Failed to generate recommendations', 500);
  }
};
