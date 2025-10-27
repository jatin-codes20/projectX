import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createScheduledPost, isScheduledTimeValid } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SCHEDULE CREATE API CALLED ===');
    const session = await getSession();
    console.log('Session data:', { 
      hasTwitter: !!session.twitter, 
      hasInstagram: !!session.instagram,
      twitterUserId: session.twitter?.userId,
      instagramAccountId: session.instagram?.accountId
    });
    
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const platforms = formData.get('platforms') as string;
    const scheduledTime = formData.get('scheduledTime') as string;
    const image = formData.get('image') as File;
    
    console.log('Form data received:', { 
      content: content?.substring(0, 50) + '...', 
      platforms, 
      scheduledTime,
      hasImage: !!image
    });

    if (!content || !platforms || !scheduledTime) {
      return NextResponse.json(
        { error: 'Content, platforms, and scheduled time are required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledTime);
    
    if (!isScheduledTimeValid(scheduledDate)) {
      return NextResponse.json(
        { error: 'Scheduled time must be at least 5 minutes in the future' },
        { status: 400 }
      );
    }

    const platformArray = JSON.parse(platforms) as ('twitter' | 'instagram')[];
    
    // For now, allow all platforms even without OAuth completion
    // TODO: Add proper validation when OAuth is fully working
    const validPlatforms = platformArray;

    // For now, we'll skip image handling in scheduled posts
    // TODO: Implement proper image storage and retrieval for scheduled posts
    let imageUrl: string | undefined;
    if (image) {
      // For now, just log that an image was provided
      console.log('Image provided for scheduled post, but not yet implemented');
    }

    // Create a consistent user ID - use session if available, otherwise default
    const userId = session.twitter?.userId || session.instagram?.accountId || 'default-user';
    console.log('Generated userId:', userId);

    console.log('About to create scheduled post with:', {
      userId,
      content: content.substring(0, 50) + '...',
      validPlatforms,
      scheduledDate: scheduledDate.toISOString()
    });

    const scheduledPost = createScheduledPost(
      userId,
      content,
      validPlatforms,
      scheduledDate,
      imageUrl
    );

    console.log('Scheduled post created successfully:', {
      id: scheduledPost.id,
      userId: scheduledPost.userId,
      status: scheduledPost.status
    });

    return NextResponse.json({
      success: true,
      post: scheduledPost,
      message: `Post scheduled for ${scheduledDate.toLocaleString()}`
    });

  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled post' },
      { status: 500 }
    );
  }
}
