import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Destroy session
    await destroySession();
    
    // Clear auth-token cookie (set by Java backend)
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    
    // Create response and clear cookie in response headers
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
