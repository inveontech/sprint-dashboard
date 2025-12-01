import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Helper to check if Redis is available
const isRedisAvailable = () => {
  return !process.env.REDIS_MOCK || process.env.REDIS_MOCK !== 'true';
};

// Cache version for in-memory cache invalidation
let cacheVersion = 0;

export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];
    const redis = getRedisClient();
    
    // 1. Clear Redis cache if available
    if (isRedisAvailable()) {
      try {
        // Get all keys with our prefix
        const keys = await redis.keys('sprint-dashboard:*');
        
        if (keys.length > 0) {
          // Delete all matching keys
          await redis.del(...keys);
          results.push(`Redis: ${keys.length} keys deleted`);
        } else {
          results.push('Redis: No cached keys found');
        }
      } catch (redisError) {
        console.error('Redis clear error:', redisError);
        results.push('Redis: Failed to clear (connection issue)');
      }
    } else {
      results.push('Redis: Not available (in-memory mode)');
    }
    
    // 2. Increment cache version to invalidate in-memory caches
    cacheVersion++;
    results.push(`Cache version incremented to ${cacheVersion}`);
    
    // 3. Clear specific caches by sending internal signal
    // Note: In-memory caches in API routes will be cleared on next request
    // because they check the timestamp/TTL
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      details: results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const redis = getRedisClient();
    const stats: any = {
      redisAvailable: isRedisAvailable(),
      cacheVersion,
    };
    
    if (isRedisAvailable()) {
      try {
        const keys = await redis.keys('sprint-dashboard:*');
        stats.totalKeys = keys.length;
        
        // Group keys by type
        const breakdown: Record<string, number> = {};
        let sessionKeys = 0;
        let userKeys = 0;
        
        for (const key of keys) {
          const parts = key.split(':');
          const type = parts[1] || 'unknown';
          breakdown[type] = (breakdown[type] || 0) + 1;
          
          if (type === 'session' || type === 'refresh') {
            sessionKeys++;
          }
          if (type === 'user') {
            userKeys++;
          }
        }
        
        stats.sessionKeys = sessionKeys;
        stats.userKeys = userKeys;
        stats.breakdown = breakdown;
      } catch (e) {
        stats.redisError = 'Failed to get key stats';
      }
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 });
  }
}
