import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
// Use exact match for '/' and prefix match for others
const PUBLIC_ROUTES_EXACT = [
  '/',
];

const PUBLIC_ROUTES_PREFIX = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/signup',
  '/login',
  '/signup',
  '/_next',
  '/favicon.ico',
  '/public',
];

// API routes that need protection
const PROTECTED_API_ROUTES = [
  '/api/jira',
  '/api/settings',
  '/api/claude',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/users',
];

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  // Exact match for specific routes
  if (PUBLIC_ROUTES_EXACT.includes(pathname)) {
    return true;
  }
  // Prefix match for others
  return PUBLIC_ROUTES_PREFIX.some(route => pathname.startsWith(route));
}

// Check if route is a protected API
function isProtectedAPI(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

// Check if route is a page (not API)
function isPageRoute(pathname: string): boolean {
  return !pathname.startsWith('/api/') && 
         !pathname.startsWith('/_next/') && 
         !pathname.includes('.');
}

// Check if route is a static asset
function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next/') ||
         pathname.includes('.') ||
         pathname.startsWith('/public/');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Get token from cookie or Authorization header
  const accessToken = request.cookies.get('access_token')?.value || 
                      request.headers.get('authorization')?.replace('Bearer ', '');
  
  // For API routes - require authentication
  if (isProtectedAPI(pathname)) {
    if (!accessToken) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Token verification will be done in the route handlers
    // since we can't use jose in edge middleware easily
    // Just pass through if token exists
    return NextResponse.next();
  }
  
  // For page routes - redirect to login if not authenticated
  if (isPageRoute(pathname)) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
