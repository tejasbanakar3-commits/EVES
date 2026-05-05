import { Request, Response } from 'express';
import { adminService } from './admin.service';

export class AdminController {
  async getDashboard(_req: Request, res: Response) {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  }

  async getActiveLocks(_req: Request, res: Response) {
    const locks = await adminService.getActiveLocks();
    res.json({ success: true, data: locks });
  }

  async getAllBookings(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await adminService.getAllBookings(page, limit);
    res.json({ success: true, data: result });
  }

  async resetDemo(_req: Request, res: Response) {
    const result = await adminService.resetDemo();
    res.json({ success: true, data: result });
  }

  async raceTest(req: Request, res: Response) {
    const { eventId, seatId, concurrentUsers } = req.body;
    const result = await adminService.runRaceTest(eventId, seatId, concurrentUsers || 50);
    res.json({ success: true, data: result });
  }
}

export const adminController = new AdminController();
