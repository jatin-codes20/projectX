import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is authenticated
  let isAuthenticated = false;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    isAuthenticated = !!authToken;
  } catch (error) {
    // If we can't check cookies, assume not authenticated
    isAuthenticated = false;
  }

  // If user is logged in, redirect them away from login page (but allow connect page)
  if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/connect', request.url));
  }

  // Allow public access to landing page, connect page, and auth routes (only if not authenticated)
  if (
    pathname === '/' ||
    pathname === '/connect' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/send-to-ai') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Protect /app routes
  if (pathname.startsWith('/app')) {
    try {
      // Get auth-token cookie (set by Java backend after Google OAuth)
      const cookieStore = await cookies();
      const authToken = cookieStore.get('auth-token')?.value;
      
      if (!authToken) {
        // No Google authentication, redirect to landing page
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Check database for connected platforms using auth-token
      // Platform enum values: "x" for Twitter/X, "instagram" for Instagram
      const backendUrl = process.env.JAVA_BACKEND_URL || 'http://localhost:8080/auth';
      const javaResponse = await fetch(`${backendUrl}/api/profiles/user`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (javaResponse.ok) {
        const data = await javaResponse.json();
        const profiles = data.profiles || [];
        
        // Check for Twitter/X platform
        const hasTwitter = profiles.some((p: any) => p.platform === 'x');
        
        // Allow access if user has Twitter/X connected
        if (hasTwitter) {
          return NextResponse.next();
        }
      }
      
      // If no platforms connected but has auth-token, still allow access
      // (User can access app to connect platforms later)
      return NextResponse.next();
      
    } catch (error) {
      console.error('Middleware auth check error:', error);
      // On error, redirect to landing page
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
