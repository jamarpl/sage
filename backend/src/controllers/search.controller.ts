import { Request, Response } from 'express';
import aiService from '../services/ai.service';
import pinService from '../services/pin.service';
import eventService from '../services/event.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

export const search = async (req: Request, res: Response) => {
  try {
    const { query, location, radius, filters } = req.body;

    if (!query || !location || !location.lat || !location.lng) {
      return sendError(res, 'VALIDATION_ERROR', 'Query and location are required', 400);
    }

    // Parse intent using AI
    const intent = await aiService.parseIntent(query);

    // Search based on intent
    let pins: any[] = [];
    let events: any[] = [];

    if (intent.type === 'event' || intent.category === 'event') {
      // Search for events
      events = await eventService.getUpcomingEvents(
        location.lat,
        location.lng,
        radius || 5000
      );
    } else {
      // Search for pins
      pins = await pinService.searchNearby({
        lat: location.lat,
        lng: location.lng,
        radius: radius || 1000,
        type: filters?.type || intent.type !== 'other' ? intent.type : undefined,
        tags: filters?.tags || intent.preferences,
        limit: 20
      });
    }

    // Generate AI response
    const totalResults = pins.length + events.length;
    const aiResponse = await aiService.generateResponse(intent, totalResults);

    return sendSuccess(res, {
      intent,
      aiResponse,
      results: {
        pins,
        events,
        totalCount: totalResults
      }
    });
  } catch (error: any) {
    logger.error('Search error:', error);
    return sendError(res, 'SEARCH_FAILED', 'Search failed', 500);
  }
};

export const searchPins = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, type, tags, limit } = req.query;

    if (!lat || !lng) {
      return sendError(res, 'VALIDATION_ERROR', 'Latitude and longitude are required', 400);
    }

    const pins = await pinService.searchNearby({
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      radius: radius ? parseInt(radius as string) : 1000,
      type: type as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : 20
    });

    return sendSuccess(res, { pins, totalCount: pins.length });
  } catch (error: any) {
    logger.error('Pin search error:', error);
    return sendError(res, 'SEARCH_FAILED', 'Pin search failed', 500);
  }
};

export const searchEvents = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, hoursAhead, category } = req.query;

    if (!lat || !lng) {
      return sendError(res, 'VALIDATION_ERROR', 'Latitude and longitude are required', 400);
    }

    const events = await eventService.getUpcomingEvents(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseInt(radius as string) : 5000,
      hoursAhead ? parseInt(hoursAhead as string) : 168
    );

    // Filter by category if provided
    let filteredEvents = events;
    if (category) {
      filteredEvents = events.filter((e: any) => e.category === category);
    }

    return sendSuccess(res, { events: filteredEvents, totalCount: filteredEvents.length });
  } catch (error: any) {
    logger.error('Event search error:', error);
    return sendError(res, 'SEARCH_FAILED', 'Event search failed', 500);
  }
};
