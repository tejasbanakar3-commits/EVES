import { prisma } from '../../config/database';
import { redis, getLockKey, LOCK_RELEASE_SCRIPT } from '../../config/redis';
import { emitToEvent } from '../../config/socket';
import { NotFoundError, LockExpiredError } from '../../middleware/error.middleware';
import { bookingService } from '../bookings/booking.service';

export class PaymentService {
  async simulateSuccess(seatId: string, userId: string, sessionId: string, lockToken: string, amount: number) {
    const lock = await this.validateLock(seatId, userId, sessionId);

    const booking = await bookingService.confirmBooking(seatId, userId, sessionId, lockToken, amount);

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        amount,
        status: 'SUCCESS',
        simulationType: 'SUCCESS',
      },
    });

    return { booking, paymentStatus: 'SUCCESS' };
  }

  async simulateFailure(seatId: string, userId: string, sessionId: string, lockToken: string, amount: number) {
    const lock = await this.validateLock(seatId, userId, sessionId);

    const booking = await prisma.booking.create({
      data: {
        bookingCode: `FAIL-${Date.now()}`,
        userId,
        eventId: lock.eventId,
        seatId,
        amount,
        paymentStatus: 'FAILED',
        bookingStatus: 'CANCELLED',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        amount,
        status: 'FAILED',
        simulationType: 'FAILURE',
      },
    });

    await this.releaseLockOnFailure(seatId, userId, sessionId, lock.eventId);

    return { booking, paymentStatus: 'FAILED' };
  }

  async simulateTimeout(seatId: string, userId: string, sessionId: string, lockToken: string, amount: number) {
    const lock = await this.validateLock(seatId, userId, sessionId);

    const booking = await prisma.booking.create({
      data: {
        bookingCode: `TIMEOUT-${Date.now()}`,
        userId,
        eventId: lock.eventId,
        seatId,
        amount,
        paymentStatus: 'TIMEOUT',
        bookingStatus: 'CANCELLED',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        amount,
        status: 'TIMEOUT',
        simulationType: 'TIMEOUT',
      },
    });

    await this.releaseLockOnFailure(seatId, userId, sessionId, lock.eventId);

    return { booking, paymentStatus: 'TIMEOUT' };
  }

  async simulateCrash(seatId: string, userId: string, sessionId: string, lockToken: string, amount: number) {
    const lock = await this.validateLock(seatId, userId, sessionId);

    const booking = await prisma.booking.create({
      data: {
        bookingCode: `CRASH-${Date.now()}`,
        userId,
        eventId: lock.eventId,
        seatId,
        amount,
        paymentStatus: 'PENDING',
        bookingStatus: 'PENDING',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        amount,
        status: 'PENDING',
        simulationType: 'CRASH',
      },
    });

    // Simulate crash: do NOT release the lock
    // The recovery worker will detect and clean this up
    emitToEvent(lock.eventId, 'payment:crashed', {
      seatId,
      message: 'Server crash simulated — lock will be recovered by worker',
    });

    return { booking, paymentStatus: 'CRASH_SIMULATED' };
  }

  private async validateLock(seatId: string, userId: string, sessionId: string) {
    const lockKey = getLockKey(seatId);
    const lockValue = await redis.get(lockKey);

    if (!lockValue) {
      throw new LockExpiredError('Lock has expired — cannot process payment');
    }

    const expected = `${userId}:${sessionId}`;
    if (lockValue !== expected) {
      throw new LockExpiredError('You do not own this lock');
    }

    const lock = await prisma.lock.findFirst({
      where: { seatId, userId, sessionId, status: 'ACTIVE' },
    });
    if (!lock) throw new NotFoundError('Active lock');

    return lock;
  }

  private async releaseLockOnFailure(seatId: string, userId: string, sessionId: string, eventId: string) {
    const lockKey = getLockKey(seatId);
    const lockValue = `${userId}:${sessionId}`;

    await redis.eval(LOCK_RELEASE_SCRIPT, 1, lockKey, lockValue);

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

    emitToEvent(eventId, 'seat:available', { seatId });
    emitToEvent(eventId, 'payment:failed', { seatId, userId });
  }
}

export const paymentService = new PaymentService();
