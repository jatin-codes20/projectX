import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route GET platform - Auth token:', authToken ? 'present' : 'missing');
    console.log('🔍 API route GET platform - Platform:', params.platform);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward request to Java API with the cookie
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/profiles/user/platform/${params.platform}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API platform error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('🔍 API route GET platform - Java response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API route GET platform error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route DELETE platform - Auth token:', authToken ? 'present' : 'missing');
    console.log('🔍 API route DELETE platform - Platform:', params.platform);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward request to Java API with the cookie
    const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
    const javaResponse = await fetch(`${backendUrl}/api/profiles/user/platform/${params.platform}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API DELETE platform error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    console.log('🔍 API route DELETE platform - Success');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ API route DELETE platform error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
