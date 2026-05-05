import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { redis, getLockKey, getQueueKey, LOCK_RELEASE_SCRIPT, LOCK_EXTEND_SCRIPT } from '../../config/redis';
import { env } from '../../config/env';
import { emitToEvent } from '../../config/socket';
import {
  ConflictError,
  NotFoundError,
  AuthenticationError,
  LockExpiredError,
} from '../../middleware/error.middleware';
import { LockResult, QueuePosition } from '@eves/shared';

export class LockService {
  async acquireLock(seatId: string, userId: string, sessionId: string): Promise<LockResult> {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { event: { select: { id: true } } },
    });
    if (!seat) throw new NotFoundError('Seat');
    if (seat.status === 'BOOKED') throw new ConflictError('Seat is already booked');

    const lockKey = getLockKey(seatId);
    const lockValue = `${userId}:${sessionId}`;
    const ttl = env.LOCK_TTL_SECONDS;

    const result = await redis.set(lockKey, lockValue, 'EX', ttl, 'NX');

    if (!result) {
      const queuePosition = await this.addToQueue(seatId, userId);
      throw new ConflictError(
        JSON.stringify({
          message: 'Seat is already locked by another user',
          queue: queuePosition,
        })
      );
    }

    const lockToken = randomUUID();
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await prisma.$transaction([
      prisma.seat.update({
        where: { id: seatId },
        data: {
          status: 'LOCKED',
          lockedBy: userId,
          lockedUntil: expiresAt,
          version: { increment: 1 },
        },
      }),
      prisma.lock.create({
        data: {
          seatId,
          eventId: seat.eventId,
          userId,
          sessionId,
          lockToken,
          status: 'ACTIVE',
          expiresAt,
        },
      }),
    ]);

    emitToEvent(seat.eventId, 'seat:locked', {
      seatId,
      userId,
      expiresAt: expiresAt.toISOString(),
    });

    return { lockToken, seatId, expiresAt, ttlSeconds: ttl };
  }

  async releaseLock(seatId: string, userId: string, sessionId: string): Promise<void> {
    const lockKey = getLockKey(seatId);
    const lockValue = `${userId}:${sessionId}`;

    const released = await redis.eval(LOCK_RELEASE_SCRIPT, 1, lockKey, lockValue) as number;
    if (released === 0) {
      throw new AuthenticationError('You do not own this lock');
    }

    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      select: { eventId: true, status: true },
    });

    if (seat && seat.status !== 'BOOKED') {
      await prisma.$transaction([
        prisma.seat.update({
          where: { id: seatId },
          data: {
            status: 'AVAILABLE',
            lockedBy: null,
            lockedUntil: null,
            version: { increment: 1 },
          },
        }),
        prisma.lock.updateMany({
          where: { seatId, userId, sessionId, status: 'ACTIVE' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        }),
      ]);

      emitToEvent(seat.eventId, 'seat:available', { seatId });
      await this.notifyQueueHead(seatId, seat.eventId);
    }
  }

  async extendLock(seatId: string, userId: string, sessionId: string, additionalSeconds?: number): Promise<{ expiresAt: Date }> {
    const lockKey = getLockKey(seatId);
    const lockValue = `${userId}:${sessionId}`;
    const extension = additionalSeconds || env.LOCK_TTL_SECONDS;

    const ttl = await redis.ttl(lockKey);
    if (ttl <= 0) throw new LockExpiredError();

    const newTtl = ttl + extension;
    const extended = await redis.eval(LOCK_EXTEND_SCRIPT, 1, lockKey, lockValue, String(newTtl)) as number;
    if (extended === 0) {
      throw new AuthenticationError('You do not own this lock');
    }

    const expiresAt = new Date(Date.now() + newTtl * 1000);

    await prisma.seat.update({
      where: { id: seatId },
      data: { lockedUntil: expiresAt },
    });

    await prisma.lock.updateMany({
      where: { seatId, userId, sessionId, status: 'ACTIVE' },
      data: { expiresAt },
    });

    return { expiresAt };
  }

  async getMyActiveLocks(userId: string) {
    const locks = await prisma.lock.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        seat: { select: { seatNumber: true, rowLabel: true, columnNumber: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { lockedAt: 'desc' },
    });

    const locksWithTtl = await Promise.all(
      locks.map(async (lock) => {
        const ttl = await redis.ttl(getLockKey(lock.seatId));
        return { ...lock, remainingTtl: ttl > 0 ? ttl : 0 };
      })
    );

    return locksWithTtl;
  }

  private async addToQueue(seatId: string, userId: string): Promise<QueuePosition> {
    const queueKey = getQueueKey(seatId);
    const score = Date.now();
    await redis.zadd(queueKey, score, userId);
    await redis.expire(queueKey, env.LOCK_TTL_SECONDS + 60);

    const position = await redis.zrank(queueKey, userId);
    const total = await redis.zcard(queueKey);

    return {
      seatId,
      position: (position ?? 0) + 1,
      totalInQueue: total,
    };
  }

  private async notifyQueueHead(seatId: string, eventId: string): Promise<void> {
    const queueKey = getQueueKey(seatId);
    const members = await redis.zrange(queueKey, 0, 0);
    if (members.length > 0) {
      emitToEvent(eventId, 'queue:update', {
        seatId,
        nextUserId: members[0],
        message: 'The seat is now available for you to lock',
      });
      await redis.zrem(queueKey, members[0]);
    }
  }
}

export const lockService = new LockService();
