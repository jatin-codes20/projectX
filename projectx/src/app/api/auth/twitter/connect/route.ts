import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession, setSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const TWITTER_CONSUMER_KEY = process.env.X_API_KEY;
    const TWITTER_CONSUMER_SECRET = process.env.X_API_SECRET;
    const TWITTER_CALLBACK_URL = 'http://localhost:3000/api/auth/twitter/callback';

    if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
      return NextResponse.json(
        { error: 'Twitter OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Twitter client for OAuth 1.0a
    const client = new TwitterApi({
      appKey: TWITTER_CONSUMER_KEY,
      appSecret: TWITTER_CONSUMER_SECRET,
    });

    // Generate OAuth request token
    const authLink = await client.generateAuthLink(TWITTER_CALLBACK_URL);

    // Store request token secret in session for later verification
    const session = await getSession();
    session.twitter = {
      ...session.twitter,
      requestTokenSecret: authLink.oauth_token_secret,
    };
    await setSession(session);

    // Redirect to Twitter authorization
    return NextResponse.redirect(authLink.url);
  } catch (error) {
    console.error('Twitter OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth' },
      { status: 500 }
    );
  }
}
