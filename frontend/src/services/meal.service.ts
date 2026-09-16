import { api } from './api';
import type {
  Meal,
  DailySheet,
  SelfMealInput,
  ManagerOverrideInput,
  MonthlyMealsSummary,
} from '../types/meal';

export const mealService = {
  /**
   * Member updates personal meal counts
   */
  async updateSelfMeal(input: SelfMealInput): Promise<Meal> {
    const response = await api.put('/meals/self', input);
    return response.data.data;
  },

  /**
   * Manager overrides member meal counts on any date
   */
  async managerOverrideMeal(input: ManagerOverrideInput): Promise<Meal> {
    const response = await api.put('/meals/manager-override', input);
    return response.data.data;
  },

  /**
   * Fetch daily master sheet for all active members on a date
   */
  async getDailySheet(messId: number, date?: string): Promise<DailySheet> {
    const response = await api.get('/meals/daily-sheet', {
      params: {
        messId,
        date,
      },
    });
    return response.data.data;
  },

  /**
   * Fetch personal monthly meal history
   */
  async getMyMonthlyMeals(messId: number, month?: string): Promise<MonthlyMealsSummary> {
    const response = await api.get('/meals/my-monthly', {
      params: {
        messId,
        month,
      },
    });
    return response.data.data;
  },
};
