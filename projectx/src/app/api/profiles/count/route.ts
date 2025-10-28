import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route GET count - Auth token:', authToken ? 'present' : 'missing');
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward request to Java API with the cookie
    const javaResponse = await fetch('http://localhost:8080/auth/api/profiles/user/count', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API count error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('🔍 API route GET count - Java response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API route GET count error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
