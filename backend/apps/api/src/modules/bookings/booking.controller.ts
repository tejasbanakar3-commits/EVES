import { Request, Response } from 'express';
import { bookingService } from './booking.service';

export class BookingController {
  async confirmBooking(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, lockToken, amount } = req.body;
    const booking = await bookingService.confirmBooking(seatId, userId, sessionId, lockToken, amount);
    res.status(201).json({ success: true, data: booking });
  }

  async getMyBookings(req: Request, res: Response) {
    const bookings = await bookingService.getMyBookings(req.user!.id);
    res.json({ success: true, data: bookings });
  }

  async getBookingById(req: Request, res: Response) {
    const booking = await bookingService.getBookingById(req.params.bookingId, req.user!.id);
    res.json({ success: true, data: booking });
  }
}

export const bookingController = new BookingController();
