import Redis from 'ioredis';

// Singleton Redis client
let redisClient: Redis | null = null;

// In-memory fallback for when Redis is not available
const inMemoryStore = new Map<string, { value: string; expiresAt?: number }>();

// Check if we're in mock mode (no Redis)
const isRedisMock = (): boolean => {
  return !process.env.REDIS_URL || process.env.REDIS_MOCK === 'true';
};

// Get Redis client instance
export function getRedisClient(): Redis {
  if (isRedisMock()) {
    // Return a mock Redis client that uses in-memory store
    return createMockRedisClient();
  }

  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 10000,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  return redisClient;
}

// Create a mock Redis client for development/testing without Redis
function createMockRedisClient(): Redis {
  const cleanupExpired = () => {
    const now = Date.now();
    for (const [key, data] of inMemoryStore.entries()) {
      if (data.expiresAt && data.expiresAt < now) {
        inMemoryStore.delete(key);
      }
    }
  };

  // Periodic cleanup
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpired, 60000); // Clean up every minute
  }

  // Create a proxy that mimics Redis commands
  const mockClient = {
    // String commands
    async get(key: string): Promise<string | null> {
      cleanupExpired();
      const data = inMemoryStore.get(key);
      if (!data) return null;
      if (data.expiresAt && data.expiresAt < Date.now()) {
        inMemoryStore.delete(key);
        return null;
      }
      return data.value;
    },

    async set(key: string, value: string, ...args: (string | number)[]): Promise<'OK'> {
      let expiresAt: number | undefined;
      
      // Parse EX argument for expiration
      const exIndex = args.findIndex(arg => arg === 'EX' || arg === 'ex');
      if (exIndex !== -1 && args[exIndex + 1]) {
        const seconds = Number(args[exIndex + 1]);
        expiresAt = Date.now() + seconds * 1000;
      }
      
      // Parse PX argument for expiration in milliseconds
      const pxIndex = args.findIndex(arg => arg === 'PX' || arg === 'px');
      if (pxIndex !== -1 && args[pxIndex + 1]) {
        const ms = Number(args[pxIndex + 1]);
        expiresAt = Date.now() + ms;
      }

      inMemoryStore.set(key, { value, expiresAt });
      return 'OK';
    },

    async setex(key: string, seconds: number, value: string): Promise<'OK'> {
      const expiresAt = Date.now() + seconds * 1000;
      inMemoryStore.set(key, { value, expiresAt });
      return 'OK';
    },

    async del(...keys: string[]): Promise<number> {
      let deleted = 0;
      for (const key of keys) {
        if (inMemoryStore.delete(key)) {
          deleted++;
        }
      }
      return deleted;
    },

    async exists(...keys: string[]): Promise<number> {
      cleanupExpired();
      let count = 0;
      for (const key of keys) {
        if (inMemoryStore.has(key)) {
          count++;
        }
      }
      return count;
    },

    async expire(key: string, seconds: number): Promise<number> {
      const data = inMemoryStore.get(key);
      if (!data) return 0;
      data.expiresAt = Date.now() + seconds * 1000;
      return 1;
    },

    async ttl(key: string): Promise<number> {
      const data = inMemoryStore.get(key);
      if (!data) return -2;
      if (!data.expiresAt) return -1;
      const remaining = Math.ceil((data.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    },

    async incr(key: string): Promise<number> {
      const data = inMemoryStore.get(key);
      const currentValue = data ? parseInt(data.value, 10) : 0;
      const newValue = (isNaN(currentValue) ? 0 : currentValue) + 1;
      inMemoryStore.set(key, { 
        value: String(newValue), 
        expiresAt: data?.expiresAt 
      });
      return newValue;
    },

    async incrby(key: string, increment: number): Promise<number> {
      const data = inMemoryStore.get(key);
      const currentValue = data ? parseInt(data.value, 10) : 0;
      const newValue = (isNaN(currentValue) ? 0 : currentValue) + increment;
      inMemoryStore.set(key, { 
        value: String(newValue), 
        expiresAt: data?.expiresAt 
      });
      return newValue;
    },

    // Hash commands
    async hset(key: string, ...args: (string | number)[]): Promise<number> {
      const data = inMemoryStore.get(key);
      const hash: Record<string, string> = data ? JSON.parse(data.value) : {};
      
      let newFields = 0;
      for (let i = 0; i < args.length; i += 2) {
        const field = String(args[i]);
        const value = String(args[i + 1]);
        if (!(field in hash)) newFields++;
        hash[field] = value;
      }
      
      inMemoryStore.set(key, { 
        value: JSON.stringify(hash), 
        expiresAt: data?.expiresAt 
      });
      return newFields;
    },

    async hget(key: string, field: string): Promise<string | null> {
      const data = inMemoryStore.get(key);
      if (!data) return null;
      const hash = JSON.parse(data.value);
      return hash[field] ?? null;
    },

    async hgetall(key: string): Promise<Record<string, string>> {
      const data = inMemoryStore.get(key);
      if (!data) return {};
      return JSON.parse(data.value);
    },

    async hdel(key: string, ...fields: string[]): Promise<number> {
      const data = inMemoryStore.get(key);
      if (!data) return 0;
      const hash = JSON.parse(data.value);
      let deleted = 0;
      for (const field of fields) {
        if (field in hash) {
          delete hash[field];
          deleted++;
        }
      }
      inMemoryStore.set(key, { 
        value: JSON.stringify(hash), 
        expiresAt: data?.expiresAt 
      });
      return deleted;
    },

    // List commands
    async lpush(key: string, ...values: string[]): Promise<number> {
      const data = inMemoryStore.get(key);
      const list: string[] = data ? JSON.parse(data.value) : [];
      list.unshift(...values.reverse());
      inMemoryStore.set(key, { 
        value: JSON.stringify(list), 
        expiresAt: data?.expiresAt 
      });
      return list.length;
    },

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
      const data = inMemoryStore.get(key);
      if (!data) return [];
      const list: string[] = JSON.parse(data.value);
      const end = stop < 0 ? list.length + stop + 1 : stop + 1;
      return list.slice(start, end);
    },

    async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
      const data = inMemoryStore.get(key);
      if (!data) return 'OK';
      const list: string[] = JSON.parse(data.value);
      const end = stop < 0 ? list.length + stop + 1 : stop + 1;
      const trimmed = list.slice(start, end);
      inMemoryStore.set(key, { 
        value: JSON.stringify(trimmed), 
        expiresAt: data?.expiresAt 
      });
      return 'OK';
    },

    // Keys command
    async keys(pattern: string): Promise<string[]> {
      cleanupExpired();
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return Array.from(inMemoryStore.keys()).filter(key => regex.test(key));
    },

    // Scan command (simplified)
    async scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]> {
      cleanupExpired();
      let pattern = '*';
      const matchIndex = args.findIndex(arg => arg === 'MATCH' || arg === 'match');
      if (matchIndex !== -1 && args[matchIndex + 1]) {
        pattern = String(args[matchIndex + 1]);
      }
      
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      const keys = Array.from(inMemoryStore.keys()).filter(key => regex.test(key));
      return ['0', keys];
    },

    // Pipeline (simplified - just executes commands sequentially)
    pipeline() {
      const commands: Array<{ method: string; args: unknown[] }> = [];
      
      const pipelineProxy = new Proxy({} as Record<string, unknown>, {
        get: (_target, prop: string) => {
          if (prop === 'exec') {
            return async () => {
              const results: Array<[Error | null, unknown]> = [];
              for (const cmd of commands) {
                try {
                  const method = (mockClient as Record<string, unknown>)[cmd.method];
                  if (typeof method === 'function') {
                    const result = await method.apply(mockClient, cmd.args);
                    results.push([null, result]);
                  }
                } catch (err) {
                  results.push([err as Error, null]);
                }
              }
              return results;
            };
          }
          return (...args: unknown[]) => {
            commands.push({ method: prop, args });
            return pipelineProxy;
          };
        }
      });
      
      return pipelineProxy;
    },

    // Connection commands
    async ping(): Promise<'PONG'> {
      return 'PONG';
    },

    async quit(): Promise<'OK'> {
      return 'OK';
    },

    // Event handlers (no-op for mock)
    on(_event: string, _handler: (...args: unknown[]) => void): Redis {
      return this as unknown as Redis;
    },

    // Status
    status: 'ready' as const,
  };

  // Log mock mode
  if (typeof console !== 'undefined') {
    console.log('⚠️  Redis running in mock mode (in-memory storage)');
  }

  return mockClient as unknown as Redis;
}

// Close Redis connection
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Clear in-memory store (for testing)
export function clearMockStore(): void {
  inMemoryStore.clear();
}

// Export for testing
export { inMemoryStore };
