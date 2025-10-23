import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession } from '@/lib/session';

// Twitter OAuth app credentials
const TWITTER_CONSUMER_KEY = process.env.X_API_KEY;
const TWITTER_CONSUMER_SECRET = process.env.X_API_SECRET;

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

    // Get session to check for Twitter authentication
    const session = await getSession();
    
    if (!session.twitter?.accessToken || !session.twitter?.accessTokenSecret) {
      return NextResponse.json(
        { error: 'Twitter account not connected. Please connect your Twitter account first.' },
        { status: 401 }
      );
    }

    if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
      return NextResponse.json(
        { error: 'Twitter OAuth credentials not configured' },
        { status: 500 }
      );
    }

    try {
      // Initialize Twitter client with session tokens
      const twitterClient = new TwitterApi({
        appKey: TWITTER_CONSUMER_KEY,
        appSecret: TWITTER_CONSUMER_SECRET,
        accessToken: session.twitter.accessToken,
        accessSecret: session.twitter.accessTokenSecret,
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
