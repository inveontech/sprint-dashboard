import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  verifyRefreshToken,
  getUserById,
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  getSession,
  updateSessionActivity,
  toSafeUser 
} from '@/lib/auth';
import { 
  checkRateLimit, 
  getRateLimitHeaders,
  getClientIP,
  RATE_LIMIT_PRESETS 
} from '@/lib/rate-limit';
import type { AuthError, LoginResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

// Validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  
  // Rate limiting
  const rateLimitResult = await checkRateLimit(ip, {
    ...RATE_LIMIT_PRESETS.auth,
    identifier: `refresh:${ip}`,
  });
  
  if (!rateLimitResult.success) {
    const error: AuthError = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many refresh attempts. Please try again later.',
    };
    
    return NextResponse.json(error, { 
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    });
  }
  
  try {
    const body = await request.json();
    
    // Validate input
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      const error: AuthError = {
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0]?.message || 'Invalid input',
      };
      return NextResponse.json(error, { 
        status: 400,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    const { refreshToken } = validation.data;
    
    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);
    
    if (!payload) {
      const error: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired refresh token',
      };
      return NextResponse.json(error, { 
        status: 401,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Check if session still exists
    const session = await getSession(payload.sessionId);
    
    if (!session) {
      // Revoke the refresh token since session is gone
      await revokeRefreshToken(payload.tokenId);
      
      const error: AuthError = {
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please login again.',
      };
      return NextResponse.json(error, { 
        status: 401,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Get user
    const user = await getUserById(payload.userId);
    
    if (!user) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { 
        status: 404,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    if (!user.isActive) {
      const error: AuthError = {
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled',
      };
      return NextResponse.json(error, { 
        status: 403,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Revoke old refresh token
    await revokeRefreshToken(payload.tokenId);
    
    // Update session activity
    await updateSessionActivity(payload.sessionId);
    
    // Generate new tokens
    const safeUser = toSafeUser(user);
    const newAccessToken = await createAccessToken(safeUser);
    const newRefreshToken = await createRefreshToken(user.id, session.id);
    
    const response: LoginResponse = {
      user: safeUser,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: parseInt(process.env.SESSION_TTL || '86400', 10),
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: getRateLimitHeaders(rateLimitResult),
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: getRateLimitHeaders(rateLimitResult),
    });
  }
}
