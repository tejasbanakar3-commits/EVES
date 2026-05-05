import { Request, Response } from 'express';
import { recoveryService } from './recovery.service';

export class RecoveryController {
  async manualRun(_req: Request, res: Response) {
    const result = await recoveryService.manualRun();
    res.json({ success: true, data: result });
  }

  async getLogs(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await recoveryService.getLogs(page, limit);
    res.json({ success: true, data: result });
  }

  async getStats(_req: Request, res: Response) {
    const stats = await recoveryService.getStats();
    res.json({ success: true, data: stats });
  }
}

export const recoveryController = new RecoveryController();
