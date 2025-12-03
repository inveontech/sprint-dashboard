import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { getRedisClient } from './redis';
import { getRolePermissions } from './permissions';
import { prisma } from './prisma';
import type { 
  User, 
  SafeUser, 
  Session, 
  JWTPayload, 
  RefreshTokenPayload,
  Role 
} from '@/types/auth';
import type { User as PrismaUser, Role as PrismaRole } from '@prisma/client';

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-change-in-production'
);

const SESSION_TTL = parseInt(process.env.SESSION_TTL || '86400', 10); // 24 hours default
const REFRESH_TOKEN_TTL = parseInt(process.env.REFRESH_TOKEN_TTL || '604800', 10); // 7 days default

// Application prefix for Redis keys (prevents collision with other apps)
const APP_PREFIX = 'sprint-dashboard:';

// Redis key prefixes (only for sessions and tokens now - users are in PostgreSQL)
const KEYS = {
  SESSION: `${APP_PREFIX}session:`,
  REFRESH_TOKEN: `${APP_PREFIX}refresh:`,
} as const;

// In-memory fallback user store (for when database is unavailable)
const inMemoryUsers = new Map<string, User>();

// Flag to ensure admin is only seeded once per process
let adminSeeded = false;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================================================
// Role Conversion Utilities
// ============================================================================

/**
 * Convert Prisma Role enum to app Role type
 */
function prismaRoleToAppRole(role: PrismaRole): Role {
  return role.toLowerCase() as Role;
}

/**
 * Convert app Role type to Prisma Role enum
 */
function appRoleToPrismaRole(role: Role): PrismaRole {
  return role.toUpperCase() as PrismaRole;
}

/**
 * Convert Prisma User to app User type
 */
function prismaUserToAppUser(prismaUser: PrismaUser): User {
  const role = prismaRoleToAppRole(prismaUser.role);
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    name: prismaUser.name ?? undefined,
    passwordHash: prismaUser.passwordHash,
    role,
    permissions: getRolePermissions(role),
    createdAt: prismaUser.createdAt.getTime(),
    updatedAt: prismaUser.updatedAt.getTime(),
    lastLoginAt: prismaUser.lastLoginAt?.getTime(),
    isActive: prismaUser.isActive,
  };
}

// ============================================================================
// Password Hashing
// ============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// JWT Token Management
// ============================================================================

/**
 * Create an access token (JWT)
 */
export async function createAccessToken(user: SafeUser): Promise<string> {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };

  return new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .setSubject(user.id)
    .sign(JWT_SECRET);
}

/**
 * Create a refresh token (JWT)
 */
export async function createRefreshToken(userId: string, sessionId: string): Promise<string> {
  const tokenId = generateId();
  const payload: RefreshTokenPayload = {
    userId,
    sessionId,
    tokenId,
  };

  const token = await new SignJWT(payload as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .setSubject(userId)
    .sign(JWT_SECRET);

  // Store refresh token in Redis
  const redis = getRedisClient();
  await redis.setex(
    `${KEYS.REFRESH_TOKEN}${tokenId}`,
    REFRESH_TOKEN_TTL,
    JSON.stringify({ userId, sessionId, createdAt: Date.now() })
  );

  return token;
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const refreshPayload = payload as unknown as RefreshTokenPayload;
    
    // Check if token exists in Redis (not revoked)
    const redis = getRedisClient();
    const stored = await redis.get(`${KEYS.REFRESH_TOKEN}${refreshPayload.tokenId}`);
    
    if (!stored) {
      return null; // Token was revoked
    }

    return refreshPayload;
  } catch {
    return null;
  }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`${KEYS.REFRESH_TOKEN}${tokenId}`);
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(`${KEYS.REFRESH_TOKEN}*`);
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.userId === userId) {
        await redis.del(key);
      }
    }
  }
}

// ============================================================================
// Session Management (Redis)
// ============================================================================

/**
 * Create a new session
 */
export async function createSession(
  userId: string, 
  userAgent?: string, 
  ipAddress?: string
): Promise<Session> {
  const sessionId = generateId();
  const now = Date.now();
  
  const session: Session = {
    id: sessionId,
    userId,
    userAgent,
    ipAddress,
    createdAt: now,
    expiresAt: now + SESSION_TTL * 1000,
    lastActivityAt: now,
  };

  const redis = getRedisClient();
  await redis.setex(
    `${KEYS.SESSION}${sessionId}`,
    SESSION_TTL,
    JSON.stringify(session)
  );

  return session;
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();
  const data = await redis.get(`${KEYS.SESSION}${sessionId}`);
  
  if (!data) return null;
  
  const session = JSON.parse(data) as Session;
  
  // Check if expired
  if (session.expiresAt < Date.now()) {
    await redis.del(`${KEYS.SESSION}${sessionId}`);
    return null;
  }
  
  return session;
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  const session = await getSession(sessionId);
  
  if (session) {
    session.lastActivityAt = Date.now();
    const ttl = await redis.ttl(`${KEYS.SESSION}${sessionId}`);
    if (ttl > 0) {
      await redis.setex(
        `${KEYS.SESSION}${sessionId}`,
        ttl,
        JSON.stringify(session)
      );
    }
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`${KEYS.SESSION}${sessionId}`);
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(`${KEYS.SESSION}*`);
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const session = JSON.parse(data) as Session;
      if (session.userId === userId) {
        await redis.del(key);
      }
    }
  }
}

// ============================================================================
// User Management (PostgreSQL via Prisma)
// ============================================================================

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  role: Role,
  name?: string
): Promise<User> {
  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await hashPassword(password);
    
    const prismaUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        role: appRoleToPrismaRole(role),
        name,
        isActive: true,
      }
    });

    return prismaUserToAppUser(prismaUser);
  } catch (error) {
    console.error('createUser error:', error);
    // Fallback: create in-memory user
    const hashedPassword = await hashPassword(password);
    const newUser: User = {
      id: generateId(),
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      name: name || email.split('@')[0],
      role: role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryUsers.set(email.toLowerCase(), newUser);
    console.log(`✅ Admin user created in memory: ${email}`);
    return newUser;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const prismaUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!prismaUser) {
      // Fallback: check in-memory store for any user with matching ID
      for (const user of inMemoryUsers.values()) {
        if (user.id === userId) {
          return user;
        }
      }
      return null;
    }
    
    return prismaUserToAppUser(prismaUser);
  } catch (error) {
    console.error('getUserById error:', error);
    // Fallback to in-memory store
    for (const user of inMemoryUsers.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  // First check in-memory store for faster fallback
  const memoryUser = inMemoryUsers.get(email.toLowerCase());
  if (memoryUser) {
    return memoryUser;
  }

  try {
    const prismaUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!prismaUser) return null;
    
    return prismaUserToAppUser(prismaUser);
  } catch (error) {
    console.error('getUserByEmail error:', error);
    // Fallback to in-memory store (in case database fails)
    return inMemoryUsers.get(email.toLowerCase()) || null;
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: string, 
  updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>
): Promise<User | null> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!existingUser) return null;
  
  const updateData: Parameters<typeof prisma.user.update>[0]['data'] = {};
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  
  if (updates.role !== undefined) {
    updateData.role = appRoleToPrismaRole(updates.role);
  }
  
  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  
  return prismaUserToAppUser(updatedUser);
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const hashedPassword = await hashPassword(newPassword);
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } catch (error) {
    console.error('updateLastLogin error:', error);
    // Silently fail - this is non-critical
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) return false;
  
  // Delete all sessions
  await deleteAllUserSessions(userId);
  
  // Delete all refresh tokens
  await revokeAllRefreshTokens(userId);
  
  // Delete user (audit logs will cascade or set null based on schema)
  await prisma.user.delete({
    where: { id: userId }
  });
  
  return true;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  return users.map(user => toSafeUser(prismaUserToAppUser(user)));
}

/**
 * Convert User to SafeUser (without password hash)
 */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

// ============================================================================
// Admin Seeding (now handled by prisma/seed.ts)
// ============================================================================

/**
 * Seed admin user from environment variables
 * @deprecated Use prisma/seed.ts instead
 */
export async function seedAdminUser(): Promise<void> {
  // Only seed once per process to maintain consistent IDs
  if (adminSeeded) {
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.log('ℹ️  Admin credentials not set, skipping admin seed');
    adminSeeded = true; // Mark as attempted even if failed
    return;
  }
  
  // Create in memory if not exists
  if (!inMemoryUsers.has(adminEmail.toLowerCase())) {
    try {
      const hashedPassword = await hashPassword(adminPassword);
      const adminUser: User = {
        id: generateId(),
        email: adminEmail.toLowerCase(),
        passwordHash: hashedPassword,
        name: 'System Admin',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(adminEmail.toLowerCase(), adminUser);
      console.log(`✅ Admin user seeded in memory: ${adminEmail}`);
    } catch (error) {
      console.error('Failed to seed admin user:', error);
    }
  }
  
  adminSeeded = true; // Mark as seeded
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
