export type ExpenseCategory = 'BAZAR' | 'SHARED_FIXED';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExpenseDTO {
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

export interface CreateExpenseInputDTO {
  messId: number;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expenseDate: string; // 'YYYY-MM-DD'
  description?: string;
}

export interface ExpenseFilterQuery {
  messId: number;
  monthYear?: string; // 'YYYY-MM'
  category?: ExpenseCategory | 'ALL';
  status?: ExpenseStatus | 'ALL';
}

export interface ExpenseListResponseDTO {
  expenses: ExpenseDTO[];
  summary: {
    totalBazar: number;
    totalSharedFixed: number;
    totalApproved: number;
    totalPending: number;
    totalCount: number;
  };
}
