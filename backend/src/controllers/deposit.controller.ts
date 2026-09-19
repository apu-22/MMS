import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { DepositService } from '../services/deposit.service';

export class DepositController {
  /**
   * POST /api/deposits
   * Submit deposit slip: auto-approved for Manager, PENDING for Member
   */
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      const role = req.membership?.role;

      if (!messId || !userId || !role) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      const { amount, depositDate, paymentMethod, transactionRef, notes, targetUserId } = req.body;

      const deposit = await DepositService.createDeposit(
        {
          messId,
          amount: Number(amount),
          depositDate,
          paymentMethod,
          transactionRef,
          notes,
          targetUserId: targetUserId ? Number(targetUserId) : undefined,
        },
        userId,
        role
      );

      res.status(201).json({
        success: true,
        data: deposit,
        message: role === 'MANAGER' ? 'Deposit recorded and approved' : 'Deposit slip submitted for manager approval',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deposits
   * List deposits with month, status, and user filters
   */
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      const monthYear = req.query.month as string | undefined;
      const status = (req.query.status as any) || 'ALL';
      const targetUserId = req.query.userId ? Number(req.query.userId) : undefined;

      const data = await DepositService.getDeposits({
        messId,
        monthYear,
        status,
        userId: targetUserId,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/deposits/:id/status
   * Manager approves or rejects a deposit slip
   */
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const depositId = Number(req.params.id);

      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      if (!depositId || isNaN(depositId)) {
        throw new AppError('Valid deposit ID is required', 400, 'INVALID_DEPOSIT_ID');
      }

      const { status } = req.body;
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        throw new AppError('Status must be APPROVED or REJECTED', 400, 'INVALID_STATUS');
      }

      const updated = await DepositService.updateDepositStatus(depositId, messId, status);

      res.status(200).json({
        success: true,
        data: updated,
        message: `Deposit slip marked as ${status}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/deposits/:id
   * Manager can delete any; Member can delete their own PENDING deposit
   */
  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      const role = req.membership?.role;
      const depositId = Number(req.params.id);

      if (!messId || !userId || !role) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      if (!depositId || isNaN(depositId)) {
        throw new AppError('Valid deposit ID is required', 400, 'INVALID_DEPOSIT_ID');
      }

      const result = await DepositService.deleteDeposit(depositId, messId, userId, role);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
