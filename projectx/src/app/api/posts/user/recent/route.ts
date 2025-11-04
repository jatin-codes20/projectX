import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Proxy route for fetching recent posts - forwards to Java backend
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [SERVER] Fetching recent posts...');
    
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      console.log('❌ [SERVER] No auth token found');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get limit from query params (default 20)
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '20';
    
    console.log(`🔍 [SERVER] Calling Java API with limit=${limit}`);

    // Forward to Java backend
    const javaResponse = await fetch(`http://localhost:8080/auth/api/posts/user/recent?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ [SERVER] Java API error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}`, details: errorData },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('✅ [SERVER] Successfully fetched posts, count:', data.count || 0);
    
    return NextResponse.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error('❌ [SERVER] Error fetching recent posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent posts' },
      { status: 500 }
    );
  }
}

