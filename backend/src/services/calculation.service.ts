import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { query } from '../config/db';
import {
  DashboardSummaryDTO,
  MemberLedgerItemDTO,
  MyFinancialSummaryDTO,
  FixedExpenseItem,
} from '../types/dashboard.types';

export class CalculationService {
  /**
   * Helper: Resolves or inserts billing month for messId and monthYear (YYYY-MM)
   */
  private static async getOrCreateBillingMonth(
    messId: number,
    monthYear: string
  ): Promise<{ id: number; status: 'OPEN' | 'CLOSED'; finalMealRate: number }> {
    const existing = await query<RowDataPacket[]>(
      'SELECT id, status, final_meal_rate FROM billing_months WHERE mess_id = ? AND month_year = ?',
      [messId, monthYear]
    );

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        status: existing[0].status,
        finalMealRate: Number(existing[0].final_meal_rate || 0),
      };
    }

    const result = await query<ResultSetHeader>(
      'INSERT INTO billing_months (mess_id, month_year, status) VALUES (?, ?, "OPEN")',
      [messId, monthYear]
    );

    return {
      id: result.insertId,
      status: 'OPEN',
      finalMealRate: 0,
    };
  }

  /**
   * Calculate overall Mess Financial Summary for a given month
   */
  static async getDashboardSummary(messId: number, monthYear?: string): Promise<DashboardSummaryDTO> {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const billingMonth = await this.getOrCreateBillingMonth(messId, targetMonth);

    // 1. Total Approved Bazar Expenses
    const bazarRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as totalBazar 
       FROM expenses 
       WHERE mess_id = ? AND billing_month_id = ? AND category = 'BAZAR' AND status = 'APPROVED'`,
      [messId, billingMonth.id]
    );
    const totalApprovedBazar = Number(bazarRows[0]?.totalBazar || 0);

    // 2. Total Approved Shared Fixed Expenses
    const fixedRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as totalFixed 
       FROM expenses 
       WHERE mess_id = ? AND billing_month_id = ? AND category = 'SHARED_FIXED' AND status = 'APPROVED'`,
      [messId, billingMonth.id]
    );
    const totalApprovedFixed = Number(fixedRows[0]?.totalFixed || 0);

    // 3. Shared Fixed Expenses Detailed Breakdown
    const breakdownRows = await query<RowDataPacket[]>(
      `SELECT e.id, e.title, e.amount, DATE_FORMAT(e.expense_date, '%Y-%m-%d') as date, u.name as paidByName
       FROM expenses e
       JOIN users u ON e.paid_by_user_id = u.id
       WHERE e.mess_id = ? AND e.billing_month_id = ? AND e.category = 'SHARED_FIXED' AND e.status = 'APPROVED'
       ORDER BY e.amount DESC`,
      [messId, billingMonth.id]
    );
    const fixedExpensesBreakdown: FixedExpenseItem[] = breakdownRows.map((row: RowDataPacket) => ({
      id: row.id,
      title: row.title,
      amount: Number(row.amount),
      date: row.date,
      paidByName: row.paidByName,
    }));

    // 4. Total Mess Meals Eaten in Month
    const mealsRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(total_meals), 0) as totalMeals 
       FROM meals 
       WHERE mess_id = ? AND meal_date LIKE ?`,
      [messId, `${targetMonth}-%`]
    );
    const totalMessMeals = Number(mealsRows[0]?.totalMeals || 0);

    // 5. Total Approved Deposits & Pending Deposits
    const depRows = await query<RowDataPacket[]>(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as totalApproved,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as totalPending
       FROM deposits 
       WHERE mess_id = ? AND billing_month_id = ?`,
      [messId, billingMonth.id]
    );
    const totalApprovedDeposits = Number(depRows[0]?.totalApproved || 0);
    const totalPendingDeposits = Number(depRows[0]?.totalPending || 0);

    // 6. Active Member Count
    const memberRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as activeCount FROM mess_members WHERE mess_id = ? AND status = 'ACTIVE'`,
      [messId]
    );
    const activeMemberCount = Number(memberRows[0]?.activeCount || 0);

    // 7. Core Calculations
    // If month is CLOSED, use the locked final_meal_rate; otherwise calculate live
    const currentMealRate =
      billingMonth.status === 'CLOSED' && billingMonth.finalMealRate > 0
        ? billingMonth.finalMealRate
        : totalMessMeals > 0
        ? Number((totalApprovedBazar / totalMessMeals).toFixed(4))
        : 0;

    const fixedSharePerMember =
      activeMemberCount > 0
        ? Number((totalApprovedFixed / activeMemberCount).toFixed(2))
        : 0;

    const totalExpensesPaid = Number((totalApprovedBazar + totalApprovedFixed).toFixed(2));
    const cashInHand = Number((totalApprovedDeposits - totalExpensesPaid).toFixed(2));

    return {
      messId,
      monthYear: targetMonth,
      billingMonthStatus: billingMonth.status,
      currentMealRate,
      totalMessMeals,
      totalApprovedBazar,
      totalApprovedFixed,
      totalExpensesPaid,
      totalApprovedDeposits,
      totalPendingDeposits,
      cashInHand,
      activeMemberCount,
      fixedSharePerMember,
      fixedExpensesBreakdown,
    };
  }

  /**
   * Calculate detailed member ledger for all active members (Excel-style master ledger)
   */
  static async getMemberLedger(messId: number, monthYear?: string): Promise<MemberLedgerItemDTO[]> {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
    const summary = await this.getDashboardSummary(messId, targetMonth);
    const billingMonth = await this.getOrCreateBillingMonth(messId, targetMonth);

    // 1. Fetch all active members
    const activeMembers = await query<RowDataPacket[]>(
      `SELECT mm.user_id, mm.role, u.name, u.email, u.phone
       FROM mess_members mm
       JOIN users u ON mm.user_id = u.id
       WHERE mm.mess_id = ? AND mm.status = 'ACTIVE'
       ORDER BY mm.role DESC, u.name ASC`,
      [messId]
    );

    // 2. Fetch meals count per member for target month
    const memberMealsRows = await query<RowDataPacket[]>(
      `SELECT user_id, COALESCE(SUM(total_meals), 0) as memberMeals
       FROM meals
       WHERE mess_id = ? AND meal_date LIKE ?
       GROUP BY user_id`,
      [messId, `${targetMonth}-%`]
    );
    const mealsMap = new Map<number, number>();
    memberMealsRows.forEach((r: RowDataPacket) => mealsMap.set(Number(r.user_id), Number(r.memberMeals)));

    // 3. Fetch deposits per member for target month
    const memberDepositsRows = await query<RowDataPacket[]>(
      `SELECT 
         user_id,
         COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending
       FROM deposits
       WHERE mess_id = ? AND billing_month_id = ?
       GROUP BY user_id`,
      [messId, billingMonth.id]
    );
    const depositsMap = new Map<number, { approved: number; pending: number }>();
    memberDepositsRows.forEach((r: RowDataPacket) => {
      depositsMap.set(Number(r.user_id), {
        approved: Number(r.approved),
        pending: Number(r.pending),
      });
    });

    // 4. Fetch opening balances / arrears (from previous closed month settlement if available)
    const prevMonthRows = await query<RowDataPacket[]>(
      `SELECT id FROM billing_months 
       WHERE mess_id = ? AND month_year < ? AND status = 'CLOSED'
       ORDER BY month_year DESC LIMIT 1`,
      [messId, targetMonth]
    );

    const openingBalanceMap = new Map<number, number>();
    if (prevMonthRows.length > 0) {
      const prevBillingMonthId = prevMonthRows[0].id;
      const settlementRows = await query<RowDataPacket[]>(
        `SELECT user_id, closing_balance FROM monthly_settlements WHERE mess_id = ? AND billing_month_id = ?`,
        [messId, prevBillingMonthId]
      );
      settlementRows.forEach((r: RowDataPacket) => {
        openingBalanceMap.set(Number(r.user_id), Number(r.closing_balance || 0));
      });
    }

    // 5. Construct each member's ledger entry
    const ledger: MemberLedgerItemDTO[] = activeMembers.map((member: RowDataPacket) => {
      const userId = Number(member.user_id);
      const memberMeals = mealsMap.get(userId) || 0;
      const mealRate = summary.currentMealRate;
      const mealCost = Number((memberMeals * mealRate).toFixed(2));
      const fixedCostShare = summary.fixedSharePerMember;
      const openingBalance = openingBalanceMap.get(userId) || 0;
      const userDeposits = depositsMap.get(userId) || { approved: 0, pending: 0 };
      const totalApprovedDeposits = userDeposits.approved;
      const totalPendingDeposits = userDeposits.pending;

      // Total Cost = Meal Cost + Shared Fixed Share
      const totalCost = Number((mealCost + fixedCostShare).toFixed(2));

      // Net Balance = Opening Balance + Approved Deposits - Total Cost
      // Positive: member has credit / advance deposited
      // Negative: member owes money to the mess (due)
      const netBalance = Number((openingBalance + totalApprovedDeposits - totalCost).toFixed(2));

      return {
        userId,
        name: member.name,
        email: member.email,
        phone: member.phone || undefined,
        role: member.role,
        memberMeals,
        mealRate,
        mealCost,
        fixedCostShare,
        openingBalance,
        totalApprovedDeposits,
        totalPendingDeposits,
        totalCost,
        netBalance,
      };
    });

    return ledger;
  }

  /**
   * Get specific member's personal financial summary
   */
  static async getMySummary(messId: number, userId: number, monthYear?: string): Promise<MyFinancialSummaryDTO> {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
    const ledger = await this.getMemberLedger(messId, targetMonth);
    const memberEntry = ledger.find((item) => item.userId === userId);

    // Get user info and mess info
    const userRows = await query<RowDataPacket[]>(
      `SELECT u.name, m.name as messName, mm.role 
       FROM users u
       JOIN mess_members mm ON u.id = mm.user_id AND mm.mess_id = ?
       JOIN messes m ON mm.mess_id = m.id
       WHERE u.id = ?`,
      [messId, userId]
    );

    const name = userRows[0]?.name || 'Member';
    const messName = userRows[0]?.messName || 'My Mess';
    const role = userRows[0]?.role || 'MEMBER';

    if (!memberEntry) {
      return {
        userId,
        name,
        messName,
        role,
        monthYear: targetMonth,
        memberMeals: 0,
        mealRate: 0,
        mealCost: 0,
        fixedCostShare: 0,
        openingBalance: 0,
        totalApprovedDeposits: 0,
        totalPendingDeposits: 0,
        totalCost: 0,
        netBalance: 0,
      };
    }

    return {
      userId,
      name,
      messName,
      role,
      monthYear: targetMonth,
      memberMeals: memberEntry.memberMeals,
      mealRate: memberEntry.mealRate,
      mealCost: memberEntry.mealCost,
      fixedCostShare: memberEntry.fixedCostShare,
      openingBalance: memberEntry.openingBalance,
      totalApprovedDeposits: memberEntry.totalApprovedDeposits,
      totalPendingDeposits: memberEntry.totalPendingDeposits,
      totalCost: memberEntry.totalCost,
      netBalance: memberEntry.netBalance,
    };
  }
}
