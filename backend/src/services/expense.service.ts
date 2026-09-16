import { query } from '../config/db';
import { AppError } from '../types';
import {
  ExpenseDTO,
  ExpenseCategory,
  ExpenseStatus,
  CreateExpenseInputDTO,
  ExpenseFilterQuery,
  ExpenseListResponseDTO,
} from '../types/expense.types';

export class ExpenseService {
  /**
   * Helper to ensure billing_months record exists for mess and month_year
   */
  static async getOrCreateBillingMonth(
    messId: number,
    monthYear: string
  ): Promise<{ id: number; status: 'OPEN' | 'CLOSED' }> {
    const rows = await query<any[]>(
      'SELECT id, status FROM billing_months WHERE mess_id = ? AND month_year = ? LIMIT 1',
      [messId, monthYear]
    );

    if (rows.length > 0) {
      return { id: rows[0].id, status: rows[0].status };
    }

    const result = await query<any>(
      'INSERT INTO billing_months (mess_id, month_year, status) VALUES (?, ?, "OPEN")',
      [messId, monthYear]
    );

    return { id: result.insertId, status: 'OPEN' };
  }

  /**
   * Log an expense.
   * Auto-approved if created by Manager, status = 'PENDING' if logged by Member.
   */
  static async createExpense(
    input: CreateExpenseInputDTO,
    callerUserId: number,
    callerRole: 'MANAGER' | 'MEMBER'
  ): Promise<ExpenseDTO> {
    const { messId, category, title, amount, expenseDate, description } = input;

    if (!title || title.trim().length === 0) {
      throw new AppError('Expense title is required', 400, 'INVALID_TITLE');
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
    }

    if (category !== 'BAZAR' && category !== 'SHARED_FIXED') {
      throw new AppError('Category must be BAZAR or SHARED_FIXED', 400, 'INVALID_CATEGORY');
    }

    if (!expenseDate || expenseDate.length < 10) {
      throw new AppError('Valid expense date (YYYY-MM-DD) is required', 400, 'INVALID_DATE');
    }

    const monthYear = expenseDate.substring(0, 7);

    // 1. Resolve billing month
    const billingMonth = await this.getOrCreateBillingMonth(messId, monthYear);
    if (billingMonth.status === 'CLOSED') {
      throw new AppError(
        `Billing month ${monthYear} is closed. Cannot add expenses to a finalized period.`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    // 2. Determine initial status
    const initialStatus: ExpenseStatus = callerRole === 'MANAGER' ? 'APPROVED' : 'PENDING';

    // 3. Insert expense
    const result = await query<any>(
      `INSERT INTO expenses 
        (mess_id, billing_month_id, category, title, description, amount, expense_date, paid_by_user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messId,
        billingMonth.id,
        category,
        title.trim(),
        description?.trim() || null,
        amount,
        expenseDate,
        callerUserId,
        initialStatus,
      ]
    );

    const created = await this.getExpenseById(result.insertId, messId);
    if (!created) {
      throw new AppError('Failed to fetch newly created expense', 500, 'EXPENSE_FETCH_FAILED');
    }

    return created;
  }

  /**
   * Fetch single expense by ID
   */
  static async getExpenseById(expenseId: number, messId: number): Promise<ExpenseDTO | null> {
    const rows = await query<any[]>(
      `SELECT 
        e.id,
        e.mess_id,
        e.billing_month_id,
        bm.month_year,
        e.category,
        e.title,
        e.description,
        e.amount,
        DATE_FORMAT(e.expense_date, '%Y-%m-%d') as expense_date,
        e.paid_by_user_id,
        u.name as paid_by_user_name,
        u.email as paid_by_user_email,
        e.status,
        e.created_at,
        e.updated_at
      FROM expenses e
      JOIN billing_months bm ON e.billing_month_id = bm.id
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.id = ? AND e.mess_id = ?
      LIMIT 1`,
      [expenseId, messId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      messId: r.mess_id,
      billingMonthId: r.billing_month_id,
      monthYear: r.month_year,
      category: r.category,
      title: r.title,
      description: r.description,
      amount: Number(r.amount),
      expenseDate: r.expense_date,
      paidByUserId: r.paid_by_user_id,
      paidByUserName: r.paid_by_user_name,
      paidByUserEmail: r.paid_by_user_email,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  /**
   * List expenses with filters and calculate summary aggregates
   */
  static async getExpenses(filters: ExpenseFilterQuery): Promise<ExpenseListResponseDTO> {
    const { messId, monthYear, category, status } = filters;

    let sql = `
      SELECT 
        e.id,
        e.mess_id,
        e.billing_month_id,
        bm.month_year,
        e.category,
        e.title,
        e.description,
        e.amount,
        DATE_FORMAT(e.expense_date, '%Y-%m-%d') as expense_date,
        e.paid_by_user_id,
        u.name as paid_by_user_name,
        u.email as paid_by_user_email,
        e.status,
        e.created_at,
        e.updated_at
      FROM expenses e
      JOIN billing_months bm ON e.billing_month_id = bm.id
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.mess_id = ?
    `;

    const params: any[] = [messId];

    if (monthYear) {
      sql += ' AND bm.month_year = ?';
      params.push(monthYear);
    }

    if (category && category !== 'ALL') {
      sql += ' AND e.category = ?';
      params.push(category);
    }

    if (status && status !== 'ALL') {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    const rows = await query<any[]>(sql, params);

    let totalBazar = 0;
    let totalSharedFixed = 0;
    let totalApproved = 0;
    let totalPending = 0;

    const expenses: ExpenseDTO[] = rows.map((r) => {
      const amt = Number(r.amount);

      if (r.status === 'APPROVED') {
        totalApproved += amt;
        if (r.category === 'BAZAR') totalBazar += amt;
        if (r.category === 'SHARED_FIXED') totalSharedFixed += amt;
      } else if (r.status === 'PENDING') {
        totalPending += amt;
      }

      return {
        id: r.id,
        messId: r.mess_id,
        billingMonthId: r.billing_month_id,
        monthYear: r.month_year,
        category: r.category,
        title: r.title,
        description: r.description,
        amount: amt,
        expenseDate: r.expense_date,
        paidByUserId: r.paid_by_user_id,
        paidByUserName: r.paid_by_user_name,
        paidByUserEmail: r.paid_by_user_email,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return {
      expenses,
      summary: {
        totalBazar: Number(totalBazar.toFixed(2)),
        totalSharedFixed: Number(totalSharedFixed.toFixed(2)),
        totalApproved: Number(totalApproved.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        totalCount: expenses.length,
      },
    };
  }

  /**
   * Manager updates expense status (APPROVED / REJECTED)
   */
  static async updateExpenseStatus(
    expenseId: number,
    messId: number,
    newStatus: 'APPROVED' | 'REJECTED'
  ): Promise<ExpenseDTO> {
    if (newStatus !== 'APPROVED' && newStatus !== 'REJECTED') {
      throw new AppError('Status must be APPROVED or REJECTED', 400, 'INVALID_STATUS');
    }

    const checkRows = await query<any[]>(
      `SELECT e.id, bm.month_year, bm.status as month_status 
       FROM expenses e
       JOIN billing_months bm ON e.billing_month_id = bm.id
       WHERE e.id = ? AND e.mess_id = ? LIMIT 1`,
      [expenseId, messId]
    );

    if (checkRows.length === 0) {
      throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
    }

    if (checkRows[0].month_status === 'CLOSED') {
      throw new AppError(
        `Cannot alter expense in closed month ${checkRows[0].month_year}`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    await query(
      'UPDATE expenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND mess_id = ?',
      [newStatus, expenseId, messId]
    );

    const updated = await this.getExpenseById(expenseId, messId);
    return updated!;
  }

  /**
   * Delete expense
   * Manager can delete any expense in open month.
   * Member can only delete their own PENDING expense.
   */
  static async deleteExpense(
    expenseId: number,
    messId: number,
    callerUserId: number,
    callerRole: 'MANAGER' | 'MEMBER'
  ): Promise<{ message: string }> {
    const checkRows = await query<any[]>(
      `SELECT e.id, e.paid_by_user_id, e.status, bm.month_year, bm.status as month_status 
       FROM expenses e
       JOIN billing_months bm ON e.billing_month_id = bm.id
       WHERE e.id = ? AND e.mess_id = ? LIMIT 1`,
      [expenseId, messId]
    );

    if (checkRows.length === 0) {
      throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
    }

    const exp = checkRows[0];

    if (exp.month_status === 'CLOSED') {
      throw new AppError(
        `Cannot delete expense in closed month ${exp.month_year}`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    // Permission check
    if (callerRole !== 'MANAGER') {
      if (exp.paid_by_user_id !== callerUserId) {
        throw new AppError('You can only delete your own expenses', 403, 'UNAUTHORIZED_DELETE');
      }
      if (exp.status !== 'PENDING') {
        throw new AppError('Members cannot delete approved or rejected expenses', 403, 'CANNOT_DELETE_PROCESSED');
      }
    }

    await query('DELETE FROM expenses WHERE id = ? AND mess_id = ?', [expenseId, messId]);

    return { message: 'Expense deleted successfully' };
  }
}
