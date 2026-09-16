export interface MealDTO {
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

export interface DailySheetDTO {
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

export interface SelfMealInputDTO {
  messId: number;
  mealDate: string; // 'YYYY-MM-DD'
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
}

export interface ManagerOverrideMealDTO {
  messId: number;
  targetUserId: number;
  mealDate: string; // 'YYYY-MM-DD'
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
}

export interface MonthlyMealsSummaryDTO {
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
