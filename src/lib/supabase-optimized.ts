import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://fhjgvffnvczzphfjghim.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoamd2ZmZudmN6enBoZmpnaGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDM0MzEsImV4cCI6MjA2OTM3OTQzMX0.exu_FgWLwYdt8KfKGvWH2jXp0qlHlkoefc-qgyNwCQQ";

// Optimized Supabase client for high-traffic scenarios
export const supabaseOptimized = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable for performance if not using OAuth redirects
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit real-time events
    },
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Cache-Control': 'max-age=300', // 5 minutes cache for GET requests
      'Connection': 'keep-alive',
    },
    fetch: (url, options) => {
      // Add request timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
});

// Connection pool management
class SupabaseConnectionPool {
  private activeConnections = new Set<Promise<any>>();
  private maxConnections = 50; // Limit concurrent connections

  async executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    if (this.activeConnections.size >= this.maxConnections) {
      // Wait for a connection to free up
      await Promise.race(Array.from(this.activeConnections));
    }

    const queryPromise = queryFn();
    this.activeConnections.add(queryPromise);

    try {
      return await queryPromise;
    } finally {
      this.activeConnections.delete(queryPromise);
    }
  }

  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }
}

export const connectionPool = new SupabaseConnectionPool();

// Optimized query functions with caching
export const createOptimizedQuery = <T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default TTL
) => {
  const cache = new Map<string, { data: T; timestamp: number }>();

  return async (): Promise<T> => {
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    const result = await connectionPool.executeQuery(queryFn);
    cache.set(key, { data: result, timestamp: now });

    // Clean up old cache entries
    setTimeout(() => {
      cache.delete(key);
    }, ttl);

    return result;
  };
};

// Batch query executor to reduce database round trips
export class QueryBatcher {
  private batches = new Map<string, Array<{ resolve: (value: any) => void; reject: (reason?: any) => void; args: any[] }>>();
  private timers = new Map<string, NodeJS.Timeout>();

  batch<T>(
    key: string,
    fn: (args: any[]) => Promise<T[]>,
    args: any,
    delay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(key)) {
        this.batches.set(key, []);
      }

      this.batches.get(key)!.push({ resolve, reject, args });

      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        const batch = this.batches.get(key) || [];
        this.batches.delete(key);
        this.timers.delete(key);

        if (batch.length === 0) return;

        try {
          const allArgs = batch.map(item => item.args);
          const results = await fn(allArgs);

          batch.forEach((item, index) => {
            item.resolve(results[index]);
          });
        } catch (error) {
          batch.forEach(item => {
            item.reject(error);
          });
        }
      }, delay);

      this.timers.set(key, timer);
    });
  }
}

export const queryBatcher = new QueryBatcher();

// Real-time subscription manager with throttling
class RealtimeManager {
  private subscriptions = new Map<string, any>();
  private throttleCache = new Map<string, { data: any; timestamp: number }>();
  private readonly throttleDelay = 1000; // 1 second throttle

  subscribe(
    channelName: string,
    table: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ) {
    // Remove existing subscription if exists
    this.unsubscribe(channelName);

    const channel = supabaseOptimized
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filters ? Object.entries(filters).map(([k, v]) => `${k}=eq.${v}`).join(',') : undefined,
        },
        (payload) => {
          // Throttle rapid updates
          const now = Date.now();
          const cached = this.throttleCache.get(channelName);
          
          if (!cached || now - cached.timestamp > this.throttleDelay) {
            this.throttleCache.set(channelName, { data: payload, timestamp: now });
            callback(payload);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      supabaseOptimized.removeChannel(subscription);
      this.subscriptions.delete(channelName);
      this.throttleCache.delete(channelName);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
  }
}

export const realtimeManager = new RealtimeManager();
