import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to landing page and auth routes
  if (
    pathname === '/' ||
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
      const session = await getSession();
      
      // Check if user has at least one platform connected
      const hasTwitter = !!session.twitter?.accessToken;
      const hasInstagram = !!session.instagram?.accessToken;
      
      if (!hasTwitter && !hasInstagram) {
        // Redirect to landing page if not authenticated
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      console.error('Middleware session error:', error);
      // Redirect to landing page on error
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
