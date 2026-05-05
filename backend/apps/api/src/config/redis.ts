import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

export const LOCK_RELEASE_SCRIPT = `
  local key = KEYS[1]
  local expected = ARGV[1]
  local current = redis.call('GET', key)
  if current == expected then
    redis.call('DEL', key)
    return 1
  end
  return 0
`;

export const LOCK_EXTEND_SCRIPT = `
  local key = KEYS[1]
  local expected = ARGV[1]
  local ttl = tonumber(ARGV[2])
  local current = redis.call('GET', key)
  if current == expected then
    redis.call('EXPIRE', key, ttl)
    return 1
  end
  return 0
`;

export const LOCK_VERIFY_AND_DELETE_SCRIPT = `
  local key = KEYS[1]
  local expected = ARGV[1]
  local current = redis.call('GET', key)
  if current == expected then
    redis.call('DEL', key)
    return 1
  elseif current == false then
    return -1
  end
  return 0
`;

export function getLockKey(seatId: string): string {
  return `lock:seat:${seatId}`;
}

export function getQueueKey(seatId: string): string {
  return `queue:seat:${seatId}`;
}
