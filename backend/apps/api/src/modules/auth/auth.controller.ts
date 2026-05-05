import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async register(req: Request, res: Response) {
    const { name, email, password, phone } = req.body;
    const result = await authService.register(name, email, password, phone);
    res.status(201).json({ success: true, data: result });
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  }

  async getMe(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  }
}

export const authController = new AuthController();
