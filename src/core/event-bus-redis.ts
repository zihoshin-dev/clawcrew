import { EventBus } from './event-bus.js';

// ---------------------------------------------------------------------------
// DistributedEventBus — interface for Redis Pub/Sub backed event distribution
// ---------------------------------------------------------------------------

export interface DistributedEventBus<T> {
  publish(event: string, payload: unknown): Promise<void>;
  subscribe(event: string, handler: (payload: unknown) => void): void;
  unsubscribe(event: string): void;
}

// ---------------------------------------------------------------------------
// Factory — returns local EventBus until Redis is configured
// ---------------------------------------------------------------------------

/**
 * Creates a distributed event bus.
 *
 * TODO: When Redis is configured (e.g. REDIS_URL env var is set), return a
 * RedisEventBus that implements DistributedEventBus using ioredis pub/sub:
 *
 *   const redis = new Redis(process.env.REDIS_URL);
 *   const sub = redis.duplicate();
 *   return new RedisEventBus(redis, sub);
 *
 * For now this falls back to the local in-process EventBus.
 */
export function createDistributedEventBus<T extends object>(): EventBus<T> {
  return new EventBus<T>();
}
