import { Request, Response } from 'express';
import { lockService } from './lock.service';

export class LockController {
  async acquireLock(req: Request, res: Response) {
    const { seatId } = req.params;
    const userId = req.user!.id;
    const { sessionId } = req.body;
    const result = await lockService.acquireLock(seatId, userId, sessionId);
    res.status(201).json({ success: true, data: result });
  }

  async releaseLock(req: Request, res: Response) {
    const { seatId } = req.params;
    const userId = req.user!.id;
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    await lockService.releaseLock(seatId, userId, sessionId);
    res.json({ success: true, message: 'Lock released' });
  }

  async extendLock(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, additionalSeconds } = req.body;
    const result = await lockService.extendLock(seatId, userId, sessionId, additionalSeconds);
    res.json({ success: true, data: result });
  }

  async getMyActiveLocks(req: Request, res: Response) {
    const locks = await lockService.getMyActiveLocks(req.user!.id);
    res.json({ success: true, data: locks });
  }
}

export const lockController = new LockController();
