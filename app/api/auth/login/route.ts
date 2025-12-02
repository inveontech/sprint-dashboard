import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getUserByEmail, 
  verifyPassword, 
  createAccessToken, 
  createRefreshToken,
  createSession,
  toSafeUser,
  seedAdminUser,
  updateLastLogin
} from '@/lib/auth';
import { logCommand, AuditAction } from '@/lib/audit';
import { 
  checkRateLimit, 
  getRateLimitHeaders,
  getClientIP,
  RATE_LIMIT_PRESETS 
} from '@/lib/rate-limit';
import type { LoginResponse, AuthError } from '@/types/auth';

export const dynamic = 'force-dynamic';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  
  // Rate limiting for login attempts
  const rateLimitResult = await checkRateLimit(ip, {
    ...RATE_LIMIT_PRESETS.auth,
    identifier: `auth:${ip}`,
  });
  
  if (!rateLimitResult.success) {
    const error: AuthError = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
    };
    
    return NextResponse.json(error, { 
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    });
  }
  
  try {
    // Ensure admin is seeded on first login attempt
    await seedAdminUser();
    
    const body = await request.json();
    
    // Validate input
    const validation = loginSchema.safeParse(body);
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
    
    const { email, password } = validation.data;
    
    // Find user
    const user = await getUserByEmail(email);
    
    if (!user) {
      const error: AuthError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      };
      return NextResponse.json(error, { 
        status: 401,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      const error: AuthError = {
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled. Please contact an administrator.',
      };
      return NextResponse.json(error, { 
        status: 403,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      const error: AuthError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      };
      return NextResponse.json(error, { 
        status: 401,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }
    
    // Get user agent and create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const session = await createSession(user.id, userAgent, ip);
    
    // Generate tokens
    const safeUser = toSafeUser(user);
    const accessToken = await createAccessToken(safeUser);
    const refreshToken = await createRefreshToken(user.id, session.id);
    
    // Update last login timestamp
    await updateLastLogin(user.id);
    
    // Log successful login
    await logCommand(
      AuditAction.USER_LOGIN,
      user.id,
      user.id,
      { email: user.email, userAgent: userAgent },
      ip
    );
    
    const response: LoginResponse = {
      user: safeUser,
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.SESSION_TTL || '86400', 10),
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: getRateLimitHeaders(rateLimitResult),
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
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
