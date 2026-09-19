export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Deposit {
  id: number;
  messId: number;
  billingMonthId: number;
  monthYear: string;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  depositDate: string; // 'YYYY-MM-DD'
  paymentMethod: PaymentMethod;
  transactionRef: string | null;
  notes: string | null;
  status: DepositStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepositInput {
  messId: number;
  amount: number;
  depositDate: string; // 'YYYY-MM-DD'
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
  targetUserId?: number;
}

export interface DepositFilterParams {
  messId: number;
  month?: string; // 'YYYY-MM'
  status?: DepositStatus | 'ALL';
  userId?: number;
}

export interface DepositSummary {
  totalApproved: number;
  totalPending: number;
  totalCash: number;
  totalDigital: number;
  totalCount: number;
}

export interface DepositListResponse {
  deposits: Deposit[];
  summary: DepositSummary;
}
