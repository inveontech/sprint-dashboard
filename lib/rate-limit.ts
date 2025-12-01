import { getRedisClient } from './redis';

// ============================================================================
// Configuration
// ============================================================================

// Default: 100 requests per minute
const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const DEFAULT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10); // seconds

// Application prefix for Redis keys (prevents collision with other apps)
const APP_PREFIX = 'sprint-dashboard:';

// Redis key prefix
const RATE_LIMIT_PREFIX = `${APP_PREFIX}ratelimit:`;

// ============================================================================
// Types
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds until the client can retry
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit?: number;
  /** Time window in seconds */
  window?: number;
  /** Custom identifier (e.g., user ID, API key) */
  identifier?: string;
}

// ============================================================================
// Rate Limiter Implementation (Sliding Window)
// ============================================================================

/**
 * Check rate limit for an identifier using sliding window algorithm
 * 
 * This implementation uses Redis sorted sets to track requests
 * with timestamps as scores, allowing for a true sliding window.
 */
export async function checkRateLimit(
  ip: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const limit = options.limit || DEFAULT_LIMIT;
  const window = options.window || DEFAULT_WINDOW;
  const identifier = options.identifier || ip;
  
  const redis = getRedisClient();
  const key = `${RATE_LIMIT_PREFIX}${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;
  
  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now.toString(), `${now}-${Math.random().toString(36).slice(2)}`);
    
    // Set expiry on the key
    pipeline.expire(key, window);
    
    const results = await pipeline.exec();
    
    if (!results) {
      // Pipeline failed, allow request but log
      console.warn('Rate limit pipeline failed, allowing request');
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.ceil((now + window * 1000) / 1000),
      };
    }
    
    // Get count from pipeline results
    // results[1] is the zcard result: [error, count]
    const countResult = results[1];
    const currentCount = (countResult && !countResult[0]) ? Number(countResult[1]) : 0;
    
    const remaining = Math.max(0, limit - currentCount - 1);
    const reset = Math.ceil((now + window * 1000) / 1000);
    
    if (currentCount >= limit) {
      // Rate limit exceeded
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTime = oldestEntry.length >= 2 ? parseInt(oldestEntry[1], 10) : now;
      const retryAfter = Math.ceil((oldestTime + window * 1000 - now) / 1000);
      
      return {
        success: false,
        limit,
        remaining: 0,
        reset,
        retryAfter: Math.max(1, retryAfter),
      };
    }
    
    return {
      success: true,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    // On error, allow the request but log
    console.error('Rate limit error:', error);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil((now + window * 1000) / 1000),
    };
  }
}

/**
 * Get current rate limit status without consuming a request
 */
export async function getRateLimitStatus(
  ip: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const limit = options.limit || DEFAULT_LIMIT;
  const window = options.window || DEFAULT_WINDOW;
  const identifier = options.identifier || ip;
  
  const redis = getRedisClient();
  const key = `${RATE_LIMIT_PREFIX}${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;
  
  try {
    // Remove old entries and count current
    await redis.zremrangebyscore(key, 0, windowStart);
    const currentCount = await redis.zcard(key);
    
    const remaining = Math.max(0, limit - currentCount);
    const reset = Math.ceil((now + window * 1000) / 1000);
    
    return {
      success: remaining > 0,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error('Rate limit status error:', error);
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.ceil((now + window * 1000) / 1000),
    };
  }
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(
  ip: string,
  options: RateLimitOptions = {}
): Promise<void> {
  const identifier = options.identifier || ip;
  const redis = getRedisClient();
  const key = `${RATE_LIMIT_PREFIX}${identifier}`;
  
  await redis.del(key);
}

// ============================================================================
// Rate Limit Headers
// ============================================================================

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

/**
 * Preset rate limits for different endpoints
 */
export const RATE_LIMIT_PRESETS = {
  /** Default API rate limit: 100 req/min */
  default: { limit: 100, window: 60 },
  
  /** Auth endpoints: 10 req/min (prevent brute force) */
  auth: { limit: 10, window: 60 },
  
  /** AI endpoints: 20 req/min (expensive operations) */
  ai: { limit: 20, window: 60 },
  
  /** Heavy API calls: 30 req/min */
  heavy: { limit: 30, window: 60 },
} as const;

/**
 * Get rate limit options for a route
 */
export function getRateLimitForRoute(pathname: string): RateLimitOptions {
  // Auth routes - stricter limits
  if (pathname.startsWith('/api/auth/login')) {
    return RATE_LIMIT_PRESETS.auth;
  }
  
  // AI routes - moderate limits
  if (pathname.startsWith('/api/claude')) {
    return RATE_LIMIT_PRESETS.ai;
  }
  
  // Default
  return RATE_LIMIT_PRESETS.default;
}

// ============================================================================
// IP Extraction Helpers
// ============================================================================

/**
 * Extract client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check various headers (in order of preference)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback
  return '127.0.0.1';
}
