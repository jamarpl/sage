/**
 * Mapbox public access token.
 *
 * In EAS builds: set EXPO_PUBLIC_MAPBOX_TOKEN as an EAS project secret.
 *   eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.xxx"
 *
 * Metro bakes EXPO_PUBLIC_* vars into the JS bundle at build time, so this
 * resolves correctly in development (via .env) and in production (via EAS secret).
 */
export const MAPBOX_TOKEN: string = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

/**
 * Mapbox Standard style — used for both light and dark modes.
 * Light preset vs night preset is controlled via StyleImport config inside MapView.
 */
export const MAPBOX_STYLE_STANDARD = 'mapbox://styles/mapbox/standard';
