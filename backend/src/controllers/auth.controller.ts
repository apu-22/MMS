import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types';

export class AuthController {
  static async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phone } = req.body;
      const result = await AuthService.register(name, email, password, phone);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Account registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Logged in successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'User profile retrieved',
      });
    } catch (error) {
      next(error);
    }
  }
}
