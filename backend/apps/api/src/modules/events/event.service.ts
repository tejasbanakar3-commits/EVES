import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../middleware/error.middleware';
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
    const type = data.type;
    if (type === 'TRAIN' || type === 'BUS') {
      if (!data.source?.trim() || !data.destination?.trim()) {
        throw new ValidationError('source and destination are required for TRAIN and BUS events');
      }
    } else {
      if (!data.venue?.trim()) {
        throw new ValidationError('venue is required for CINEMA, EVENT and STADIUM events');
      }
    }
    const event = await prisma.event.create({
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
    // Auto-generate seats so the event is immediately bookable
    await this.generateSeats(event.id, data.rows, data.columns);
    return prisma.event.findUnique({
      where: { id: event.id },
      include: { _count: { select: { seats: true, bookings: true } } },
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

  /**
   * Bulk-import events from a JSON array. Each entry is validated against
   * `createEventSchema`-like shape; invalid entries are reported but do not
   * abort the run.
   */
  async importEvents(items: unknown): Promise<{
    total: number;
    imported: number;
    failed: number;
    results: Array<{ index: number; ok: boolean; eventId?: string; error?: string }>;
  }> {
    if (!Array.isArray(items)) {
      throw new ValidationError('Import payload must be a JSON array of events');
    }
    if (items.length > 200) {
      throw new ValidationError('Cannot import more than 200 events at once');
    }

    const results: Array<{ index: number; ok: boolean; eventId?: string; error?: string }> = [];
    let imported = 0;

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] as Record<string, unknown> | null;
      try {
        if (!raw || typeof raw !== 'object') {
          throw new Error('Entry must be an object');
        }
        const title = String(raw.title || '').trim();
        const type = String(raw.type || '').toUpperCase();
        const validTypes = ['TRAIN', 'BUS', 'CINEMA', 'EVENT', 'STADIUM'];
        if (title.length < 2) throw new Error('title is required (min 2 chars)');
        if (!validTypes.includes(type)) throw new Error(`type must be one of ${validTypes.join(', ')}`);
        const eventDateRaw = raw.eventDate ?? raw.date;
        if (!eventDateRaw) throw new Error('eventDate is required');
        const eventDate = new Date(String(eventDateRaw));
        if (Number.isNaN(eventDate.getTime())) throw new Error('eventDate is not a valid date');
        const rows = Number(raw.rows ?? 10);
        const columns = Number(raw.columns ?? 10);
        if (!Number.isInteger(rows) || rows < 1 || rows > 50) throw new Error('rows must be an integer 1..50');
        if (!Number.isInteger(columns) || columns < 1 || columns > 50) throw new Error('columns must be an integer 1..50');

        const created = await this.createEvent({
          title,
          type: type as CreateEventInput['type'],
          source: raw.source ? String(raw.source) : undefined,
          destination: raw.destination ? String(raw.destination) : undefined,
          venue: raw.venue ? String(raw.venue) : undefined,
          eventDate: eventDate.toISOString(),
          totalSeats: rows * columns,
          rows,
          columns,
        });
        imported++;
        results.push({ index: i, ok: true, eventId: created?.id });
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

export const eventService = new EventService();
