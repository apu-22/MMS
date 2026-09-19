import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { CalculationService } from '../services/calculation.service';

export class DashboardController {
  /**
   * GET /api/dashboard/summary?month=YYYY-MM
   * Retrieves overall mess financial statistics and live meal rate
   */
  static async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      const monthYear = req.query.month as string | undefined;

      const summary = await CalculationService.getDashboardSummary(messId, monthYear);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/member-ledger?month=YYYY-MM
   * Retrieves full Excel-style financial ledger with all member balances
   */
  static async getMemberLedger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      const monthYear = req.query.month as string | undefined;

      const ledger = await CalculationService.getMemberLedger(messId, monthYear);

      res.status(200).json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/my-summary?month=YYYY-MM
   * Retrieves logged-in user's personalized monthly financial overview
   */
  static async getMySummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;

      if (!messId || !userId) {
        throw new AppError('Mess membership and authentication required', 401, 'UNAUTHORIZED');
      }

      const monthYear = req.query.month as string | undefined;

      const mySummary = await CalculationService.getMySummary(messId, userId, monthYear);

      res.status(200).json({
        success: true,
        data: mySummary,
      });
    } catch (error) {
      next(error);
    }
  }
}
