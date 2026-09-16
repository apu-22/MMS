import { query } from '../config/db';
import { AppError } from '../types';
import {
  MealDTO,
  DailySheetDTO,
  DailySheetMemberMeal,
  SelfMealInputDTO,
  ManagerOverrideMealDTO,
  MonthlyMealsSummaryDTO,
} from '../types/meal.types';

function getNowLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return {
    todayStr: `${year}-${month}-${day}`,
    timeStr: `${hours}:${minutes}:${seconds}`,
  };
}

function isTimePassed(currentTimeStr: string, cutoffTimeStr: string): boolean {
  if (!cutoffTimeStr) return false;
  const pad = (t: string) => (t.length === 5 ? `${t}:00` : t);
  return pad(currentTimeStr) >= pad(cutoffTimeStr);
}

async function checkBillingMonthOpen(messId: number, dateStr: string) {
  const monthYear = dateStr.substring(0, 7);
  const rows = await query<any[]>(
    'SELECT status FROM billing_months WHERE mess_id = ? AND month_year = ? LIMIT 1',
    [messId, monthYear]
  );
  if (rows.length > 0 && rows[0].status === 'CLOSED') {
    throw new AppError(`Billing month ${monthYear} is closed and cannot be modified`, 403, 'BILLING_MONTH_CLOSED');
  }
}

function mapMealRow(row: any): MealDTO {
  let dateStr = '';
  if (typeof row.meal_date === 'string') {
    dateStr = row.meal_date.substring(0, 10);
  } else if (row.meal_date instanceof Date) {
    const y = row.meal_date.getFullYear();
    const m = String(row.meal_date.getMonth() + 1).padStart(2, '0');
    const d = String(row.meal_date.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  } else {
    dateStr = String(row.meal_date);
  }

  return {
    id: row.id,
    messId: row.mess_id,
    userId: row.user_id,
    mealDate: dateStr,
    breakfastCount: Number(row.breakfast_count),
    lunchCount: Number(row.lunch_count),
    dinnerCount: Number(row.dinner_count),
    totalMeals: Number(row.total_meals),
    updatedByUserId: row.updated_by_user_id,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class MealService {
  /**
   * Member updates their own meal counts.
   * Validates cutoff times on server side.
   */
  static async upsertSelfMeal(dto: SelfMealInputDTO, callerUserId: number): Promise<MealDTO> {
    const { messId, mealDate, breakfastCount, lunchCount, dinnerCount } = dto;

    if (breakfastCount < 0 || lunchCount < 0 || dinnerCount < 0) {
      throw new AppError('Meal counts cannot be negative', 400, 'INVALID_MEAL_COUNT');
    }
    if (breakfastCount > 20 || lunchCount > 20 || dinnerCount > 20) {
      throw new AppError('Meal count cannot exceed 20 per slot', 400, 'EXCESSIVE_MEAL_COUNT');
    }

    // 1. Verify billing month is open
    await checkBillingMonthOpen(messId, mealDate);

    // 2. Fetch mess cutoff times
    const messRows = await query<any[]>(
      'SELECT lunch_cutoff_time, dinner_cutoff_time FROM messes WHERE id = ? LIMIT 1',
      [messId]
    );
    if (messRows.length === 0) {
      throw new AppError('Mess not found', 404, 'MESS_NOT_FOUND');
    }
    const { lunch_cutoff_time, dinner_cutoff_time } = messRows[0];

    const { todayStr, timeStr } = getNowLocal();

    // 3. Cutoff rules:
    if (mealDate < todayStr) {
      throw new AppError('Cannot modify meal counts for past dates', 403, 'PAST_DATE_LOCKED');
    }

    // If today, check if cutoff has passed for modified slots
    if (mealDate === todayStr) {
      const existingRows = await query<any[]>(
        'SELECT breakfast_count, lunch_count, dinner_count FROM meals WHERE mess_id = ? AND user_id = ? AND meal_date = ? LIMIT 1',
        [messId, callerUserId, mealDate]
      );
      const prevB = existingRows.length > 0 ? Number(existingRows[0].breakfast_count) : 0;
      const prevL = existingRows.length > 0 ? Number(existingRows[0].lunch_count) : 0;
      const prevD = existingRows.length > 0 ? Number(existingRows[0].dinner_count) : 0;

      const lunchPassed = isTimePassed(timeStr, lunch_cutoff_time);
      const dinnerPassed = isTimePassed(timeStr, dinner_cutoff_time);

      if (lunchPassed && (breakfastCount !== prevB || lunchCount !== prevL)) {
        throw new AppError(
          `Lunch cutoff time (${lunch_cutoff_time.slice(0, 5)}) has passed for today`,
          403,
          'LUNCH_CUTOFF_PASSED'
        );
      }

      if (dinnerPassed && dinnerCount !== prevD) {
        throw new AppError(
          `Dinner cutoff time (${dinner_cutoff_time.slice(0, 5)}) has passed for today`,
          403,
          'DINNER_CUTOFF_PASSED'
        );
      }
    }

    // 4. Perform atomic UPSERT
    await query(
      `INSERT INTO meals 
        (mess_id, user_id, meal_date, breakfast_count, lunch_count, dinner_count, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        breakfast_count = VALUES(breakfast_count),
        lunch_count = VALUES(lunch_count),
        dinner_count = VALUES(dinner_count),
        updated_by_user_id = VALUES(updated_by_user_id),
        updated_at = CURRENT_TIMESTAMP`,
      [messId, callerUserId, mealDate, breakfastCount, lunchCount, dinnerCount, callerUserId]
    );

    const rows = await query<any[]>(
      `SELECT id, mess_id, user_id, DATE_FORMAT(meal_date, '%Y-%m-%d') as meal_date, 
              breakfast_count, lunch_count, dinner_count, total_meals, updated_by_user_id, updated_at 
       FROM meals WHERE mess_id = ? AND user_id = ? AND meal_date = ? LIMIT 1`,
      [messId, callerUserId, mealDate]
    );
    return mapMealRow(rows[0]);
  }

  /**
   * Manager updates meal counts for any member on any date (bypassing daily cutoff).
   */
  static async managerOverrideMeal(dto: ManagerOverrideMealDTO, managerUserId: number): Promise<MealDTO> {
    const { messId, targetUserId, mealDate, breakfastCount, lunchCount, dinnerCount } = dto;

    if (breakfastCount < 0 || lunchCount < 0 || dinnerCount < 0) {
      throw new AppError('Meal counts cannot be negative', 400, 'INVALID_MEAL_COUNT');
    }

    // Check target user is active member of this mess
    const memberRows = await query<any[]>(
      'SELECT status FROM mess_members WHERE mess_id = ? AND user_id = ? LIMIT 1',
      [messId, targetUserId]
    );
    if (memberRows.length === 0) {
      throw new AppError('Target user is not a member of this mess', 404, 'MEMBER_NOT_FOUND');
    }

    // Verify billing month is open
    await checkBillingMonthOpen(messId, mealDate);

    // Perform atomic UPSERT
    await query(
      `INSERT INTO meals 
        (mess_id, user_id, meal_date, breakfast_count, lunch_count, dinner_count, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        breakfast_count = VALUES(breakfast_count),
        lunch_count = VALUES(lunch_count),
        dinner_count = VALUES(dinner_count),
        updated_by_user_id = VALUES(updated_by_user_id),
        updated_at = CURRENT_TIMESTAMP`,
      [messId, targetUserId, mealDate, breakfastCount, lunchCount, dinnerCount, managerUserId]
    );

    const rows = await query<any[]>(
      `SELECT id, mess_id, user_id, DATE_FORMAT(meal_date, '%Y-%m-%d') as meal_date, 
              breakfast_count, lunch_count, dinner_count, total_meals, updated_by_user_id, updated_at 
       FROM meals WHERE mess_id = ? AND user_id = ? AND meal_date = ? LIMIT 1`,
      [messId, targetUserId, mealDate]
    );
    return mapMealRow(rows[0]);
  }

  /**
   * Returns daily master sheet for all active members on the requested date.
   */
  static async getDailySheet(messId: number, dateStr: string): Promise<DailySheetDTO> {
    const messRows = await query<any[]>(
      'SELECT lunch_cutoff_time, dinner_cutoff_time FROM messes WHERE id = ? LIMIT 1',
      [messId]
    );
    if (messRows.length === 0) {
      throw new AppError('Mess not found', 404, 'MESS_NOT_FOUND');
    }
    const { lunch_cutoff_time, dinner_cutoff_time } = messRows[0];

    const { todayStr, timeStr } = getNowLocal();

    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;

    const isBreakfastLocked = isPast || (isToday && isTimePassed(timeStr, lunch_cutoff_time));
    const isLunchLocked = isPast || (isToday && isTimePassed(timeStr, lunch_cutoff_time));
    const isDinnerLocked = isPast || (isToday && isTimePassed(timeStr, dinner_cutoff_time));

    const rows = await query<any[]>(
      `SELECT 
        mm.user_id,
        u.name as user_name,
        u.email as user_email,
        mm.role,
        COALESCE(m.breakfast_count, 0.00) as breakfast_count,
        COALESCE(m.lunch_count, 0.00) as lunch_count,
        COALESCE(m.dinner_count, 0.00) as dinner_count,
        COALESCE(m.total_meals, 0.00) as total_meals,
        m.id as meal_id,
        m.updated_at
      FROM mess_members mm
      JOIN users u ON mm.user_id = u.id
      LEFT JOIN meals m ON m.mess_id = mm.mess_id AND m.user_id = mm.user_id AND m.meal_date = ?
      WHERE mm.mess_id = ? AND mm.status = 'ACTIVE'
      ORDER BY mm.role DESC, u.name ASC`,
      [dateStr, messId]
    );

    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;
    let totalMeals = 0;

    const members: DailySheetMemberMeal[] = rows.map((r) => {
      const b = Number(r.breakfast_count);
      const l = Number(r.lunch_count);
      const d = Number(r.dinner_count);
      const t = Number(r.total_meals);

      totalBreakfast += b;
      totalLunch += l;
      totalDinner += d;
      totalMeals += t;

      return {
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        role: r.role,
        breakfastCount: b,
        lunchCount: l,
        dinnerCount: d,
        totalMeals: t,
        mealId: r.meal_id,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      };
    });

    return {
      messId,
      date: dateStr,
      lunchCutoffTime: lunch_cutoff_time,
      dinnerCutoffTime: dinner_cutoff_time,
      isBreakfastLocked,
      isLunchLocked,
      isDinnerLocked,
      members,
      totals: {
        totalBreakfast: Number(totalBreakfast.toFixed(2)),
        totalLunch: Number(totalLunch.toFixed(2)),
        totalDinner: Number(totalDinner.toFixed(2)),
        totalMeals: Number(totalMeals.toFixed(2)),
      },
    };
  }

  /**
   * Returns personal monthly meal history for the caller.
   */
  static async getMyMonthlyMeals(messId: number, userId: number, monthYear: string): Promise<MonthlyMealsSummaryDTO> {
    const rows = await query<any[]>(
      `SELECT 
        id,
        DATE_FORMAT(meal_date, '%Y-%m-%d') as meal_date,
        breakfast_count,
        lunch_count,
        dinner_count,
        total_meals,
        updated_by_user_id,
        updated_at
      FROM meals
      WHERE mess_id = ? AND user_id = ? AND meal_date LIKE ?
      ORDER BY meal_date ASC`,
      [messId, userId, `${monthYear}-%`]
    );

    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;
    let totalMeals = 0;

    const records = rows.map((r) => {
      const b = Number(r.breakfast_count);
      const l = Number(r.lunch_count);
      const d = Number(r.dinner_count);
      const t = Number(r.total_meals);

      totalBreakfast += b;
      totalLunch += l;
      totalDinner += d;
      totalMeals += t;

      return {
        id: r.id,
        mealDate: r.meal_date,
        breakfastCount: b,
        lunchCount: l,
        dinnerCount: d,
        totalMeals: t,
        updatedByUserId: r.updated_by_user_id,
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return {
      monthYear,
      messId,
      userId,
      totalBreakfast: Number(totalBreakfast.toFixed(2)),
      totalLunch: Number(totalLunch.toFixed(2)),
      totalDinner: Number(totalDinner.toFixed(2)),
      totalMeals: Number(totalMeals.toFixed(2)),
      records,
    };
  }
}
