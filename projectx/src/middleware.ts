import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to landing page, connect page, and auth routes
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
      const javaResponse = await fetch('http://localhost:8080/auth/api/profiles/user', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (javaResponse.ok) {
        const data = await javaResponse.json();
        const profiles = data.profiles || [];
        
        // Check using correct enum values: "x" and "instagram"
        const hasTwitter = profiles.some((p: any) => p.platform === 'x');
        const hasInstagram = profiles.some((p: any) => p.platform === 'instagram');
        
        // Allow access if user has at least one platform connected
        if (hasTwitter || hasInstagram) {
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
