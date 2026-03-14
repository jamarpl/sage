# Mapbox Setup Guide

## Problem
The iOS build is failing because Mapbox requires a **secret download token** to download the SDK during the build process.

## Solution Steps

### 1. Get Your Mapbox Secret Download Token

1. Go to [Mapbox Account > Access Tokens](https://account.mapbox.com/access-tokens/)
2. Look for a token with **"Downloads:Read"** scope
   - If you have one, copy it (starts with `sk.`)
   - If not, create a new token:
     - Click "Create a token"
     - Give it a name like "iOS Downloads"
     - Enable the **"Downloads:Read"** scope
     - Click "Create token"
     - **Copy the token immediately** (you won't see it again!)

### 2. Add the Token to Your .env File

Open `frontend/.env` and replace:

```
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=YOUR_SECRET_DOWNLOAD_TOKEN
```

With your actual secret token:

```
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_actual_secret_token_here
```

### 3. Export the Environment Variable

In your terminal, run:

```bash
export RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_actual_secret_token_here
```

Or add it to your `~/.zshrc` for permanent use:

```bash
echo 'export RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_actual_secret_token_here' >> ~/.zshrc
source ~/.zshrc
```

### 4. Update app.json (Optional but Recommended)

Replace the placeholder in `app.json` with your secret token, OR better yet, keep it in the environment variable only.

### 5. Clean and Rebuild

```bash
cd frontend

# Clean the iOS build
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
cd ..

# Rebuild
npx expo run:ios
```

## Token Types

Mapbox uses two types of tokens:

| Token Type | Starts With | Usage | Where |
|------------|-------------|-------|-------|
| Public Access Token | `pk.` | Runtime API calls (displaying maps) | `.env` as `MAPBOX_TOKEN` |
| Secret Download Token | `sk.` | Downloading iOS/Android SDK during builds | `.env` as `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` |

## Security

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to git
- Never share your secret token publicly
- The `.gitignore` has been configured to exclude `.env`

## Troubleshooting

### Still getting curl errors?

Make sure the environment variable is set in the same terminal session where you run the build:

```bash
echo $RNMAPBOX_MAPS_DOWNLOAD_TOKEN  # Should output your token
```

### Token not working?

- Verify the token has "Downloads:Read" scope
- Make sure you're using the secret token (`sk.`), not the public token (`pk.`)
- Try regenerating the token from Mapbox dashboard

## Alternative: Use react-native-maps

If Mapbox setup is too complex, you can switch to `react-native-maps` which works with Expo Go:

```bash
npm uninstall @rnmapbox/maps
expo install react-native-maps
```

Note: This requires code changes to use Google Maps/Apple Maps instead of Mapbox.
