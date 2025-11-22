import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route POST metrics - Auth token:', authToken ? 'present' : 'missing');
    console.log('🔍 API route POST metrics - Post ID:', params.postId);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    console.log('🔍 API route POST metrics - Body:', body);

    // Forward request to Java API with the cookie
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/metrics/post/${params.postId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API POST metrics error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('🔍 API route POST metrics - Java response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API route POST metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
