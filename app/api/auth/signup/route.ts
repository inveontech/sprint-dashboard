import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, toSafeUser, createSession, createAccessToken, createRefreshToken } from '@/lib/auth';
import type { AuthError } from '@/types/auth';

export const dynamic = 'force-dynamic';

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      const error: AuthError = {
        code: 'VALIDATION_ERROR',
        message: validation.error.issues[0]?.message || 'Geçersiz giriş',
      };
      return NextResponse.json(error, { status: 400 });
    }
    
    const { email, password, name } = validation.data;
    
    // Prevent creating admin account via signup
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@inveon.com';
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      const error: AuthError = {
        code: 'FORBIDDEN',
        message: 'Bu email adresi ile kayıt olunamazı.',
      };
      return NextResponse.json(error, { status: 403 });
    }
    
    // Create user with 'viewer' role by default
    // Viewers can only see: /sprint-reports and /sprint-comparison
    const user = await createUser(
      email,
      password,
      'viewer', // Default role for new signups
      name
    );
    
    const safeUser = toSafeUser(user);
    
    // Create session and generate tokens for auto-login after signup
    const userAgent = request.headers.get('user-agent') || undefined;
    const session = await createSession(user.id, userAgent);
    const accessToken = await createAccessToken(safeUser);
    const refreshToken = await createRefreshToken(user.id, session.id);
    const expiresIn = parseInt(process.env.SESSION_TTL || '86400', 10);
    
    return NextResponse.json({
      user: safeUser,
      accessToken,
      refreshToken,
      expiresIn,
      message: 'Hesabınız başarıyla oluşturuldu! Şu anda Sprint Raporları ve Sprint Karşılaştırma sayfalarına erişebilirsiniz.',
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Handle duplicate email error
    if (error.message?.includes('already exists')) {
      const errorResponse: AuthError = {
        code: 'USER_EXISTS',
        message: 'Bu email adresi zaten kayıtlı',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }
    
    const errorResponse: AuthError = {
      code: 'INTERNAL_ERROR',
      message: 'Kayıt işlemi sırasında bir hata oluştu',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
