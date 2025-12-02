import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getUserById, extractBearerToken, toSafeUser } from './auth';
import { hasPermission, hasAnyPermission, canAccessRoute } from './permissions';
import { checkRateLimit, getRateLimitHeaders, getClientIP, getRateLimitForRoute } from './rate-limit';
import type { SafeUser, Permission, AuthError } from '@/types/auth';

export interface AuthenticatedHandler {
  (request: NextRequest, user: SafeUser): Promise<NextResponse>;
}

export interface ProtectedRouteOptions {
  /** Required permission(s) - user must have at least one */
  permissions?: Permission[];
  /** If true, user must have ALL permissions instead of ANY */
  requireAll?: boolean;
  /** Custom rate limit options */
  rateLimit?: {
    limit?: number;
    window?: number;
  };
  /** Skip rate limiting for this route */
  skipRateLimit?: boolean;
}

/**
 * Error response helper
 */
function errorResponse(error: AuthError, status: number, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(error, { status, headers });
}

/**
 * Protect an API route with authentication and optional permission checks
 */
export async function withAuth(
  request: NextRequest,
  handler: AuthenticatedHandler,
  options: ProtectedRouteOptions = {}
): Promise<NextResponse> {
  const ip = getClientIP(request.headers);
  const pathname = request.nextUrl.pathname;
  
  // Rate limiting
  if (!options.skipRateLimit) {
    const rateLimitOptions = options.rateLimit || getRateLimitForRoute(pathname);
    const rateLimitResult = await checkRateLimit(ip, {
      ...rateLimitOptions,
      identifier: `api:${ip}`,
    });
    
    if (!rateLimitResult.success) {
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        429,
        getRateLimitHeaders(rateLimitResult)
      );
    }
  }
  
  // Get token
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('access_token')?.value;
  const accessToken = extractBearerToken(authHeader) || cookieToken;
  
  if (!accessToken) {
    return errorResponse(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      401
    );
  }
  
  // Verify token
  const payload = await verifyAccessToken(accessToken);
  
  if (!payload) {
    return errorResponse(
      { code: 'TOKEN_INVALID', message: 'Invalid or expired access token' },
      401
    );
  }
  
  // Get user
  const user = await getUserById(payload.userId);
  
  if (!user) {
    return errorResponse(
      { code: 'USER_NOT_FOUND', message: 'User not found' },
      404
    );
  }
  
  if (!user.isActive) {
    return errorResponse(
      { code: 'ACCOUNT_DISABLED', message: 'Your account has been disabled' },
      403
    );
  }
  
  const safeUser = toSafeUser(user);
  
  // Check permissions
  if (options.permissions && options.permissions.length > 0) {
    const hasAccess = options.requireAll
      ? options.permissions.every(p => hasPermission(safeUser, p))
      : hasAnyPermission(safeUser, options.permissions);
    
    if (!hasAccess) {
      return errorResponse(
        { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' },
        403
      );
    }
  }
  
  // Check route-level permissions
  if (!canAccessRoute(safeUser, pathname, request.method)) {
    return errorResponse(
      { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' },
      403
    );
  }
  
  // Call handler
  return handler(request, safeUser);
}

/**
 * Simple auth check without permission requirements
 */
export async function requireAuth(request: NextRequest): Promise<SafeUser | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('access_token')?.value;
  const accessToken = extractBearerToken(authHeader) || cookieToken;
  
  if (!accessToken) {
    return errorResponse(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      401
    );
  }
  
  const payload = await verifyAccessToken(accessToken);
  
  if (!payload) {
    return errorResponse(
      { code: 'TOKEN_INVALID', message: 'Invalid or expired access token' },
      401
    );
  }
  
  const user = await getUserById(payload.userId);
  
  if (!user) {
    return errorResponse(
      { code: 'USER_NOT_FOUND', message: 'User not found' },
      404
    );
  }
  
  if (!user.isActive) {
    return errorResponse(
      { code: 'ACCOUNT_DISABLED', message: 'Your account has been disabled' },
      403
    );
  }
  
  return toSafeUser(user);
}

/**
 * Check if result is an error response
 */
export function isErrorResponse(result: SafeUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
