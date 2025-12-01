import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAccessToken,
  getUserById,
  toSafeUser,
  extractBearerToken 
} from '@/lib/auth';
import type { AuthError, SafeUser } from '@/types/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    const accessToken = extractBearerToken(authHeader);
    
    if (!accessToken) {
      const error: AuthError = {
        code: 'UNAUTHORIZED',
        message: 'Access token is required',
      };
      return NextResponse.json(error, { status: 401 });
    }
    
    // Verify token
    const payload = await verifyAccessToken(accessToken);
    
    if (!payload) {
      const error: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired access token',
      };
      return NextResponse.json(error, { status: 401 });
    }
    
    // Get fresh user data
    const user = await getUserById(payload.userId);
    
    if (!user) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { status: 404 });
    }
    
    if (!user.isActive) {
      const error: AuthError = {
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled',
      };
      return NextResponse.json(error, { status: 403 });
    }
    
    const safeUser: SafeUser = toSafeUser(user);
    
    return NextResponse.json({ user: safeUser });
    
  } catch (error) {
    console.error('Get me error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
