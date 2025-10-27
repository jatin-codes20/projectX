import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getScheduledPost, deleteScheduledPost, updateScheduledPost } from '@/lib/scheduler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session.twitter && !session.instagram) {
      return NextResponse.json(
        { error: 'No social media accounts connected' },
        { status: 401 }
      );
    }

    const userId = session.twitter?.userId || session.instagram?.accountId || 'anonymous';
    const post = getScheduledPost(params.id, userId);

    if (!post) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post
    });

  } catch (error) {
    console.error('Error fetching scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session.twitter && !session.instagram) {
      return NextResponse.json(
        { error: 'No social media accounts connected' },
        { status: 401 }
      );
    }

    const userId = session.twitter?.userId || session.instagram?.accountId || 'anonymous';
    const success = deleteScheduledPost(params.id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Scheduled post not found or cannot be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session.twitter && !session.instagram) {
      return NextResponse.json(
        { error: 'No social media accounts connected' },
        { status: 401 }
      );
    }

    const userId = session.twitter?.userId || session.instagram?.accountId || 'anonymous';
    const body = await request.json();
    
    const { content, platforms, scheduledTime, imageUrl } = body;

    const updatedPost = updateScheduledPost(params.id, userId, {
      content,
      platforms,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      imageUrl
    });

    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Scheduled post not found or cannot be updated' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Scheduled post updated successfully'
    });

  } catch (error) {
    console.error('Error updating scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled post' },
      { status: 500 }
    );
  }
}
