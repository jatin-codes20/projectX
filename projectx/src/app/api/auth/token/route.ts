import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Helper route to get the auth token from HTTP-only cookie
 * This allows client-side code to retrieve the token via an API call
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: authToken
    });

  } catch (error) {
    console.error('Error getting auth token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get authentication token' },
      { status: 500 }
    );
  }
}

