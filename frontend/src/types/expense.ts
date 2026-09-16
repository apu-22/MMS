export type ExpenseCategory = 'BAZAR' | 'SHARED_FIXED';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  id: number;
  messId: number;
  billingMonthId: number;
  monthYear: string;
  category: ExpenseCategory;
  title: string;
  description: string | null;
  amount: number;
  expenseDate: string; // 'YYYY-MM-DD'
  paidByUserId: number;
  paidByUserName: string;
  paidByUserEmail: string;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  messId: number;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expenseDate: string; // 'YYYY-MM-DD'
  description?: string;
}

export interface ExpenseFilterParams {
  messId: number;
  month?: string; // 'YYYY-MM'
  category?: ExpenseCategory | 'ALL';
  status?: ExpenseStatus | 'ALL';
}

export interface ExpenseSummary {
  totalBazar: number;
  totalSharedFixed: number;
  totalApproved: number;
  totalPending: number;
  totalCount: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  summary: ExpenseSummary;
}
