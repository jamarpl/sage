import { Request, Response } from 'express';
import areaService from '../services/area.service';
import { sendSuccess, sendError } from '../utils/response';

export const getCurrentArea = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid lat and lng query params are required', 400);
    }

    const area = areaService.getCurrentArea(lat, lng);
    return sendSuccess(res, area);
  } catch (error: any) {
    return sendError(res, 'AREA_CHECK_FAILED', 'Failed to check area', 500);
  }
};
