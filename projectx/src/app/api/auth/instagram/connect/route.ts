import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/session';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
    const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';

    if (!INSTAGRAM_APP_ID) {
      return NextResponse.json(
        { error: 'Instagram OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session
    const session = await getSession();
    session.instagram = {
      ...session.instagram,
      oauthState: state,
    };
    await setSession(session);

    // Instagram OAuth URL
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
    authUrl.searchParams.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'user_profile,user_media');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Instagram OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Instagram OAuth' },
      { status: 500 }
    );
  }
}
