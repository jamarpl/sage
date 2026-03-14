/**
 * Hardcoded geofence areas (campus polygons).
 * Format: [lng, lat] pairs, polygon must be closed (first point = last point).
 */

export interface Area {
  id: string;
  name: string;
  bounds: [number, number][]; // GeoJSON polygon ring: [[lng, lat], ...]
  center: [number, number];   // [lng, lat] camera fly-to center
  zoom: number;               // camera zoom when entering campus mode
}

export const AREAS: Area[] = [
  {
    id: 'utech-main',
    name: 'University of Technology',
    center: [-76.7443, 18.0200],
    zoom: 16,
    bounds: [
      [-76.7445, 18.0181],
      [-76.7440, 18.0181],
      [-76.7440, 18.0230],
      [-76.7445, 18.0230],
      [-76.7445, 18.0181],
    ],
  },
  {
    id: 'uwi-mona',
    name: 'UWI Mona Campus',
    center: [-76.75, 18.01],
    zoom: 17,
    bounds: [
      [-76.7560, 18.0050],
      [-76.7440, 18.0050],
      [-76.7440, 18.0150],
      [-76.7560, 18.0150],
      [-76.7560, 18.0050],
    ],
  },
];
