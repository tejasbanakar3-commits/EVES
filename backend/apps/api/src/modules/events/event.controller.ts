import { Request, Response } from 'express';
import { eventService } from './event.service';

export class EventController {
  async listEvents(_req: Request, res: Response) {
    const events = await eventService.listEvents();
    res.json({ success: true, data: events });
  }

  async getEvent(req: Request, res: Response) {
    const event = await eventService.getEvent(req.params.eventId);
    res.json({ success: true, data: event });
  }

  async createEvent(req: Request, res: Response) {
    const event = await eventService.createEvent(req.body);
    res.status(201).json({ success: true, data: event });
  }

  async importEvents(req: Request, res: Response) {
    const items = Array.isArray(req.body) ? req.body : req.body?.events;
    const result = await eventService.importEvents(items);
    res.status(201).json({ success: true, data: result });
  }

  async generateSeats(req: Request, res: Response) {
    const { rows, columns } = req.body;
    const result = await eventService.generateSeats(req.params.eventId, rows, columns);
    res.status(201).json({ success: true, data: result });
  }
}

export const eventController = new EventController();
