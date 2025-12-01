import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  verifyAccessToken,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  extractBearerToken,
  toSafeUser
} from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logCommand, AuditAction } from '@/lib/audit';
import { getClientIP } from '@/lib/rate-limit';
import type { AuthError, SafeUser, Role } from '@/types/auth';

export const dynamic = 'force-dynamic';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
  role: z.enum(['admin', 'pm', 'developer', 'viewer'] as const),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['admin', 'pm', 'developer', 'viewer'] as const).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

// Helper to verify admin access
async function verifyAdminAccess(request: NextRequest): Promise<SafeUser | AuthError> {
  const authHeader = request.headers.get('authorization');
  const accessToken = extractBearerToken(authHeader);
  
  if (!accessToken) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Access token is required',
    };
  }
  
  const payload = await verifyAccessToken(accessToken);
  
  if (!payload) {
    return {
      code: 'TOKEN_INVALID',
      message: 'Invalid or expired access token',
    };
  }
  
  const user = await getUserById(payload.userId);
  
  if (!user) {
    return {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    };
  }
  
  const safeUser = toSafeUser(user);
  
  if (!hasPermission(safeUser, 'users:write')) {
    return {
      code: 'FORBIDDEN',
      message: 'You do not have permission to manage users',
    };
  }
  
  return safeUser;
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    
    if ('code' in authResult) {
      const status = authResult.code === 'UNAUTHORIZED' || authResult.code === 'TOKEN_INVALID' ? 401 : 
                     authResult.code === 'FORBIDDEN' ? 403 : 
                     authResult.code === 'USER_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(authResult, { status });
    }
    
    const users = await getAllUsers();
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Get users error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    
    if ('code' in authResult) {
      const status = authResult.code === 'UNAUTHORIZED' || authResult.code === 'TOKEN_INVALID' ? 401 : 
                     authResult.code === 'FORBIDDEN' ? 403 : 
                     authResult.code === 'USER_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(authResult, { status });
    }
    
    const body = await request.json();
    
    // Validate input
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      const error: AuthError = {
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0]?.message || 'Invalid input',
      };
      return NextResponse.json(error, { status: 400 });
    }
    
    const { email, password, name, role } = validation.data;
    
    // Create user
    try {
      const user = await createUser(email, password, role as Role, name);
      
      // Log user creation
      const ip = getClientIP(request.headers);
      await logCommand(
        AuditAction.USER_CREATE,
        authResult.id,
        user.id,
        { email, role, name },
        ip
      );
      
      return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        const error: AuthError = {
          code: 'VALIDATION_ERROR',
          message: 'A user with this email already exists',
        };
        return NextResponse.json(error, { status: 409 });
      }
      throw err;
    }
    
  } catch (error) {
    console.error('Create user error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
