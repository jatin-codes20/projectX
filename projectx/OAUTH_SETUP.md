# OAuth Setup Guide

This guide explains how to set up OAuth credentials for Twitter and Instagram to enable social media account connections.

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Session encryption (required)
SESSION_SECRET=your_32_character_random_string_here

# Twitter OAuth (required for Twitter posting)
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

# Instagram OAuth (required for Instagram posting)
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback

# Cloudinary (optional, for image hosting)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Base URL for local development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Twitter OAuth Setup

### 1. Create Twitter Developer Account
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Apply for a developer account if you don't have one
3. Create a new app

### 2. Configure Your App
1. In your app settings, enable "OAuth 1.0a"
2. Set the callback URL to: `http://localhost:3000/api/auth/twitter/callback`
3. Enable "Read and Write" permissions
4. Generate your Consumer Key and Consumer Secret

### 3. Add to Environment Variables
```env
TWITTER_CONSUMER_KEY=your_consumer_key_here
TWITTER_CONSUMER_SECRET=your_consumer_secret_here
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback
```

## Instagram OAuth Setup

### 1. Create Facebook Developer Account
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Instagram Basic Display" product

### 2. Configure Instagram Basic Display
1. In Instagram Basic Display settings:
   - Add your Instagram account as a tester
   - Set Valid OAuth Redirect URIs to: `http://localhost:3000/api/auth/instagram/callback`
2. Get your App ID and App Secret

### 3. Add to Environment Variables
```env
INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
```

## Session Secret

Generate a random 32-character string for session encryption:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use any random string generator
```

Add to your `.env`:
```env
SESSION_SECRET=your_generated_32_character_string
```

## Cloudinary Setup (Optional)

For image hosting, set up a Cloudinary account:

1. Go to [Cloudinary](https://cloudinary.com/)
2. Create a free account
3. Get your Cloud Name, API Key, and API Secret from the dashboard
4. Create an unsigned upload preset named `ml_default`

Add to your `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Testing

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Connect X (Twitter)" or "Connect Instagram"
4. Complete the OAuth flow
5. You should be redirected back with a success message
6. Click "Continue to App" to access the content creation tool

## Production Deployment

For production, update the callback URLs to your production domain:

```env
TWITTER_CALLBACK_URL=https://yourdomain.com/api/auth/twitter/callback
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/auth/instagram/callback
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

And update the URLs in your Twitter and Instagram app settings accordingly.

## Troubleshooting

### Common Issues

1. **"OAuth credentials not configured"**
   - Make sure all required environment variables are set
   - Restart your development server after adding new variables

2. **"Authorization was denied"**
   - User cancelled the OAuth flow
   - Check that callback URLs match exactly

3. **"Invalid OAuth access token"**
   - Tokens may have expired
   - User needs to reconnect their account

4. **Instagram posting fails**
   - Instagram Basic Display API has limitations
   - For production posting, you'll need Instagram Graph API with a Facebook Page

### Debug Mode

The app runs in demo mode when OAuth credentials are not configured, allowing you to test the UI without real API calls.
