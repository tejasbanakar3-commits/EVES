import { prisma } from '../../config/database';
import { redis, getLockKey, LOCK_VERIFY_AND_DELETE_SCRIPT } from '../../config/redis';
import { emitToEvent } from '../../config/socket';
import {
  ConflictError,
  NotFoundError,
  LockExpiredError,
  ServiceUnavailableError,
} from '../../middleware/error.middleware';
import { generateBookingCode } from '../../utils/helpers';

export class BookingService {
  async confirmBooking(
    seatId: string,
    userId: string,
    sessionId: string,
    lockToken: string,
    amount: number
  ) {
    // Step 1: Verify Redis lock ownership and atomically delete it
    const lockKey = getLockKey(seatId);
    const expectedValue = `${userId}:${sessionId}`;

    let redisResult: number;
    try {
      redisResult = await redis.eval(
        LOCK_VERIFY_AND_DELETE_SCRIPT,
        1,
        lockKey,
        expectedValue
      ) as number;
    } catch {
      throw new ServiceUnavailableError('Cannot verify lock — Redis unavailable');
    }

    if (redisResult === -1) {
      throw new LockExpiredError('Lock has expired — booking cannot proceed');
    }
    if (redisResult === 0) {
      throw new ConflictError('Lock ownership verification failed');
    }

    // Step 2: PostgreSQL transaction with SELECT FOR UPDATE
    const booking = await prisma.$transaction(async (tx) => {
      // Row-level lock prevents concurrent booking attempts
      const seat = await tx.$queryRaw<Array<{
        id: string;
        event_id: string;
        status: string;
      }>>`
        SELECT id, event_id, status FROM seats
        WHERE id = ${seatId}::uuid
        FOR UPDATE
      `;

      if (!seat || seat.length === 0) {
        throw new NotFoundError('Seat');
      }

      if (seat[0].status === 'BOOKED') {
        throw new ConflictError('Seat is already booked');
      }

      const eventId = seat[0].event_id;
      const bookingCode = generateBookingCode();

      // Create booking record
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          eventId,
          seatId,
          amount,
          paymentStatus: 'SUCCESS',
          bookingStatus: 'CONFIRMED',
        },
      });

      // Update seat to BOOKED
      await tx.seat.update({
        where: { id: seatId },
        data: {
          status: 'BOOKED',
          lockedBy: null,
          lockedUntil: null,
          version: { increment: 1 },
        },
      });

      // Mark lock as CONVERTED
      await tx.lock.updateMany({
        where: { seatId, userId, sessionId, status: 'ACTIVE' },
        data: { status: 'CONVERTED', releasedAt: new Date() },
      });

      return { ...newBooking, eventId };
    });

    // Step 3: Broadcast booking confirmation
    emitToEvent(booking.eventId, 'seat:booked', {
      seatId,
      bookingCode: booking.bookingCode,
      userId,
    });

    emitToEvent(booking.eventId, 'booking:confirmed', {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      seatId,
      userId,
    });

    return booking;
  }

  async getMyBookings(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, type: true, eventDate: true } },
        seat: { select: { seatNumber: true, rowLabel: true, columnNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingById(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        seat: true,
        payments: true,
      },
    });

    if (!booking) throw new NotFoundError('Booking');
    if (booking.userId !== userId) throw new NotFoundError('Booking');

    return booking;
  }
}

export const bookingService = new BookingService();
