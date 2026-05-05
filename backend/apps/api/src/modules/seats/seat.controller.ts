import { Request, Response } from 'express';
import { seatService } from './seat.service';

export class SeatController {
  async getSeatGrid(req: Request, res: Response) {
    const data = await seatService.getSeatGrid(req.params.eventId);
    res.json({ success: true, data });
  }

  async getAvailability(req: Request, res: Response) {
    const data = await seatService.getAvailability(req.params.eventId);
    res.json({ success: true, data });
  }
}

export const seatController = new SeatController();
