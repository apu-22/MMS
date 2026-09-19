import { api } from './api';
import type {
  DashboardSummary,
  MemberLedgerItem,
  MyFinancialSummary,
} from '../types/dashboard';

export const dashboardService = {
  /**
   * Get overall Mess Financial KPIs & Live Meal Rate
   */
  async getSummary(month?: string): Promise<DashboardSummary> {
    const params = month ? { month } : {};
    const response = await api.get('/dashboard/summary', { params });
    return response.data.data;
  },

  /**
   * Get Excel-style full Member Financial Ledger
   */
  async getMemberLedger(month?: string): Promise<MemberLedgerItem[]> {
    const params = month ? { month } : {};
    const response = await api.get('/dashboard/member-ledger', { params });
    return response.data.data;
  },

  /**
   * Get logged-in user's personalized monthly financial overview
   */
  async getMySummary(month?: string): Promise<MyFinancialSummary> {
    const params = month ? { month } : {};
    const response = await api.get('/dashboard/my-summary', { params });
    return response.data.data;
  },
};
