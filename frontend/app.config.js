// Dynamic Expo config — wraps app.json and injects build-time env vars.
// EXPO_PUBLIC_MAPBOX_TOKEN must be set as an EAS secret (eas secret:create)
// or in a local .env file for development.
const appJson = require('./app.json');

const mapboxPublicToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoia3lpbTUwIiwiYSI6ImNtbDF4OHJlcjBjYnozY29tZno3aGx6aDcifQ.SrtFve-x9mc-dMnBSr3GCA';
const mapboxDownloadToken = process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN || 'sk.eyJ1Ijoia3lpbTUwIiwiYSI6ImNtbDF3MG1hZTBjaGEzZHB2ZzQ1ODZoNDIifQ.qHxB7hvexkYSENmuDaU6Zg';

module.exports = ({ config }) => {
  const base = { ...appJson.expo, ...config };

  return {
    ...base,
    extra: {
      ...base.extra,
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#171b1e',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Traverse to use your location to show nearby places.',
        },
      ],
      [
        '@rnmapbox/maps',
        {
          // Secret token used to download the Mapbox iOS/Android SDK at build time.
          // Set MAPBOX_DOWNLOAD_TOKEN as an EAS secret (starts with sk.).
          RNMapboxMapsDownloadToken: mapboxDownloadToken,
          // Public token baked into the native binary so the SDK can auth
          // before any JS runs. Set EXPO_PUBLIC_MAPBOX_TOKEN as an EAS secret.
          RNMapboxMapsAccessToken: mapboxPublicToken,
        },
      ],
    ],
  };
};
