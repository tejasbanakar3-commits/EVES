import { prisma } from '../../config/database';
import { redis, getLockKey } from '../../config/redis';
import { env } from '../../config/env';
import { lockService } from '../locks/lock.service';
import { DashboardStats, RaceTestResult } from '@eves/shared';
import { randomUUID } from 'crypto';

export class AdminService {
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalEvents,
      totalSeats,
      availableSeats,
      lockedSeats,
      bookedSeats,
      activeLocksCount,
      totalBookings,
      totalRecoveries,
    ] = await Promise.all([
      prisma.event.count({ where: { status: 'ACTIVE' } }),
      prisma.seat.count(),
      prisma.seat.count({ where: { status: 'AVAILABLE' } }),
      prisma.seat.count({ where: { status: 'LOCKED' } }),
      prisma.seat.count({ where: { status: 'BOOKED' } }),
      prisma.lock.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      prisma.recoveryLog.count({ where: { recoveryStatus: 'SUCCESS' } }),
    ]);

    return {
      totalEvents,
      totalSeats,
      availableSeats,
      lockedSeats,
      bookedSeats,
      activeLocksCount,
      totalBookings,
      totalRecoveries,
    };
  }

  async getActiveLocks() {
    const locks = await prisma.lock.findMany({
      where: { status: 'ACTIVE' },
      include: {
        seat: { select: { seatNumber: true, rowLabel: true } },
        event: { select: { title: true } },
        user: { select: { name: true, email: true } },
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

  async getAllBookings(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true } },
          seat: { select: { seatNumber: true } },
        },
      }),
      prisma.booking.count(),
    ]);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async resetDemo() {
    await prisma.$transaction([
      prisma.recoveryLog.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.lock.deleteMany(),
      prisma.seat.updateMany({
        data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null, version: 0 },
      }),
    ]);

    // Flush all lock keys from Redis
    const keys = await redis.keys('lock:seat:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    const queueKeys = await redis.keys('queue:seat:*');
    if (queueKeys.length > 0) {
      await redis.del(...queueKeys);
    }

    return { message: 'Demo data reset successfully' };
  }

  async runRaceTest(eventId: string, seatId: string, concurrentUsers: number): Promise<RaceTestResult> {
    // First ensure the seat is available
    await prisma.seat.update({
      where: { id: seatId },
      data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
    });
    await redis.del(getLockKey(seatId));

    // Delete any existing active locks for this seat
    await prisma.lock.updateMany({
      where: { seatId, status: 'ACTIVE' },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    const startTime = Date.now();

    // Simulate concurrent lock attempts
    const attempts = Array.from({ length: concurrentUsers }, (_, i) => {
      const userId = `race-user-${i}`;
      const sessionId = randomUUID();
      return lockService.acquireLock(seatId, userId, sessionId).then(
        (result) => ({ success: true, userId, lockToken: result.lockToken }),
        (error) => ({ success: false, userId, error: error.message })
      );
    });

    const results = await Promise.allSettled(attempts);
    const timingMs = Date.now() - startTime;

    const successes = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .filter((v) => v.success);

    const failures = concurrentUsers - successes.length;

    // Clean up race test data
    await prisma.seat.update({
      where: { id: seatId },
      data: { status: 'AVAILABLE', lockedBy: null, lockedUntil: null },
    });
    await redis.del(getLockKey(seatId));
    await prisma.lock.deleteMany({
      where: { seatId, userId: { startsWith: 'race-user-' } },
    });

    return {
      totalAttempts: concurrentUsers,
      successCount: successes.length,
      failedCount: failures,
      winner: successes.length > 0 ? successes[0] : undefined,
      timingMs,
    };
  }
}

export const adminService = new AdminService();
