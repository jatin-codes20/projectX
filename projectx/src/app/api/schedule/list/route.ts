import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Proxy route for listing scheduled posts - forwards to Java backend
 * @deprecated Use profileApi.getScheduledPosts() directly from frontend
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward to Java backend
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/scheduled-posts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}`, details: errorData },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    
    // Calculate stats from posts
    const posts = data.posts || [];
    const stats = {
      total: posts.length,
      pending: posts.filter((p: any) => p.status === 'PENDING').length,
      published: posts.filter((p: any) => p.status === 'PUBLISHED').length,
      failed: posts.filter((p: any) => p.status === 'FAILED').length,
    };

    return NextResponse.json({
      success: true,
      posts,
      stats
    });

  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}
