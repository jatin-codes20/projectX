import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/?error=instagram_denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=instagram_invalid', request.url));
    }

    const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
    const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
    const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';

    if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
      return NextResponse.redirect(new URL('/?error=instagram_config', request.url));
    }

    // Get session to verify state
    const session = await getSession();
    const storedState = session.instagram?.oauthState;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=instagram_state', request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;

    // Get user profile
    const profileResponse = await fetch(`https://graph.instagram.com/${userId}?fields=id,username&access_token=${accessToken}`);
    
    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const profileData = await profileResponse.json();

    // Store tokens in session
    session.instagram = {
      accessToken,
      accountId: userId,
      username: profileData.username,
    };

    // Clear OAuth state
    delete session.instagram.oauthState;

    await setSession(session);

    return NextResponse.redirect(new URL('/?success=instagram_connected', request.url));
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=instagram_callback', request.url));
  }
}
