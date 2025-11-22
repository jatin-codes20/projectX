import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getSession, setSession } from '@/lib/session';
import { createProfileDirectJava, createPostForProfile, createMetricsForPost } from '@/lib/profileApi';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');
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
    
    const session = await getSession();
    const requestTokenSecret = session.twitter?.requestTokenSecret;
    if (!requestTokenSecret) {
      return NextResponse.redirect(`${baseUrl.origin}/connect?error=twitter_session`);
    }

     const client = new TwitterApi({
      appKey: TWITTER_CONSUMER_KEY,
      appSecret: TWITTER_CONSUMER_SECRET,
      accessToken: oauthToken,
      accessSecret: requestTokenSecret,
    });
    const { client: loggedClient, accessToken, accessSecret } = await client.login(oauthVerifier);
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
    
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    let profileResult: any = undefined;
    if (authToken) {
      profileResult = await saveProfile(user,accessToken,accessSecret,authToken);
     if(profileResult.success) {
    await saveTwitterPosts(user,loggedClient,profileResult,authToken);
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

async function saveProfile(user:any,accessToken:string,accessSecret:string,authToken:string) {
  let profileResult: any = undefined;
  try {
    const profileData = {
      platform: 'x',
      username: user.data.username,
      profileUrl: `https://X.com/${user.data.username}`,
      accessToken: `${accessToken}:${accessSecret}`, // Store both tokens
      followersCount: 0, // Will be updated later if needed
      bio: user.data.description || '',
    };

    profileResult = await createProfileDirectJava(profileData, authToken);
    
    if (!profileResult.success) {
      console.error('❌ Failed to create profile in database:', profileResult.error);
     
    }
    return profileResult;
  } catch (profileError) {
    console.error('❌ Exception during profile creation:', profileError);
    console.error('   Error stack:', profileError instanceof Error ? profileError.stack : 'No stack trace');
  }

}

async function saveTwitterPosts(user:any,loggedClient:TwitterApi,profileResult:any,authToken:string) {



     // Fetch last 30 original tweets (no retweets/replies)
     const tweets = await loggedClient.v2.userTimeline(user.data.id, {
      max_results: 30,
      'tweet.fields': ['created_at', 'text', 'entities'],
      exclude: ['retweets', 'replies'],
    });

    console.log('📝 Fetched tweets:', tweets.data.data?.length || 0);

    // If profile was created and we got its id, persist posts (but NOT metrics)
    try {
    
      // Retrieve profile id just created for X
      const createdProfileId = profileResult?.data?.id;

      if (authToken && createdProfileId && Array.isArray(tweets.data.data)) {
        for (const t of tweets.data.data) {
          const content = t.text || '';
          // Create Post (without metrics)
          const postResp = await createPostForProfile(createdProfileId, content, authToken);
          if (!postResp.success || !postResp.data?.id) {
            console.warn('⚠️ Skipping post due to creation failure');
            continue;
          }
          console.log('✅ Saved historical tweet as post:', postResp.data.id);
          
          // METRICS SAVING - COMMENTED OUT
          // const postId = postResp.data.id as number;
          // const pm = (t.public_metrics ?? {}) as {
          //   like_count?: number;
          //   retweet_count?: number;
          //   reply_count?: number;
          //   quote_count?: number;
          //   impression_count?: number;
          // };
          // const kv: Record<string, number> = {};
          // if (pm.like_count !== undefined) kv['likes'] = pm.like_count;
          // if (pm.retweet_count !== undefined) kv['retweets'] = pm.retweet_count;
          // if (pm.reply_count !== undefined) kv['replies'] = pm.reply_count;
          // if (pm.quote_count !== undefined) kv['quotes'] = pm.quote_count;
          // if (pm.impression_count !== undefined) kv['impressions'] = pm.impression_count;
          // // Persist metrics for historical posts
          // if (Object.keys(kv).length > 0) {
          //   await createMetricsForPost(postId, kv, authToken2);
          // }
        }
      } else {
        console.log('ℹ️ Skipping persistence: missing auth token, profile id, or tweets');
      }
    } catch (persistErr) {
      console.error('❌ Error persisting posts:', persistErr);
    }

}



