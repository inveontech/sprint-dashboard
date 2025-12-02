import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  verifyAccessToken,
  getUserById,
  updateUser,
  updateUserPassword,
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

// GET - Get single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAccess(request);
    
    if ('code' in authResult) {
      const status = authResult.code === 'UNAUTHORIZED' || authResult.code === 'TOKEN_INVALID' ? 401 : 
                     authResult.code === 'FORBIDDEN' ? 403 : 
                     authResult.code === 'USER_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(authResult, { status });
    }
    
    const { id } = await params;
    const user = await getUserById(id);
    
    if (!user) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { status: 404 });
    }
    
    return NextResponse.json({ user: toSafeUser(user) });
    
  } catch (error) {
    console.error('Get user error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAccess(request);
    
    if ('code' in authResult) {
      const status = authResult.code === 'UNAUTHORIZED' || authResult.code === 'TOKEN_INVALID' ? 401 : 
                     authResult.code === 'FORBIDDEN' ? 403 : 
                     authResult.code === 'USER_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(authResult, { status });
    }
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate input
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      const error: AuthError = {
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0]?.message || 'Invalid input',
      };
      return NextResponse.json(error, { status: 400 });
    }
    
    const { password, ...updates } = validation.data;
    
    // Get current user
    const existingUser = await getUserById(id);
    if (!existingUser) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { status: 404 });
    }
    
    // Protect admin user - cannot be modified
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@inveon.com';
    if (existingUser.email === adminEmail) {
      const error: AuthError = {
        code: 'FORBIDDEN',
        message: 'Admin kullanıcısı değiştirilemez. Admin bilgileri sadece environment variable\'lardan (.env dosyası) güncellenebilir.',
      };
      return NextResponse.json(error, { status: 403 });
    }
    
    // Update user
    const updatedUser = await updateUser(id, updates as Partial<{ name: string; role: Role; isActive: boolean }>);
    
    if (!updatedUser) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { status: 404 });
    }
    
    // Handle password update separately
    if (password) {
      await updateUserPassword(id, password);
      
      // Log password change
      const ip = getClientIP(request.headers);
      await logCommand(
        AuditAction.PASSWORD_CHANGE,
        authResult.id,
        id,
        { changedByAdmin: authResult.id !== id },
        ip
      );
    }
    
    // Log user update
    const ip = getClientIP(request.headers);
    await logCommand(
      AuditAction.USER_UPDATE,
      authResult.id,
      id,
      { updates: Object.keys(updates) },
      ip
    );
    
    return NextResponse.json({ user: toSafeUser(updatedUser) });
    
  } catch (error) {
    console.error('Update user error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAccess(request);
    
    if ('code' in authResult) {
      const status = authResult.code === 'UNAUTHORIZED' || authResult.code === 'TOKEN_INVALID' ? 401 : 
                     authResult.code === 'FORBIDDEN' ? 403 : 
                     authResult.code === 'USER_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(authResult, { status });
    }
    
    const { id } = await params;
    
    // Prevent self-deletion
    if (id === authResult.id) {
      const error: AuthError = {
        code: 'FORBIDDEN',
        message: 'You cannot delete your own account',
      };
      return NextResponse.json(error, { status: 403 });
    }
    
    // Protect admin user - cannot be deleted
    const targetUser = await getUserById(id);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@inveon.com';
    if (targetUser && targetUser.email === adminEmail) {
      const error: AuthError = {
        code: 'FORBIDDEN',
        message: 'Admin kullanıcısı silinemez. Admin hesabı sistem tarafından korunmaktadır.',
      };
      return NextResponse.json(error, { status: 403 });
    }
    
    const deleted = await deleteUser(id);
    
    if (!deleted) {
      const error: AuthError = {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
      return NextResponse.json(error, { status: 404 });
    }
    
    // Log user deletion
    const ip = getClientIP(request.headers);
    await logCommand(
      AuditAction.USER_DELETE,
      authResult.id,
      id,
      { deletedUserEmail: targetUser?.email },
      ip
    );
    
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
