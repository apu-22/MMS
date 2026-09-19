import { query } from '../config/db';
import { AppError } from '../types';
import {
  DepositDTO,
  PaymentMethod,
  DepositStatus,
  CreateDepositInputDTO,
  DepositFilterQuery,
  DepositListResponseDTO,
} from '../types/deposit.types';

export class DepositService {
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
   * Create a deposit.
   * Auto-approved if created by Manager; status = 'PENDING' if submitted by Member.
   */
  static async createDeposit(
    input: CreateDepositInputDTO,
    callerUserId: number,
    callerRole: 'MANAGER' | 'MEMBER'
  ): Promise<DepositDTO> {
    const { messId, amount, depositDate, paymentMethod, transactionRef, notes, targetUserId } = input;

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Deposit amount must be a positive number', 400, 'INVALID_AMOUNT');
    }

    const validMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];
    if (!validMethods.includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD');
    }

    if (!depositDate || depositDate.length < 10) {
      throw new AppError('Valid deposit date (YYYY-MM-DD) is required', 400, 'INVALID_DATE');
    }

    // 1. Resolve which user is depositing
    let finalUserId = callerUserId;
    if (callerRole === 'MANAGER' && targetUserId) {
      const memberRows = await query<any[]>(
        'SELECT status FROM mess_members WHERE mess_id = ? AND user_id = ? LIMIT 1',
        [messId, targetUserId]
      );
      if (memberRows.length === 0 || memberRows[0].status !== 'ACTIVE') {
        throw new AppError('Target user is not an active member of this mess', 400, 'INVALID_TARGET_MEMBER');
      }
      finalUserId = targetUserId;
    }

    // 2. Resolve billing month
    const monthYear = depositDate.substring(0, 7);
    const billingMonth = await this.getOrCreateBillingMonth(messId, monthYear);
    if (billingMonth.status === 'CLOSED') {
      throw new AppError(
        `Billing month ${monthYear} is closed. Cannot record deposits in a finalized cycle.`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    // 3. Initial status
    const initialStatus: DepositStatus = callerRole === 'MANAGER' ? 'APPROVED' : 'PENDING';

    // 4. Insert record
    const result = await query<any>(
      `INSERT INTO deposits 
        (mess_id, billing_month_id, user_id, amount, deposit_date, payment_method, transaction_ref, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messId,
        billingMonth.id,
        finalUserId,
        amount,
        depositDate,
        paymentMethod,
        transactionRef?.trim() || null,
        notes?.trim() || null,
        initialStatus,
      ]
    );

    const created = await this.getDepositById(result.insertId, messId);
    if (!created) {
      throw new AppError('Failed to fetch newly created deposit', 500, 'DEPOSIT_FETCH_FAILED');
    }

    return created;
  }

  /**
   * Fetch single deposit by ID
   */
  static async getDepositById(depositId: number, messId: number): Promise<DepositDTO | null> {
    const rows = await query<any[]>(
      `SELECT 
        d.id,
        d.mess_id,
        d.billing_month_id,
        bm.month_year,
        d.user_id,
        u.name as user_name,
        u.email as user_email,
        d.amount,
        DATE_FORMAT(d.deposit_date, '%Y-%m-%d') as deposit_date,
        d.payment_method,
        d.transaction_ref,
        d.notes,
        d.status,
        d.created_at,
        d.updated_at
      FROM deposits d
      JOIN billing_months bm ON d.billing_month_id = bm.id
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.mess_id = ?
      LIMIT 1`,
      [depositId, messId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      messId: r.mess_id,
      billingMonthId: r.billing_month_id,
      monthYear: r.month_year,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      amount: Number(r.amount),
      depositDate: r.deposit_date,
      paymentMethod: r.payment_method,
      transactionRef: r.transaction_ref,
      notes: r.notes,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  /**
   * List deposits with filters and calculate summary aggregates
   */
  static async getDeposits(filters: DepositFilterQuery): Promise<DepositListResponseDTO> {
    const { messId, monthYear, status, userId } = filters;

    let sql = `
      SELECT 
        d.id,
        d.mess_id,
        d.billing_month_id,
        bm.month_year,
        d.user_id,
        u.name as user_name,
        u.email as user_email,
        d.amount,
        DATE_FORMAT(d.deposit_date, '%Y-%m-%d') as deposit_date,
        d.payment_method,
        d.transaction_ref,
        d.notes,
        d.status,
        d.created_at,
        d.updated_at
      FROM deposits d
      JOIN billing_months bm ON d.billing_month_id = bm.id
      JOIN users u ON d.user_id = u.id
      WHERE d.mess_id = ?
    `;

    const params: any[] = [messId];

    if (monthYear) {
      sql += ' AND bm.month_year = ?';
      params.push(monthYear);
    }

    if (status && status !== 'ALL') {
      sql += ' AND d.status = ?';
      params.push(status);
    }

    if (userId) {
      sql += ' AND d.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY d.deposit_date DESC, d.id DESC';

    const rows = await query<any[]>(sql, params);

    let totalApproved = 0;
    let totalPending = 0;
    let totalCash = 0;
    let totalDigital = 0;

    const deposits: DepositDTO[] = rows.map((r) => {
      const amt = Number(r.amount);

      if (r.status === 'APPROVED') {
        totalApproved += amt;
        if (r.payment_method === 'CASH') {
          totalCash += amt;
        } else {
          totalDigital += amt;
        }
      } else if (r.status === 'PENDING') {
        totalPending += amt;
      }

      return {
        id: r.id,
        messId: r.mess_id,
        billingMonthId: r.billing_month_id,
        monthYear: r.month_year,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        amount: amt,
        depositDate: r.deposit_date,
        paymentMethod: r.payment_method,
        transactionRef: r.transaction_ref,
        notes: r.notes,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return {
      deposits,
      summary: {
        totalApproved: Number(totalApproved.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        totalCash: Number(totalCash.toFixed(2)),
        totalDigital: Number(totalDigital.toFixed(2)),
        totalCount: deposits.length,
      },
    };
  }

  /**
   * Manager updates deposit status (APPROVED / REJECTED)
   */
  static async updateDepositStatus(
    depositId: number,
    messId: number,
    newStatus: 'APPROVED' | 'REJECTED'
  ): Promise<DepositDTO> {
    if (newStatus !== 'APPROVED' && newStatus !== 'REJECTED') {
      throw new AppError('Status must be APPROVED or REJECTED', 400, 'INVALID_STATUS');
    }

    const checkRows = await query<any[]>(
      `SELECT d.id, bm.month_year, bm.status as month_status 
       FROM deposits d
       JOIN billing_months bm ON d.billing_month_id = bm.id
       WHERE d.id = ? AND d.mess_id = ? LIMIT 1`,
      [depositId, messId]
    );

    if (checkRows.length === 0) {
      throw new AppError('Deposit not found', 404, 'DEPOSIT_NOT_FOUND');
    }

    if (checkRows[0].month_status === 'CLOSED') {
      throw new AppError(
        `Cannot alter deposit in closed month ${checkRows[0].month_year}`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    await query(
      'UPDATE deposits SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND mess_id = ?',
      [newStatus, depositId, messId]
    );

    const updated = await this.getDepositById(depositId, messId);
    return updated!;
  }

  /**
   * Delete deposit
   * Manager can delete any deposit in open month.
   * Member can only delete their own PENDING deposit.
   */
  static async deleteDeposit(
    depositId: number,
    messId: number,
    callerUserId: number,
    callerRole: 'MANAGER' | 'MEMBER'
  ): Promise<{ message: string }> {
    const checkRows = await query<any[]>(
      `SELECT d.id, d.user_id, d.status, bm.month_year, bm.status as month_status 
       FROM deposits d
       JOIN billing_months bm ON d.billing_month_id = bm.id
       WHERE d.id = ? AND d.mess_id = ? LIMIT 1`,
      [depositId, messId]
    );

    if (checkRows.length === 0) {
      throw new AppError('Deposit not found', 404, 'DEPOSIT_NOT_FOUND');
    }

    const dep = checkRows[0];

    if (dep.month_status === 'CLOSED') {
      throw new AppError(
        `Cannot delete deposit in closed month ${dep.month_year}`,
        403,
        'BILLING_MONTH_CLOSED'
      );
    }

    // Permission check
    if (callerRole !== 'MANAGER') {
      if (dep.user_id !== callerUserId) {
        throw new AppError('You can only delete your own deposits', 403, 'UNAUTHORIZED_DELETE');
      }
      if (dep.status !== 'PENDING') {
        throw new AppError('Members cannot delete approved or rejected deposits', 403, 'CANNOT_DELETE_PROCESSED');
      }
    }

    await query('DELETE FROM deposits WHERE id = ? AND mess_id = ?', [depositId, messId]);

    return { message: 'Deposit deleted successfully' };
  }
}
