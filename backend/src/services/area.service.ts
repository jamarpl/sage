import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { AREAS, type Area } from '../config/areas';

export interface CurrentAreaResult {
  areaId: string;
  areaName: string;
  center: [number, number];
  zoom: number;
}

export class AreaService {
  /**
   * Find which area (if any) contains the given point.
   */
  getCurrentArea(lat: number, lng: number): CurrentAreaResult | null {
    const pt = point([lng, lat]);

    for (const area of AREAS) {
      const poly = polygon([area.bounds]);
      if (booleanPointInPolygon(pt, poly)) {
        return {
          areaId: area.id,
          areaName: area.name,
          center: area.center,
          zoom: area.zoom,
        };
      }
    }

    return null;
  }

  /**
   * Get all defined areas (for admin/debug).
   */
  getAllAreas(): Area[] {
    return [...AREAS];
  }
}

export default new AreaService();
