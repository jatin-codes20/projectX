import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';

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
      console.log('✅ Successfully posted to X:', tweet.data.id);

      // Persist to backend: create Post only
      try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        
        if (!authToken) {
          console.warn('⚠️ No auth token found, skipping database persistence');
        } else {
          console.log('🔍 Attempting to save post to database...');
          
          // Get X profile directly from Java API
          const profileResponse = await fetch('http://localhost:8080/auth/api/profiles/user', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('🔍 Profile response:', profileData);
            
            // Find X profile from the list
            const xProfile = profileData.profiles?.find((p: any) => p.platform === 'x');
            
            if (xProfile?.id) {
              const profileId = xProfile.id;
              console.log('🔍 Found X profile ID:', profileId);
              
              // Create post directly via Java API
              const postResponse = await fetch('http://localhost:8080/auth/api/posts', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content,
                  profileId,
                }),
              });

              if (postResponse.ok) {
                const postData = await postResponse.json();
                console.log('✅ Successfully saved post to database');
              } else {
                console.error('❌ Failed to save post to database:', postResponse.status);
              }
            } else {
              console.error('❌ Could not find X profile in response');
            }
          } else {
            console.error('❌ Failed to fetch profiles:', profileResponse.status);
          }
        }
      } catch (persistErr) {
        console.error('❌ Error persisting post to database:', persistErr);
        // Don't fail the entire request if database save fails
      }

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
