import { prisma } from '../../config/database';
import { NotFoundError } from '../../middleware/error.middleware';
import { CreateEventInput } from '@eves/shared';

export class EventService {
  async listEvents() {
    return prisma.event.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { eventDate: 'asc' },
      include: {
        _count: { select: { seats: true, bookings: true } },
      },
    });
  }

  async getEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { seats: true, bookings: true },
        },
      },
    });
    if (!event) throw new NotFoundError('Event');
    return event;
  }

  async createEvent(data: CreateEventInput) {
    return prisma.event.create({
      data: {
        title: data.title,
        type: data.type,
        source: data.source,
        destination: data.destination,
        venue: data.venue,
        eventDate: new Date(data.eventDate),
        totalSeats: data.rows * data.columns,
        rows: data.rows,
        columns: data.columns,
      },
    });
  }

  async generateSeats(eventId: string, rows?: number, columns?: number) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Event');

    const seatRows = rows || event.rows;
    const seatCols = columns || event.columns;

    const existingSeats = await prisma.seat.count({ where: { eventId } });
    if (existingSeats > 0) {
      await prisma.seat.deleteMany({ where: { eventId } });
    }

    const seats = [];
    for (let r = 0; r < seatRows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= seatCols; c++) {
        seats.push({
          eventId,
          seatNumber: `${rowLabel}${c}`,
          rowLabel,
          columnNumber: c,
          status: 'AVAILABLE' as const,
        });
      }
    }

    await prisma.seat.createMany({ data: seats });

    await prisma.event.update({
      where: { id: eventId },
      data: { totalSeats: seatRows * seatCols, rows: seatRows, columns: seatCols },
    });

    return { generated: seats.length, rows: seatRows, columns: seatCols };
  }
}

export const eventService = new EventService();
