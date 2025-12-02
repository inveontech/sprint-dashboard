// Auth Types for Sprint Dashboard

// User roles
export type Role = 'admin' | 'pm' | 'developer' | 'viewer';

// Permission types
export type Permission =
  | 'sprint:read'
  | 'sprint:write'
  | 'settings:read'
  | 'settings:write'
  | 'developers:read'
  | 'developers:write'
  | 'ai:analyze'
  | 'users:read'
  | 'users:write';

// User stored in Redis
export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  role: Role;
  permissions: Permission[];
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  isActive: boolean;
}

// User without sensitive data (for API responses)
export interface SafeUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  permissions: Permission[];
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  isActive: boolean;
}

// Session stored in Redis with TTL
export interface Session {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

// Refresh token payload
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Auth error codes
export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS' 
  | 'SESSION_EXPIRED' 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'RATE_LIMITED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'ACCOUNT_DISABLED'
  | 'USER_NOT_FOUND'
  | 'USER_EXISTS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'INTERNAL_ERROR';

// Auth error response
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

// Create user request (admin only)
export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role: Role;
}

// Update user request
export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
  password?: string;
  isActive?: boolean;
}

// Rate limit info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// API Route Context with auth
export interface AuthenticatedRequest {
  user: SafeUser;
  session: Session;
}
