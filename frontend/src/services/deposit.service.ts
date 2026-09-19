import { api } from './api';
import type {
  Deposit,
  CreateDepositInput,
  DepositFilterParams,
  DepositListResponse,
} from '../types/deposit';

export const depositService = {
  /**
   * Submit a deposit slip or record direct cash deposit
   */
  async createDeposit(input: CreateDepositInput): Promise<Deposit> {
    const response = await api.post('/deposits', input);
    return response.data.data;
  },

  /**
   * Fetch filtered deposits list and monthly metrics
   */
  async getDeposits(params: DepositFilterParams): Promise<DepositListResponse> {
    const response = await api.get('/deposits', { params });
    return response.data.data;
  },

  /**
   * Manager updates deposit status (APPROVED / REJECTED)
   */
  async updateStatus(
    depositId: number,
    messId: number,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<Deposit> {
    const response = await api.patch(
      `/deposits/${depositId}/status`,
      { status },
      { params: { messId } }
    );
    return response.data.data;
  },

  /**
   * Delete deposit record
   */
  async deleteDeposit(depositId: number, messId: number): Promise<{ message: string }> {
    const response = await api.delete(`/deposits/${depositId}`, {
      params: { messId },
    });
    return response.data.data;
  },
};
