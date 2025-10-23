# Instagram API Setup Guide

This guide will help you set up Instagram posting functionality in your SocialBee application.

## Prerequisites

1. A Facebook Developer Account
2. A Facebook App
3. An Instagram Business Account connected to a Facebook Page

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Choose "Business" as the app type
4. Fill in your app details:
   - App Name: "SocialBee"
   - App Contact Email: Your email
   - App Purpose: Select appropriate purpose

## Step 2: Add Instagram Graph API

1. In your Facebook App dashboard, go to "Add Products"
2. Find "Instagram Graph API" and click "Set Up"
3. This will add the Instagram Graph API to your app

## Step 3: Configure Instagram Graph API

1. Go to "Instagram Graph API" in your app dashboard
2. Click "Create App" under "Instagram Testers"
3. Add your Instagram account as a tester

## Step 4: Get Instagram Account ID (Business Account)

**Important**: You need the **Instagram Business Account ID**, not the User ID. These are different!

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Generate a User Access Token with these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. Make a GET request to: `/me/accounts`
5. Find your Instagram **business account** and note the `id` (this is your Instagram Account ID)
6. **Note**: This must be a business/creator account, not a personal account

## Step 5: Generate Long-lived Access Token

1. In Graph API Explorer, make a GET request to:
   ```
   /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}
   ```
2. Copy the long-lived access token

## Step 6: Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Instagram API Configuration
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id

# Base URL for image hosting (for local development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important Notes:**
- `INSTAGRAM_ACCOUNT_ID` is your **Instagram Business Account ID** (not User ID)
- This must be a business or creator account connected to a Facebook Page
- Personal Instagram accounts cannot post via API

## Step 7: App Review (For Production)

For production use, you'll need to submit your app for review:

1. Go to "App Review" in your Facebook App dashboard
2. Request these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
3. Provide detailed use case descriptions
4. Submit for review

## Step 8: Test the Integration

1. Start your development server: `npm run dev`
2. Go to your application
3. Select "Instagram" as the platform
4. Upload an image and add a caption
5. Click "Post to Instagram"

## Troubleshooting

### Common Issues:

1. **"Invalid Access Token"**
   - Ensure your access token is long-lived
   - Check if the token has expired
   - Verify the token has the correct permissions

2. **"User not authorized"**
   - Make sure your Instagram account is added as a tester
   - Verify the Instagram account is connected to a Facebook Page

3. **"Image URL not accessible"**
   - Ensure your image URL is publicly accessible
   - Check if your server is running and accessible
   - For production, use a cloud storage service

4. **"Media creation failed"**
   - Verify the image URL is valid and accessible
   - Check image format (Instagram supports JPG, PNG)
   - Ensure image size is within limits (max 8MB)

### Image Requirements:

- Format: JPG or PNG
- Size: Maximum 8MB
- Dimensions: Minimum 320x320 pixels
- Aspect ratio: Between 0.8:1 and 1.91:1

## Production Considerations

1. **Image Hosting**: Use a reliable cloud storage service (AWS S3, Cloudinary, etc.)
2. **Error Handling**: Implement proper error handling and user feedback
3. **Rate Limits**: Instagram has rate limits, implement proper queuing
4. **Security**: Store credentials securely, never expose them in client-side code
5. **Monitoring**: Set up logging and monitoring for API calls

## Alternative: Instagram Basic Display API

If you only need to read Instagram data (not post), you can use the Instagram Basic Display API instead, which is simpler to set up but doesn't support posting.

## Support

For more information, refer to:
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Instagram API Permissions](https://developers.facebook.com/docs/instagram-api/reference/user/media#publish)
