import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/session';
import { createProfile } from '@/lib/profileApi';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('📸 Instagram callback received');

    const baseUrl = new URL(request.url);

    if (error) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=instagram_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=instagram_invalid`);
    }

    const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
    const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
    const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback';

    if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=instagram_config`);
    }

    // Get session to verify state
    const session = await getSession();
    const storedState = session.instagram?.oauthState;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=instagram_state`);
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
    console.log(`✅ Instagram connected: ${profileData.username}`);

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Create profile in database if authenticated
    if (authToken) {
      try {
        const profileDataForDb = {
          platform: 'instagram',
          username: profileData.username,
          profileUrl: `https://instagram.com/${profileData.username}`,
          accessToken: accessToken,
          followersCount: 0, // Will be updated later if needed
          bio: '', // Instagram API doesn't provide bio in basic profile
        };

        const profileResult = await createProfile(profileDataForDb, authToken);
        
        if (!profileResult.success) {
          console.error('❌ Failed to create profile in database:', profileResult.error);
          console.error('   Error details:', profileResult);
        }
      } catch (profileError) {
        console.error('❌ Exception during profile creation:', profileError);
        console.error('   Error stack:', profileError instanceof Error ? profileError.stack : 'No stack trace');
      }
    }

    return NextResponse.redirect(`${baseUrl.origin}/connect?success=instagram_connected`);
  } catch (error) {
    console.error('❌ Instagram OAuth callback error:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');
    const baseUrl = new URL(request.url);
    return NextResponse.redirect(`${baseUrl.origin}/connect?error=instagram_callback`);
  }
}
