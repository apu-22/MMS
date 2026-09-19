export interface FixedExpenseItem {
  id: number;
  title: string;
  amount: number;
  date: string;
  paidByName: string;
}

export interface DashboardSummaryDTO {
  messId: number;
  monthYear: string;
  billingMonthStatus: 'OPEN' | 'CLOSED';
  currentMealRate: number;
  totalMessMeals: number;
  totalApprovedBazar: number;
  totalApprovedFixed: number;
  totalExpensesPaid: number;
  totalApprovedDeposits: number;
  totalPendingDeposits: number;
  cashInHand: number; // Rest Amount = Approved Deposits - Approved Expenses
  activeMemberCount: number;
  fixedSharePerMember: number;
  fixedExpensesBreakdown: FixedExpenseItem[];
}

export interface MemberLedgerItemDTO {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: 'MANAGER' | 'MEMBER';
  memberMeals: number;
  mealRate: number;
  mealCost: number;
  fixedCostShare: number;
  openingBalance: number; // Arrears or previous carry-over
  totalApprovedDeposits: number;
  totalPendingDeposits: number;
  totalCost: number; // Meal Cost + Fixed Cost Share
  netBalance: number; // Opening Balance + Approved Deposits - Total Cost (Positive = Credit/Advance, Negative = Due)
}

export interface MyFinancialSummaryDTO {
  userId: number;
  name: string;
  messName: string;
  role: 'MANAGER' | 'MEMBER';
  monthYear: string;
  memberMeals: number;
  mealRate: number;
  mealCost: number;
  fixedCostShare: number;
  openingBalance: number;
  totalApprovedDeposits: number;
  totalPendingDeposits: number;
  totalCost: number;
  netBalance: number;
}
