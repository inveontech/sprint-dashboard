import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAccessToken,
  verifyRefreshToken,
  deleteSession,
  revokeRefreshToken,
  extractBearerToken 
} from '@/lib/auth';
import { logCommand, AuditAction } from '@/lib/audit';
import { getClientIP } from '@/lib/rate-limit';
import type { AuthError } from '@/types/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    const accessToken = extractBearerToken(authHeader);
    
    // Get refresh token from body (optional)
    let refreshToken: string | undefined;
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // Body is optional
    }
    
    // Verify access token to get session info
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (payload) {
        // Delete session if we have user info
        // Note: We don't have sessionId in access token, so we'll just invalidate the refresh token
      }
    }
    
    // Revoke refresh token if provided
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        await revokeRefreshToken(refreshPayload.tokenId);
        await deleteSession(refreshPayload.sessionId);
        
        // Log logout
        const ip = getClientIP(request.headers);
        await logCommand(
          AuditAction.USER_LOGOUT,
          refreshPayload.userId,
          refreshPayload.userId,
          { sessionId: refreshPayload.sessionId },
          ip
        );
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even on error, we return success as the client should clear tokens
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out' 
    });
  }
}

// GET method for simple logout (e.g., from a link)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const accessToken = extractBearerToken(authHeader);
  
  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      if (payload) {
        // Token was valid, logout successful
      }
    } catch {
      // Ignore verification errors
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
}
