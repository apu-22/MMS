import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { MealService } from '../services/meal.service';

export class MealController {
  /**
   * PUT /api/meals/self
   * Member updates personal meal counts for today/future date before cutoff
   */
  static async updateSelfMeal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      if (!messId || !userId) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      const { mealDate, breakfastCount, lunchCount, dinnerCount } = req.body;

      if (!mealDate || typeof mealDate !== 'string') {
        throw new AppError('Valid mealDate (YYYY-MM-DD) is required', 400, 'INVALID_DATE');
      }

      const updatedMeal = await MealService.upsertSelfMeal(
        {
          messId,
          mealDate,
          breakfastCount: Number(breakfastCount ?? 0),
          lunchCount: Number(lunchCount ?? 0),
          dinnerCount: Number(dinnerCount ?? 0),
        },
        userId
      );

      res.status(200).json({
        success: true,
        data: updatedMeal,
        message: 'Meal counts updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/meals/manager-override
   * Manager updates meal counts for any member on any date (bypassing cutoff)
   */
  static async managerOverride(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const managerUserId = req.user?.userId;
      if (!messId || !managerUserId) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      const { targetUserId, mealDate, breakfastCount, lunchCount, dinnerCount } = req.body;

      if (!targetUserId || isNaN(Number(targetUserId))) {
        throw new AppError('targetUserId is required', 400, 'TARGET_USER_REQUIRED');
      }

      if (!mealDate || typeof mealDate !== 'string') {
        throw new AppError('Valid mealDate (YYYY-MM-DD) is required', 400, 'INVALID_DATE');
      }

      const updatedMeal = await MealService.managerOverrideMeal(
        {
          messId,
          targetUserId: Number(targetUserId),
          mealDate,
          breakfastCount: Number(breakfastCount ?? 0),
          lunchCount: Number(lunchCount ?? 0),
          dinnerCount: Number(dinnerCount ?? 0),
        },
        managerUserId
      );

      res.status(200).json({
        success: true,
        data: updatedMeal,
        message: 'Meal record overridden by manager successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meals/daily-sheet?date=YYYY-MM-DD
   * Matrix of all active members and meal counts for requested date
   */
  static async getDailySheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      let dateStr = req.query.date as string;
      if (!dateStr) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      }

      const sheet = await MealService.getDailySheet(messId, dateStr);

      res.status(200).json({
        success: true,
        data: sheet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meals/my-monthly?month=YYYY-MM
   * Personal meal history and breakdown for caller
   */
  static async getMyMonthly(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      if (!messId || !userId) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      let monthStr = req.query.month as string;
      if (!monthStr) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        monthStr = `${y}-${m}`;
      }

      const summary = await MealService.getMyMonthlyMeals(messId, userId, monthStr);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}
