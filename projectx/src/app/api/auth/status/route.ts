import { NextResponse } from 'next/server';
import { getConnectedPlatforms } from '@/lib/session';

export async function GET() {
  try {
    const platforms = await getConnectedPlatforms();
    
    return NextResponse.json({
      platforms,
      authenticated: platforms.length > 0
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({
      platforms: [],
      authenticated: false
    });
  }
}
