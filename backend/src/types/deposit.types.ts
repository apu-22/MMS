export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DepositDTO {
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

export interface CreateDepositInputDTO {
  messId: number;
  amount: number;
  depositDate: string; // 'YYYY-MM-DD'
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
  targetUserId?: number; // Optional for manager recording on behalf of a member
}

export interface DepositFilterQuery {
  messId: number;
  monthYear?: string; // 'YYYY-MM'
  status?: DepositStatus | 'ALL';
  userId?: number;
}

export interface DepositListResponseDTO {
  deposits: DepositDTO[];
  summary: {
    totalApproved: number;
    totalPending: number;
    totalCash: number;
    totalDigital: number;
    totalCount: number;
  };
}
