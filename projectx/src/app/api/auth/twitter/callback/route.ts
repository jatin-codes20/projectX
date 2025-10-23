import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession, setSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    if (denied) {
      return NextResponse.redirect(new URL('/?error=twitter_denied', request.url));
    }

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(new URL('/?error=twitter_invalid', request.url));
    }

    const TWITTER_CONSUMER_KEY = process.env.X_API_KEY;
    const TWITTER_CONSUMER_SECRET = process.env.X_API_SECRET;

    if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
      return NextResponse.redirect(new URL('/?error=twitter_config', request.url));
    }

    // Get session to retrieve request token secret
    const session = await getSession();
    const requestTokenSecret = session.twitter?.requestTokenSecret;

    if (!requestTokenSecret) {
      return NextResponse.redirect(new URL('/?error=twitter_session', request.url));
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: TWITTER_CONSUMER_KEY,
      appSecret: TWITTER_CONSUMER_SECRET,
      accessToken: oauthToken,
      accessSecret: requestTokenSecret,
    });

    // Exchange for access token
    const { client: loggedClient, accessToken, accessSecret } = await client.login(oauthVerifier);

    // Get user info
    const user = await loggedClient.v2.me();

    // Store tokens in session
    session.twitter = {
      accessToken,
      accessTokenSecret: accessSecret,
      userId: user.data.id,
      username: user.data.username,
    };

    // Clear request token secret
    delete session.twitter.requestTokenSecret;

    await setSession(session);

    return NextResponse.redirect(new URL('/?success=twitter_connected', request.url));
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=twitter_callback', request.url));
  }
}
