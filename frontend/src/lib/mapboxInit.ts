import MapboxGL from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '../constants/map';

let tokenReady = false;
let tokenPromise: Promise<void> | null = null;

/**
 * Called once at app startup (in App.tsx / root layout).
 * Returns a promise that resolves when the token is registered.
 */
export function initMapbox(): Promise<void> {
  if (!tokenPromise) {
    tokenPromise = MapboxGL.setAccessToken(MAPBOX_TOKEN).then(() => {
      tokenReady = true;
    }).catch(() => {
      tokenReady = true; // unblock even on error — native SDK has the baked token
    });
  }
  return tokenPromise;
}

export function isMapboxTokenReady() {
  return tokenReady;
}
