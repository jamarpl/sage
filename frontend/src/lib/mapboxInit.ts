import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '../constants/map';

/**
 * Called once at app startup (in App.tsx / root layout).
 * The native SDK is already bootstrapped by the Expo plugin using the same
 * token baked at build time, so this JS call just keeps the two layers in sync.
 */
export function initMapbox() {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}
