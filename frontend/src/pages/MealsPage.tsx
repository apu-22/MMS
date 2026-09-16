import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  ArrowLeft,
  Calendar,
  Check,
  AlertCircle,
  Save,
  Plus,
  Minus,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mealService } from '../services/meal.service';
import type { DailySheet, DailySheetMemberMeal, MonthlyMealsSummary } from '../types/meal';

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayAndTomorrowStr(): { today: string; tomorrow: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;

  const tomorrowObj = new Date(now);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const ty = tomorrowObj.getFullYear();
  const tm = String(tomorrowObj.getMonth() + 1).padStart(2, '0');
  const td = String(tomorrowObj.getDate()).padStart(2, '0');
  const tomorrow = `${ty}-${tm}-${td}`;

  return { today, tomorrow };
}

export const MealsPage: FC = () => {
  const { user, activeMess } = useAuth();
  const messId = activeMess?.messId;
  const isManager = activeMess?.role === 'MANAGER';

  const { today: todayStr, tomorrow: tomorrowStr } = getTodayAndTomorrowStr();

  // Active Tab: 'self' | 'master' | 'history'
  const [activeTab, setActiveTab] = useState<'self' | 'master' | 'history'>('self');

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Self Meals State
  const [todayMeal, setTodayMeal] = useState<{ breakfast: number; lunch: number; dinner: number }>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [tomorrowMeal, setTomorrowMeal] = useState<{ breakfast: number; lunch: number; dinner: number }>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [todaySheet, setTodaySheet] = useState<DailySheet | null>(null);
  const [tomorrowSheet, setTomorrowSheet] = useState<DailySheet | null>(null);
  const [isSelfLoading, setIsSelfLoading] = useState(true);
  const [isSavingSelf, setIsSavingSelf] = useState<string | null>(null); // 'today' | 'tomorrow'

  // Master Daily Sheet State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [masterSheet, setMasterSheet] = useState<DailySheet | null>(null);
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [editGrid, setEditGrid] = useState<Record<number, { breakfast: number; lunch: number; dinner: number }>>({});
  const [isSavingMemberId, setIsSavingMemberId] = useState<number | null>(null);

  // Monthly History State
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.substring(0, 7));
  const [monthlySummary, setMonthlySummary] = useState<MonthlyMealsSummary | null>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  // Auto clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load self meal sheets (today & tomorrow)
  const loadSelfMeals = async () => {
    if (!messId || !user?.id) return;
    setIsSelfLoading(true);
    try {
      const [tSheet, tmSheet] = await Promise.all([
        mealService.getDailySheet(messId, todayStr),
        mealService.getDailySheet(messId, tomorrowStr),
      ]);
      setTodaySheet(tSheet);
      setTomorrowSheet(tmSheet);

      // Find caller's meals
      const myToday = tSheet.members.find((m) => m.userId === user.id);
      if (myToday) {
        setTodayMeal({
          breakfast: myToday.breakfastCount,
          lunch: myToday.lunchCount,
          dinner: myToday.dinnerCount,
        });
      }

      const myTomorrow = tmSheet.members.find((m) => m.userId === user.id);
      if (myTomorrow) {
        setTomorrowMeal({
          breakfast: myTomorrow.breakfastCount,
          lunch: myTomorrow.lunchCount,
          dinner: myTomorrow.dinnerCount,
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load meal details.',
      });
    } finally {
      setIsSelfLoading(false);
    }
  };

  // Load master sheet
  const loadMasterSheet = async (date: string) => {
    if (!messId) return;
    setIsMasterLoading(true);
    try {
      const sheet = await mealService.getDailySheet(messId, date);
      setMasterSheet(sheet);

      // Populate editable grid
      const grid: Record<number, { breakfast: number; lunch: number; dinner: number }> = {};
      sheet.members.forEach((m) => {
        grid[m.userId] = {
          breakfast: m.breakfastCount,
          lunch: m.lunchCount,
          dinner: m.dinnerCount,
        };
      });
      setEditGrid(grid);
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load daily sheet.',
      });
    } finally {
      setIsMasterLoading(false);
    }
  };

  // Load monthly summary
  const loadMonthlySummary = async (month: string) => {
    if (!messId) return;
    setIsMonthlyLoading(true);
    try {
      const summary = await mealService.getMyMonthlyMeals(messId, month);
      setMonthlySummary(summary);
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load monthly meals.',
      });
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (messId) {
      loadSelfMeals();
    }
  }, [messId]);

  useEffect(() => {
    if (messId && activeTab === 'master') {
      loadMasterSheet(selectedDate);
    }
  }, [messId, activeTab, selectedDate]);

  useEffect(() => {
    if (messId && activeTab === 'history') {
      loadMonthlySummary(selectedMonth);
    }
  }, [messId, activeTab, selectedMonth]);

  // Handle saving self meal
  const handleSaveSelf = async (target: 'today' | 'tomorrow') => {
    if (!messId) return;
    const isToday = target === 'today';
    const date = isToday ? todayStr : tomorrowStr;
    const counts = isToday ? todayMeal : tomorrowMeal;

    setIsSavingSelf(target);
    try {
      await mealService.updateSelfMeal({
        messId,
        mealDate: date,
        breakfastCount: counts.breakfast,
        lunchCount: counts.lunch,
        dinnerCount: counts.dinner,
      });

      setToast({
        type: 'success',
        text: `Successfully updated your meals for ${isToday ? 'Today' : 'Tomorrow'}!`,
      });

      // Reload
      await loadSelfMeals();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to save meal count.',
      });
    } finally {
      setIsSavingSelf(null);
    }
  };

  // Handle Manager Override for a member
  const handleManagerSave = async (member: DailySheetMemberMeal) => {
    if (!messId) return;
    const counts = editGrid[member.userId];
    if (!counts) return;

    setIsSavingMemberId(member.userId);
    try {
      await mealService.managerOverrideMeal({
        messId,
        targetUserId: member.userId,
        mealDate: selectedDate,
        breakfastCount: counts.breakfast,
        lunchCount: counts.lunch,
        dinnerCount: counts.dinner,
      });

      setToast({
        type: 'success',
        text: `Updated meals for ${member.userName} on ${selectedDate}`,
      });

      await loadMasterSheet(selectedDate);
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to override meal.',
      });
    } finally {
      setIsSavingMemberId(null);
    }
  };

  // Date navigation helpers
  const shiftSelectedDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Utensils className="w-6 h-6" />
              </span>
              Daily Meal Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeMess?.messName ? `Managing meals for ${activeMess.messName}` : 'Manage your mess meal counts'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('self')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'self'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Daily Meals
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'master'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mess Master Grid {isManager && '★'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Monthly Log
            </button>
          </div>
        </div>

        {/* Global Toast Banner */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm flex items-center gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{toast.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MY DAILY MEALS (TODAY & TOMORROW)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'self' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Self Meal Toggles</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Toggle your Breakfast, Lunch, and Dinner counts before cutoff times.
                </p>
              </div>
              <button
                onClick={loadSelfMeals}
                disabled={isSelfLoading}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSelfLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {isSelfLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-96 bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TODAY CARD */}
                <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 mb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Today
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{todayStr}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mt-1">
                          {formatDisplayDate(todayStr)}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total Meals</span>
                        <span className="text-2xl font-black text-emerald-400">
                          {(todayMeal.breakfast + todayMeal.lunch + todayMeal.dinner).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Cutoff Status Alerts */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div
                        className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${
                          todaySheet?.isLunchLocked
                            ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                            : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                        }`}
                      >
                        {todaySheet?.isLunchLocked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate">
                          Lunch: {todaySheet?.isLunchLocked ? 'Locked' : `Open (< ${todaySheet?.lunchCutoffTime.slice(0, 5)})`}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 ${
                          todaySheet?.isDinnerLocked
                            ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                            : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                        }`}
                      >
                        {todaySheet?.isDinnerLocked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate">
                          Dinner: {todaySheet?.isDinnerLocked ? 'Locked' : `Open (< ${todaySheet?.dinnerCutoffTime.slice(0, 5)})`}
                        </span>
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="space-y-4">
                      {/* Breakfast Slot */}
                      <div
                        className={`p-3.5 rounded-xl border transition-all ${
                          todaySheet?.isBreakfastLocked
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                              <Coffee className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Breakfast</p>
                              <p className="text-xs text-slate-400">Default: 0.5 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={todaySheet?.isBreakfastLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  breakfast: Math.max(0, Number((prev.breakfast - 0.5).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {todayMeal.breakfast.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              disabled={todaySheet?.isBreakfastLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  breakfast: Number((prev.breakfast + 0.5).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lunch Slot */}
                      <div
                        className={`p-3.5 rounded-xl border transition-all ${
                          todaySheet?.isLunchLocked
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
                              <Sun className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Lunch</p>
                              <p className="text-xs text-slate-400">Default: 1.0 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={todaySheet?.isLunchLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  lunch: Math.max(0, Number((prev.lunch - 1.0).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {todayMeal.lunch.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              disabled={todaySheet?.isLunchLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  lunch: Number((prev.lunch + 1.0).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dinner Slot */}
                      <div
                        className={`p-3.5 rounded-xl border transition-all ${
                          todaySheet?.isDinnerLocked
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                              <Moon className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Dinner</p>
                              <p className="text-xs text-slate-400">Default: 1.0 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={todaySheet?.isDinnerLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  dinner: Math.max(0, Number((prev.dinner - 1.0).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {todayMeal.dinner.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              disabled={todaySheet?.isDinnerLocked}
                              onClick={() =>
                                setTodayMeal((prev) => ({
                                  ...prev,
                                  dinner: Number((prev.dinner + 1.0).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      disabled={isSavingSelf === 'today' || (todaySheet?.isLunchLocked && todaySheet?.isDinnerLocked)}
                      onClick={() => handleSaveSelf('today')}
                      className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                    >
                      {isSavingSelf === 'today' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving Today's Count...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Today's Meals
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TOMORROW CARD */}
                <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 mb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Tomorrow
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{tomorrowStr}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mt-1">
                          {formatDisplayDate(tomorrowStr)}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total Meals</span>
                        <span className="text-2xl font-black text-sky-400">
                          {(tomorrowMeal.breakfast + tomorrowMeal.lunch + tomorrowMeal.dinner).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Cutoff Status Alerts (Always open for tomorrow) */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div className="p-2 rounded-lg border text-xs flex items-center gap-1.5 bg-emerald-950/30 border-emerald-900/40 text-emerald-300">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Lunch: Open {tomorrowSheet?.lunchCutoffTime ? `(< ${tomorrowSheet.lunchCutoffTime.slice(0, 5)})` : ''}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg border text-xs flex items-center gap-1.5 bg-emerald-950/30 border-emerald-900/40 text-emerald-300">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Dinner: Open {tomorrowSheet?.dinnerCutoffTime ? `(< ${tomorrowSheet.dinnerCutoffTime.slice(0, 5)})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="space-y-4">
                      {/* Breakfast Slot */}
                      <div className="p-3.5 rounded-xl border bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                              <Coffee className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Breakfast</p>
                              <p className="text-xs text-slate-400">Default: 0.5 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  breakfast: Math.max(0, Number((prev.breakfast - 0.5).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {tomorrowMeal.breakfast.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  breakfast: Number((prev.breakfast + 0.5).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lunch Slot */}
                      <div className="p-3.5 rounded-xl border bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">
                              <Sun className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Lunch</p>
                              <p className="text-xs text-slate-400">Default: 1.0 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  lunch: Math.max(0, Number((prev.lunch - 1.0).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {tomorrowMeal.lunch.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  lunch: Number((prev.lunch + 1.0).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dinner Slot */}
                      <div className="p-3.5 rounded-xl border bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                              <Moon className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">Dinner</p>
                              <p className="text-xs text-slate-400">Default: 1.0 meal</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  dinner: Math.max(0, Number((prev.dinner - 1.0).toFixed(2))),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-base font-bold text-slate-100">
                              {tomorrowMeal.dinner.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTomorrowMeal((prev) => ({
                                  ...prev,
                                  dinner: Number((prev.dinner + 1.0).toFixed(2)),
                                }))
                              }
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      disabled={isSavingSelf === 'tomorrow'}
                      onClick={() => handleSaveSelf('tomorrow')}
                      className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                    >
                      {isSavingSelf === 'tomorrow' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving Tomorrow's Count...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Tomorrow's Meals
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MESS MASTER GRID (DATE PICKER & ALL MEMBERS SPREADSHEET)           */}
        {/* ========================================================================= */}
        {activeTab === 'master' && (
          <div className="space-y-6">
            {/* Top Controls: Date Navigator */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => shiftSelectedDate(-1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Today
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => shiftSelectedDate(1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day info pill */}
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">{formatDisplayDate(selectedDate)}</span>
                {selectedDate === todayStr && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    Today
                  </span>
                )}
                {selectedDate < todayStr && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                    Past
                  </span>
                )}
                {selectedDate > todayStr && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                    Upcoming
                  </span>
                )}
              </div>
            </div>

            {/* Kitchen Preparation Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                  <Coffee className="w-4 h-4" />
                  Breakfast Total
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {masterSheet?.totals.totalBreakfast.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-1">
                  <Sun className="w-4 h-4" />
                  Lunch Total
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {masterSheet?.totals.totalLunch.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                  <Moon className="w-4 h-4" />
                  Dinner Total
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {masterSheet?.totals.totalDinner.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <Utensils className="w-4 h-4" />
                  Total Daily Meals
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {masterSheet?.totals.totalMeals.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            {/* Master Grid Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100">Member Meal Breakdown</h3>
                  <p className="text-xs text-slate-400">
                    {isManager
                      ? 'As Manager, you can edit and override any member count on any date directly.'
                      : 'Live view of today’s meal sheet across all active mess residents.'}
                  </p>
                </div>
                <button
                  onClick={() => loadMasterSheet(selectedDate)}
                  disabled={isMasterLoading}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Reload"
                >
                  <RefreshCw className={`w-4 h-4 ${isMasterLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Member</th>
                      <th className="py-3.5 px-3 font-semibold text-center w-28">Breakfast</th>
                      <th className="py-3.5 px-3 font-semibold text-center w-28">Lunch</th>
                      <th className="py-3.5 px-3 font-semibold text-center w-28">Dinner</th>
                      <th className="py-3.5 px-3 font-semibold text-center w-24">Total</th>
                      {isManager && <th className="py-3.5 px-4 font-semibold text-right w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isMasterLoading ? (
                      <tr>
                        <td colSpan={isManager ? 6 : 5} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                          Loading master sheet...
                        </td>
                      </tr>
                    ) : masterSheet?.members.length === 0 ? (
                      <tr>
                        <td colSpan={isManager ? 6 : 5} className="py-12 text-center text-slate-500">
                          No active members in this mess.
                        </td>
                      </tr>
                    ) : (
                      masterSheet?.members.map((member) => {
                        const counts = editGrid[member.userId] || {
                          breakfast: member.breakfastCount,
                          lunch: member.lunchCount,
                          dinner: member.dinnerCount,
                        };
                        const total = Number((counts.breakfast + counts.lunch + counts.dinner).toFixed(2));
                        const isCaller = member.userId === user?.id;

                        return (
                          <tr
                            key={member.userId}
                            className={`hover:bg-slate-800/30 transition-colors ${
                              isCaller ? 'bg-emerald-500/[0.03]' : ''
                            }`}
                          >
                            {/* Member Name */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                                  {member.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    {member.userName}
                                    {isCaller && (
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">{member.role}</div>
                                </div>
                              </div>
                            </td>

                            {/* Breakfast */}
                            <td className="py-3 px-3 text-center">
                              {isManager ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="20"
                                  value={counts.breakfast}
                                  onChange={(e) =>
                                    setEditGrid((prev) => ({
                                      ...prev,
                                      [member.userId]: {
                                        ...counts,
                                        breakfast: Math.max(0, Number(e.target.value)),
                                      },
                                    }))
                                  }
                                  className="w-16 py-1 text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                                />
                              ) : (
                                <span className="font-mono text-slate-200 font-medium">
                                  {member.breakfastCount.toFixed(1)}
                                </span>
                              )}
                            </td>

                            {/* Lunch */}
                            <td className="py-3 px-3 text-center">
                              {isManager ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="20"
                                  value={counts.lunch}
                                  onChange={(e) =>
                                    setEditGrid((prev) => ({
                                      ...prev,
                                      [member.userId]: {
                                        ...counts,
                                        lunch: Math.max(0, Number(e.target.value)),
                                      },
                                    }))
                                  }
                                  className="w-16 py-1 text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                                />
                              ) : (
                                <span className="font-mono text-slate-200 font-medium">
                                  {member.lunchCount.toFixed(1)}
                                </span>
                              )}
                            </td>

                            {/* Dinner */}
                            <td className="py-3 px-3 text-center">
                              {isManager ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="20"
                                  value={counts.dinner}
                                  onChange={(e) =>
                                    setEditGrid((prev) => ({
                                      ...prev,
                                      [member.userId]: {
                                        ...counts,
                                        dinner: Math.max(0, Number(e.target.value)),
                                      },
                                    }))
                                  }
                                  className="w-16 py-1 text-center bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                                />
                              ) : (
                                <span className="font-mono text-slate-200 font-medium">
                                  {member.dinnerCount.toFixed(1)}
                                </span>
                              )}
                            </td>

                            {/* Total */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-bold text-emerald-400">
                                {total.toFixed(2)}
                              </span>
                            </td>

                            {/* Action (Manager only) */}
                            {isManager && (
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  disabled={isSavingMemberId === member.userId}
                                  onClick={() => handleManagerSave(member)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors disabled:opacity-50"
                                >
                                  {isSavingMemberId === member.userId ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  Save
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY MONTHLY HISTORY                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Top Month Selector */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Personal Monthly Meal Log</h3>
                <p className="text-xs text-slate-400">Review your daily meal consumption records for any calendar month.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => loadMonthlySummary(selectedMonth)}
                  disabled={isMonthlyLoading}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isMonthlyLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Monthly Total Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                  <Coffee className="w-4 h-4" />
                  My Breakfasts
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {monthlySummary?.totalBreakfast.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-1">
                  <Sun className="w-4 h-4" />
                  My Lunches
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {monthlySummary?.totalLunch.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                  <Moon className="w-4 h-4" />
                  My Dinners
                </div>
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {monthlySummary?.totalDinner.toFixed(1) || '0.0'}
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <Utensils className="w-4 h-4" />
                  Total Month Meals
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {monthlySummary?.totalMeals.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Date</th>
                      <th className="py-3.5 px-3 font-semibold text-center">Breakfast</th>
                      <th className="py-3.5 px-3 font-semibold text-center">Lunch</th>
                      <th className="py-3.5 px-3 font-semibold text-center">Dinner</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Daily Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isMonthlyLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                          Loading history...
                        </td>
                      </tr>
                    ) : !monthlySummary || monthlySummary.records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          No meal records found for {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      monthlySummary.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-200">
                            {r.mealDate}
                            <span className="text-xs text-slate-500 ml-2">
                              ({formatDisplayDate(r.mealDate).split(',')[0]})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-300">
                            {r.breakfastCount.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-300">
                            {r.lunchCount.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-300">
                            {r.dinnerCount.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {r.totalMeals.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
