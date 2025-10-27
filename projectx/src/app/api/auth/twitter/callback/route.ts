import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession, setSession } from '@/lib/session';
import { createProfile } from '@/lib/profileApi';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    console.log('🐦 Twitter callback received');

    const baseUrl = new URL(request.url);
 
    if (denied) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_denied`);
    }

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_invalid`);
    }

    const TWITTER_CONSUMER_KEY = process.env.X_API_KEY;
    const TWITTER_CONSUMER_SECRET = process.env.X_API_SECRET;

    if (!TWITTER_CONSUMER_KEY || !TWITTER_CONSUMER_SECRET) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_config`);
    }

    // Get session to retrieve request token secret
    const session = await getSession();
    const requestTokenSecret = session.twitter?.requestTokenSecret;

    if (!requestTokenSecret) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_session`);
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
    console.log(`✅ Twitter connected: ${user.data.username}`);

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    console.log('🔍 Auth token:', authToken);
    // Create profile i n database if authenticated
    if (authToken) {
      try {
        console.log('🔍 Creating profile in database...');
        const profileData = {
          platform: 'x',
          username: user.data.username,
          profileUrl: `https://twitter.com/${user.data.username}`,
          accessToken: `${accessToken}:${accessSecret}`, // Store both tokens
          followersCount: 0, // Will be updated later if needed
          bio: user.data.description || '',
        };

        const profileResult = await createProfile(profileData, authToken);
        
        if (!profileResult.success) {
          console.error('❌ Failed to create profile in database:', profileResult.error);
          console.error('   Error details:', profileResult);
        }
      } catch (profileError) {
        console.error('❌ Exception during profile creation:', profileError);
        console.error('   Error stack:', profileError instanceof Error ? profileError.stack : 'No stack trace');
      }
    }

    return NextResponse.redirect(`${baseUrl.origin}/connect?success=twitter_connected`);
  } catch (error) {
    console.error('❌ Twitter OAuth callback error:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');
    const baseUrl = new URL(request.url);
    return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_callback`);
  }
}
