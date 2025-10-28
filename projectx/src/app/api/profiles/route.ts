import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route GET - Auth token:', authToken ? 'present' : 'missing');
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward request to Java API with the cookie
    const javaResponse = await fetch('http://localhost:8080/auth/api/profiles/user', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('🔍 API route GET - Java response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API route GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the HTTP-only auth-token cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    console.log('🔍 API route POST - Auth token:', authToken ? 'present' : 'missing');
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    console.log('🔍 API route POST - Body:', body);

    // Forward request to Java API with the cookie
    const javaResponse = await fetch('http://localhost:8080/auth/api/profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!javaResponse.ok) {
      const errorData = await javaResponse.text();
      console.error('❌ Java API POST error:', javaResponse.status, errorData);
      return NextResponse.json(
        { success: false, error: `Java API error: ${javaResponse.status}` },
        { status: javaResponse.status }
      );
    }

    const data = await javaResponse.json();
    console.log('🔍 API route POST - Java response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ API route POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
