import { prisma } from '../../config/database';
import { NotFoundError } from '../../middleware/error.middleware';
import { SeatAvailability } from '@eves/shared';

export class SeatService {
  async getSeatGrid(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Event');

    const seats = await prisma.seat.findMany({
      where: { eventId },
      orderBy: [{ rowLabel: 'asc' }, { columnNumber: 'asc' }],
      select: {
        id: true,
        seatNumber: true,
        rowLabel: true,
        columnNumber: true,
        status: true,
        lockedBy: true,
        lockedUntil: true,
      },
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        rows: event.rows,
        columns: event.columns,
      },
      seats,
    };
  }

  async getAvailability(eventId: string): Promise<SeatAvailability> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Event');

    const [available, locked, booked] = await Promise.all([
      prisma.seat.count({ where: { eventId, status: 'AVAILABLE' } }),
      prisma.seat.count({ where: { eventId, status: 'LOCKED' } }),
      prisma.seat.count({ where: { eventId, status: 'BOOKED' } }),
    ]);

    return {
      total: available + locked + booked,
      available,
      locked,
      booked,
    };
  }
}

export const seatService = new SeatService();
