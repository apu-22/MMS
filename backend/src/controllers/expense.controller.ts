import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { ExpenseService } from '../services/expense.service';

export class ExpenseController {
  /**
   * POST /api/expenses
   * Submit expense: auto-approved for Manager, PENDING for Member
   */
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      const role = req.membership?.role;

      if (!messId || !userId || !role) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      const { category, title, amount, expenseDate, description } = req.body;

      const expense = await ExpenseService.createExpense(
        {
          messId,
          category,
          title,
          amount: Number(amount),
          expenseDate,
          description,
        },
        userId,
        role
      );

      res.status(201).json({
        success: true,
        data: expense,
        message: role === 'MANAGER' ? 'Expense logged and auto-approved' : 'Expense submitted for manager approval',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/expenses
   * List expenses with month, category, and status filters
   */
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      const monthYear = req.query.month as string | undefined;
      const category = (req.query.category as any) || 'ALL';
      const status = (req.query.status as any) || 'ALL';

      const data = await ExpenseService.getExpenses({
        messId,
        monthYear,
        category,
        status,
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
   * PATCH /api/expenses/:id/status
   * Manager approves or rejects an expense
   */
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const expenseId = Number(req.params.id);

      if (!messId) {
        throw new AppError('Mess membership required', 401, 'UNAUTHORIZED');
      }

      if (!expenseId || isNaN(expenseId)) {
        throw new AppError('Valid expense ID is required', 400, 'INVALID_EXPENSE_ID');
      }

      const { status } = req.body;
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        throw new AppError('Status must be APPROVED or REJECTED', 400, 'INVALID_STATUS');
      }

      const updated = await ExpenseService.updateExpenseStatus(expenseId, messId, status);

      res.status(200).json({
        success: true,
        data: updated,
        message: `Expense has been marked as ${status}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/expenses/:id
   * Manager can delete any; Member can delete their own PENDING expense
   */
  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = req.membership?.messId;
      const userId = req.user?.userId;
      const role = req.membership?.role;
      const expenseId = Number(req.params.id);

      if (!messId || !userId || !role) {
        throw new AppError('Authentication and mess membership required', 401, 'UNAUTHORIZED');
      }

      if (!expenseId || isNaN(expenseId)) {
        throw new AppError('Valid expense ID is required', 400, 'INVALID_EXPENSE_ID');
      }

      const result = await ExpenseService.deleteExpense(expenseId, messId, userId, role);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
