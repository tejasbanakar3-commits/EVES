import { prisma } from '../../config/database';
import { redis, getLockKey } from '../../config/redis';
import { lockService } from '../locks/lock.service';
import { DashboardStats, RaceTestResult } from '@eves/shared';
import { randomUUID } from 'crypto';
import { ValidationError } from '../../middleware/error.middleware';
import { generateBookingCode } from '../../utils/helpers';

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

  async runRaceTest(eventId: string, seatId: string, concurrentUsers: number, runnerUserId: string): Promise<RaceTestResult> {
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

    // Simulate concurrent lock attempts. We use the runner's real userId (so
    // foreign keys hold) but a unique sessionId per attempt to exercise the
    // SET NX EX atomicity. Only one sessionId can win the Redis lock.
    const attempts = Array.from({ length: concurrentUsers }, (_, i) => {
      const syntheticUserLabel = `race-user-${i}`;
      const sessionId = randomUUID();
      return lockService.acquireLock(seatId, runnerUserId, sessionId).then(
        (result) => ({ success: true, userId: syntheticUserLabel, lockToken: result.lockToken, sessionId }),
        (error) => ({ success: false, userId: syntheticUserLabel, error: error.message })
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
      where: { seatId, userId: runnerUserId, status: 'ACTIVE' },
    });

    return {
      totalAttempts: concurrentUsers,
      successCount: successes.length,
      failedCount: failures,
      winner: successes.length > 0 ? successes[0] : undefined,
      timingMs,
    };
  }

  /**
   * Bulk-import bookings as an admin. Each entry must reference an existing
   * AVAILABLE seat. Booked / locked seats are skipped with an explanation.
   * Each successful row is wrapped in a Postgres transaction with row-level
   * locking, mirroring the production booking path (minus payment).
   */
  async importBookings(items: unknown): Promise<{
    total: number;
    imported: number;
    failed: number;
    results: Array<{
      index: number;
      ok: boolean;
      bookingId?: string;
      bookingCode?: string;
      error?: string;
    }>;
  }> {
    if (!Array.isArray(items)) {
      throw new ValidationError('Import payload must be a JSON array of bookings');
    }
    const results: Array<{
      index: number;
      ok: boolean;
      bookingId?: string;
      bookingCode?: string;
      error?: string;
    }> = [];
    let imported = 0;

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] as Record<string, unknown> | null;
      try {
        if (!raw || typeof raw !== 'object') throw new Error('Entry must be an object');
        const eventId = raw.eventId ? String(raw.eventId) : '';
        const seatId = raw.seatId ? String(raw.seatId) : '';
        const userEmail = raw.userEmail ? String(raw.userEmail).toLowerCase().trim() : '';
        const amount = Number(raw.amount ?? 0);
        if (!eventId) throw new Error('eventId is required');
        if (!seatId) throw new Error('seatId is required');
        if (!userEmail) throw new Error('userEmail is required');
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be a positive number');

        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!user) throw new Error(`User with email ${userEmail} not found`);

        const seat = await prisma.seat.findUnique({ where: { id: seatId } });
        if (!seat) throw new Error('Seat not found');
        if (seat.eventId !== eventId) throw new Error('Seat does not belong to event');
        if (seat.status === 'BOOKED') throw new Error('Seat is already booked');
        if (seat.status === 'LOCKED') throw new Error('Seat is currently locked');

        const bookingCode = generateBookingCode();
        const booking = await prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
            SELECT id, status FROM seats WHERE id = ${seatId} FOR UPDATE
          `;
          if (!rows.length) throw new Error('Seat vanished during import');
          if (rows[0].status !== 'AVAILABLE') throw new Error(`Seat is ${rows[0].status}`);

          const newBooking = await tx.booking.create({
            data: {
              bookingCode,
              userId: user.id,
              eventId,
              seatId,
              amount,
              paymentStatus: 'SUCCESS',
              bookingStatus: 'CONFIRMED',
            },
          });
          await tx.seat.update({
            where: { id: seatId },
            data: {
              status: 'BOOKED',
              lockedBy: null,
              lockedUntil: null,
              version: { increment: 1 },
            },
          });
          await tx.payment.create({
            data: {
              bookingId: newBooking.id,
              userId: user.id,
              amount,
              status: 'SUCCESS',
              simulationType: 'SUCCESS',
            },
          });
          return newBooking;
        });

        // Free any stale Redis lock just in case
        await redis.del(getLockKey(seatId));

        imported++;
        results.push({
          index: i,
          ok: true,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
        });
      } catch (err: unknown) {
        results.push({
          index: i,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      total: items.length,
      imported,
      failed: items.length - imported,
      results,
    };
  }
}

export const adminService = new AdminService();
