import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Call Java backend
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/scheduled-posts/${params.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.message || errorData.error || 'Scheduled post not found' },
        { status: javaResponse.status }
      );
    }

    const post = await javaResponse.json();

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
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Call Java backend
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/scheduled-posts/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.message || errorData.error || 'Failed to delete scheduled post' },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();

    return NextResponse.json({
      success: true,
      message: data.message || 'Scheduled post deleted successfully'
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
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, platforms, scheduledTime, imageUrl, mediaUrls } = body;

    // Convert platform names: 'twitter' -> 'x' for backend
    const normalizedPlatforms = platforms?.map((p: string) => 
      (p === 'twitter' || p === 'X (Twitter)') ? 'x' : p
    ) || [];

    // Parse scheduled time and format as LocalDateTime string (YYYY-MM-DDTHH:mm:ss)
    const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
    if (!scheduledDate || isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled time' },
        { status: 400 }
      );
    }

    const year = scheduledDate.getFullYear();
    const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
    const day = String(scheduledDate.getDate()).padStart(2, '0');
    const hours = String(scheduledDate.getHours()).padStart(2, '0');
    const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
    const seconds = String(scheduledDate.getSeconds()).padStart(2, '0');
    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    // Build request body for Java backend
    const requestBody: any = {
      content,
      platforms: normalizedPlatforms,
      scheduledTime: localDateTimeString,
    };

    // Include mediaUrls if provided (prefer mediaUrls over imageUrl for consistency)
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      requestBody.mediaUrls = mediaUrls;
    } else if (imageUrl) {
      // Fallback to imageUrl if mediaUrls not provided
      requestBody.mediaUrls = [imageUrl];
    }

    // Call Java backend
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/scheduled-posts/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.message || errorData.error || 'Failed to update scheduled post';
      console.error('Java backend error:', errorMessage, errorData);
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details: errorData
        },
        { status: javaResponse.status }
      );
    }

    const updatedPost = await javaResponse.json();

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Scheduled post updated successfully'
    });

  } catch (error) {
    console.error('Error updating scheduled post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update scheduled post';
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
