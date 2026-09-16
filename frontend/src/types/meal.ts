export interface Meal {
  id: number;
  messId: number;
  userId: number;
  userName?: string;
  mealDate: string; // 'YYYY-MM-DD'
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
  updatedByUserId: number;
  updatedAt: string;
}

export interface DailySheetMemberMeal {
  userId: number;
  userName: string;
  userEmail: string;
  role: 'MANAGER' | 'MEMBER';
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
  mealId: number | null;
  updatedAt: string | null;
}

export interface DailySheet {
  messId: number;
  date: string;
  lunchCutoffTime: string;
  dinnerCutoffTime: string;
  isBreakfastLocked: boolean;
  isLunchLocked: boolean;
  isDinnerLocked: boolean;
  members: DailySheetMemberMeal[];
  totals: {
    totalBreakfast: number;
    totalLunch: number;
    totalDinner: number;
    totalMeals: number;
  };
}

export interface SelfMealInput {
  messId: number;
  mealDate: string; // 'YYYY-MM-DD'
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
}

export interface ManagerOverrideInput {
  messId: number;
  targetUserId: number;
  mealDate: string; // 'YYYY-MM-DD'
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
}

export interface MonthlyMealsSummary {
  monthYear: string;
  messId: number;
  userId: number;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalMeals: number;
  records: {
    id: number;
    mealDate: string;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
    totalMeals: number;
    updatedByUserId: number;
    updatedAt: string;
  }[];
}
