import { Request, Response } from 'express';
import { paymentService } from './payment.service';

export class PaymentController {
  async simulateSuccess(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, lockToken, amount } = req.body;
    const result = await paymentService.simulateSuccess(seatId, userId, sessionId, lockToken, amount);
    res.json({ success: true, data: result });
  }

  async simulateFailure(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, lockToken, amount } = req.body;
    const result = await paymentService.simulateFailure(seatId, userId, sessionId, lockToken, amount);
    res.json({ success: true, data: result });
  }

  async simulateTimeout(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, lockToken, amount } = req.body;
    const result = await paymentService.simulateTimeout(seatId, userId, sessionId, lockToken, amount);
    res.json({ success: true, data: result });
  }

  async simulateCrash(req: Request, res: Response) {
    const userId = req.user!.id;
    const { seatId, sessionId, lockToken, amount } = req.body;
    const result = await paymentService.simulateCrash(seatId, userId, sessionId, lockToken, amount);
    res.json({ success: true, data: result });
  }
}

export const paymentController = new PaymentController();
