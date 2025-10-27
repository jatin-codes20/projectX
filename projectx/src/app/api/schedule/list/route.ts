import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getScheduledPosts, getScheduledPostsStats } from '@/lib/scheduler';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Create a temporary user ID from session or use a default
    // This allows viewing scheduled posts even without full OAuth completion
    const userId = session.twitter?.userId || session.instagram?.accountId || 'default-user';

    const posts = getScheduledPosts(userId);
    const stats = getScheduledPostsStats(userId);

    return NextResponse.json({
      success: true,
      posts,
      stats
    });

  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}
