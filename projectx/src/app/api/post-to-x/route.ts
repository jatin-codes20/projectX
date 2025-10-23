import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

// Add your X API credentials here
const X_API_KEY = process.env.X_API_KEY || 'your_api_key_here';
const X_API_SECRET = process.env.X_API_SECRET || 'your_api_secret_here';
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || 'your_access_token_here';
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET || 'your_access_token_secret_here';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if we have valid API credentials
    if (X_API_KEY === 'your_api_key_here' || !X_API_KEY) {
      return NextResponse.json(
        { error: 'X API credentials not configured. Please set your Twitter API credentials in the environment variables.' },
        { status: 401 }
      );
    }

    // Debug: Log credential status (without exposing actual values)
    console.log('API credentials loaded:', {
      hasApiKey: !!X_API_KEY,
      hasApiSecret: !!X_API_SECRET,
      hasAccessToken: !!X_ACCESS_TOKEN,
      hasAccessTokenSecret: !!X_ACCESS_TOKEN_SECRET
    });

    try {
      // Initialize Twitter client
      const twitterClient = new TwitterApi({
        appKey: X_API_KEY,
        appSecret: X_API_SECRET,
        accessToken: X_ACCESS_TOKEN,
        accessSecret: X_ACCESS_TOKEN_SECRET,
      });

      // Post to X
      const tweet = await twitterClient.v2.tweet(content);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully posted to X!',
        tweetId: tweet.data.id
      });
          } catch (twitterError: unknown) {
      console.error('Twitter API error:', twitterError);
      
      // Type guard for error object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = twitterError as any;
      
      // Log detailed error information
      if (error.data) {
        console.error('Twitter API error data:', JSON.stringify(error.data, null, 2));
      }
      if (error.rateLimit) {
        console.error('Rate limit info:', JSON.stringify(error.rateLimit, null, 2));
      }
      if (error.headers) {
        console.error('Response headers:', JSON.stringify(error.headers, null, 2));
      }
      
      // Extract more specific error message
      let errorMessage = 'Failed to post to X. Please check your API credentials.';
      if (error.data?.detail) {
        errorMessage = `Twitter API Error: ${error.data.detail}`;
      } else if (error.data?.title) {
        errorMessage = `Twitter API Error: ${error.data.title}`;
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        errorCode: error.code,
        errorDetails: error.data
      });
    }
  } catch (error) {
    console.error('Error in post-to-x API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
