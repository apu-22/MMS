import { api } from './api';
import type {
  Expense,
  CreateExpenseInput,
  ExpenseFilterParams,
  ExpenseListResponse,
} from '../types/expense';

export const expenseService = {
  /**
   * Submit an expense
   */
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const response = await api.post('/expenses', input);
    return response.data.data;
  },

  /**
   * Fetch filtered expenses and monthly summary
   */
  async getExpenses(params: ExpenseFilterParams): Promise<ExpenseListResponse> {
    const response = await api.get('/expenses', { params });
    return response.data.data;
  },

  /**
   * Manager updates expense status (APPROVED / REJECTED)
   */
  async updateStatus(
    expenseId: number,
    messId: number,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<Expense> {
    const response = await api.patch(
      `/expenses/${expenseId}/status`,
      { status },
      { params: { messId } }
    );
    return response.data.data;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: number, messId: number): Promise<{ message: string }> {
    const response = await api.delete(`/expenses/${expenseId}`, {
      params: { messId },
    });
    return response.data.data;
  },
};
