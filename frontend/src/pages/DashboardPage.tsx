import { useState, useEffect, useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  LogOut, 
  Sparkles, 
  Building2, 
  Users, 
  PlusCircle, 
  Receipt,
  Wallet,
  TrendingUp,
  Coins,
  Calendar,
  RefreshCw,
  Eye,
  X,
  PiggyBank,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboard.service';
import type { 
  DashboardSummary, 
  MemberLedgerItem, 
  MyFinancialSummary,
} from '../types/dashboard';

export const DashboardPage: FC = () => {
  const { user, activeMess, logout } = useAuth();

  // Current month 'YYYY-MM'
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Financial States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ledger, setLedger] = useState<MemberLedgerItem[]>([]);
  const [mySummary, setMySummary] = useState<MyFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI state for search & breakdown modal
  const [searchMember, setSearchMember] = useState<string>('');
  const [showFixedModal, setShowFixedModal] = useState<boolean>(false);

  const fetchDashboardData = async (month: string) => {
    if (!activeMess || activeMess.status !== 'ACTIVE') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [sumData, ledgerData, myData] = await Promise.all([
        dashboardService.getSummary(month),
        dashboardService.getMemberLedger(month),
        dashboardService.getMySummary(month),
      ]);

      setSummary(sumData);
      setLedger(ledgerData);
      setMySummary(myData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.response?.data?.error?.message || 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth, activeMess]);

  // Filtered members for the Excel-style table
  const filteredLedger = useMemo(() => {
    if (!searchMember.trim()) return ledger;
    const q = searchMember.toLowerCase();
    return ledger.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [ledger, searchMember]);

  // Grand totals for the ledger bottom row
  const ledgerTotals = useMemo(() => {
    return ledger.reduce(
      (acc, item) => {
        acc.meals += item.memberMeals;
        acc.mealCost += item.mealCost;
        acc.fixedCost += item.fixedCostShare;
        acc.openingBalance += item.openingBalance;
        acc.totalCost += item.totalCost;
        acc.deposits += item.totalApprovedDeposits;
        acc.netBalance += item.netBalance;
        return acc;
      },
      {
        meals: 0,
        mealCost: 0,
        fixedCost: 0,
        openingBalance: 0,
        totalCost: 0,
        deposits: 0,
        netBalance: 0,
      }
    );
  }, [ledger]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Sticky Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-md shadow-emerald-200">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-800">
                  MessManager
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Phase 7 Live
                </span>
              </div>
              {activeMess?.status === 'ACTIVE' && (
                <p className="text-xs text-slate-500 font-medium">
                  {activeMess.messName} • <span className="font-semibold text-emerald-700">{activeMess.role}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeMess?.status === 'ACTIVE' && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                <Link
                  to="/meals"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-white rounded-lg transition-all"
                >
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daily Meals</span>
                </Link>
                <Link
                  to="/expenses"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-white rounded-lg transition-all"
                >
                  <Receipt className="w-3.5 h-3.5 text-purple-600" />
                  <span>Expenses</span>
                </Link>
                <Link
                  to="/deposits"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 hover:bg-white rounded-lg transition-all"
                >
                  <Wallet className="w-3.5 h-3.5 text-sky-600" />
                  <span>Deposits</span>
                </Link>
                <Link
                  to="/members"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                  <span>Members</span>
                </Link>
              </div>
            )}

            {/* Month Selector */}
            {activeMess?.status === 'ACTIVE' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                />
                <button
                  onClick={() => fetchDashboardData(selectedMonth)}
                  title="Refresh live calculation"
                  className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
        {/* Onboarding Notice if not active */}
        {activeMess?.status !== 'ACTIVE' ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Join or Create a Mess</h2>
              <p className="text-xs text-slate-500 mt-1">
                To access live meal rates, financial ledgers, and expense tracking, you need an active mess tenancy.
              </p>
            </div>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Get Started Now</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Error banner if any */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Actions Bar (Mobile & Quick Links) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/meals"
                className="p-3 bg-white hover:bg-emerald-50/60 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-all group"
              >
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Daily Meals</h4>
                  <p className="text-[10px] text-slate-500">Log today's meal</p>
                </div>
              </Link>

              <Link
                to="/expenses"
                className="p-3 bg-white hover:bg-purple-50/60 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-all group"
              >
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Expenses</h4>
                  <p className="text-[10px] text-slate-500">Bazar & fixed bills</p>
                </div>
              </Link>

              <Link
                to="/deposits"
                className="p-3 bg-white hover:bg-sky-50/60 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-all group"
              >
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Deposits</h4>
                  <p className="text-[10px] text-slate-500">Cash & bKash pool</p>
                </div>
              </Link>

              <Link
                to="/members"
                className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 transition-all group"
              >
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Members</h4>
                  <p className="text-[10px] text-slate-500">Tenants & Invites</p>
                </div>
              </Link>
            </div>

            {/* 4 Core Financial KPI Metric Cards (Excel Overview) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Live Meal Rate */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-lg shadow-emerald-700/10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
                  <TrendingUp className="w-28 h-28" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                      Current Meal Rate
                    </span>
                    <span className="p-1.5 bg-white/20 backdrop-blur-md rounded-xl text-white">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-3xl font-black mt-2 tracking-tight">
                    ৳ {summary ? summary.currentMealRate.toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/20 text-[11px] text-emerald-100 flex items-center justify-between">
                  <span>Approved Bazar ÷ Meals</span>
                  <span className="font-bold">{summary?.totalMessMeals || 0} Meals Eaten</span>
                </div>
              </div>

              {/* 2. Cash In Hand / Rest Amount (Image 1 from user Excel) */}
              <div className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${
                (summary?.cashInHand ?? 0) >= 0 
                  ? 'bg-white border-emerald-200' 
                  : 'bg-white border-rose-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Cash In Hand
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">Rest Amount (Excel D2)</p>
                    </div>
                    <div className={`p-2 rounded-xl ${
                      (summary?.cashInHand ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`text-3xl font-black mt-2 tracking-tight ${
                    (summary?.cashInHand ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    ৳ {summary ? summary.cashInHand.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Deposits: ৳{summary?.totalApprovedDeposits || 0}</span>
                  <span>Paid: ৳{summary?.totalExpensesPaid || 0}</span>
                </div>
              </div>

              {/* 3. Total Bazar Expenses */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Total Bazar Cost
                    </span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Utensils className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black mt-2 text-slate-900 tracking-tight">
                    ৳ {summary ? summary.totalApprovedBazar.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Daily food & groceries</span>
                  <Link to="/expenses" className="text-amber-600 font-bold hover:underline">
                    View Bazar →
                  </Link>
                </div>
              </div>

              {/* 4. Shared Fixed & Utilities (Rent, Cook, Wifi, Elec...) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Shared Fixed Bills
                    </span>
                    <button
                      onClick={() => setShowFixedModal(true)}
                      className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                      title="View bill breakdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-3xl font-black mt-2 text-slate-900 tracking-tight">
                    ৳ {summary ? summary.totalApprovedFixed.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Per Member: <strong>৳{summary?.fixedSharePerMember || 0}</strong></span>
                  <button
                    onClick={() => setShowFixedModal(true)}
                    className="text-purple-600 font-bold hover:underline cursor-pointer"
                  >
                    Breakdown ({summary?.fixedExpensesBreakdown.length || 0}) →
                  </button>
                </div>
              </div>
            </div>

            {/* Personal Statement Card (আমার ব্যক্তিগত হিসাব) */}
            {mySummary && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-400 border border-white/10">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>My Financial Overview • {selectedMonth}</span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">
                      {mySummary.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time calculation based on your meals, shared utility share, and recorded deposits.
                    </p>
                  </div>

                  {/* Net Balance Pill */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className={`px-5 py-4 rounded-2xl border ${
                      mySummary.netBalance >= 0 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                        {mySummary.netBalance >= 0 ? 'Your Credit Balance (জমা)' : 'Your Current Due (বকেয়া)'}
                      </div>
                      <div className="text-2xl font-black mt-0.5">
                        {mySummary.netBalance >= 0 ? `+৳ ${mySummary.netBalance.toFixed(2)}` : `-৳ ${Math.abs(mySummary.netBalance).toFixed(2)}`}
                      </div>
                      <div className="text-[10px] mt-1 text-slate-300">
                        {mySummary.netBalance >= 0 
                          ? '✅ You have surplus deposit' 
                          : '⚠️ Please deposit to clear dues'}
                      </div>
                    </div>

                    <Link
                      to="/deposits"
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-stretch sm:self-center justify-center cursor-pointer"
                    >
                      <PiggyBank className="w-4 h-4" />
                      <span>Deposit Money</span>
                    </Link>
                  </div>
                </div>

                {/* Personal Breakdown Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">My Meals</span>
                    <p className="text-base font-extrabold text-white mt-0.5">{mySummary.memberMeals}</p>
                    <span className="text-[10px] text-slate-400">@ ৳{mySummary.mealRate.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Meal Cost</span>
                    <p className="text-base font-extrabold text-white mt-0.5">৳ {mySummary.mealCost.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">Food expense</span>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Fixed Share</span>
                    <p className="text-base font-extrabold text-white mt-0.5">৳ {mySummary.fixedCostShare.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">Rent & utilities</span>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Expense</span>
                    <p className="text-base font-extrabold text-white mt-0.5">৳ {mySummary.totalCost.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">Total payable</span>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Deposited</span>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">৳ {mySummary.totalApprovedDeposits.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">Approved pool</span>
                  </div>
                </div>
              </div>
            )}

            {/* Master Monthly Ledger Table (Directly Matching User's Excel Sheet Image 2) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Monthly Financial Ledger
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                      {selectedMonth}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Excel-style master ledger showing each member's meals, costs, deposits, and net dues.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search member..."
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-44"
                  />
                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                    {filteredLedger.length} Members
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px]">Member Name</th>
                      <th className="py-3 px-3 uppercase tracking-wider text-[11px] text-center">Meals</th>
                      <th className="py-3 px-3 uppercase tracking-wider text-[11px] text-right">Meal Cost</th>
                      <th className="py-3 px-3 uppercase tracking-wider text-[11px] text-right">Fixed Share</th>
                      <th className="py-3 px-3 uppercase tracking-wider text-[11px] text-right">Arrears (জের)</th>
                      <th className="py-3 px-3 uppercase tracking-wider text-[11px] text-right">Total Cost</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-right">Total Deposit</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-right">Net Balance</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[11px] text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          No active members found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((member) => {
                        const isSelf = member.userId === user?.id;
                        const isCredit = member.netBalance >= 0;

                        return (
                          <tr
                            key={member.userId}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelf ? 'bg-emerald-50/40 font-semibold' : ''
                            }`}
                          >
                            {/* Member Name */}
                            <td className="py-3.5 px-4 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">
                                    {member.name}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {member.role}
                                </div>
                              </div>
                            </td>

                            {/* Meals */}
                            <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                              {member.memberMeals}
                            </td>

                            {/* Meal Cost */}
                            <td className="py-3.5 px-3 text-right font-mono">
                              ৳{member.mealCost.toFixed(2)}
                            </td>

                            {/* Fixed Share */}
                            <td className="py-3.5 px-3 text-right font-mono">
                              ৳{member.fixedCostShare.toFixed(2)}
                            </td>

                            {/* Arrears (Previous Month Carried Over) */}
                            <td className={`py-3.5 px-3 text-right font-mono ${
                              member.openingBalance < 0 
                                ? 'text-rose-600' 
                                : member.openingBalance > 0 
                                ? 'text-emerald-600' 
                                : 'text-slate-400'
                            }`}>
                              {member.openingBalance === 0 
                                ? '৳0.00' 
                                : member.openingBalance > 0 
                                ? `+৳${member.openingBalance.toFixed(2)}` 
                                : `-৳${Math.abs(member.openingBalance).toFixed(2)}`}
                            </td>

                            {/* Total Cost / Payable */}
                            <td className="py-3.5 px-3 text-right font-bold font-mono text-slate-900">
                              ৳{member.totalCost.toFixed(2)}
                            </td>

                            {/* Total Deposit */}
                            <td className="py-3.5 px-4 text-right font-bold font-mono text-emerald-700">
                              ৳{member.totalApprovedDeposits.toFixed(2)}
                              {member.totalPendingDeposits > 0 && (
                                <span className="block text-[10px] text-amber-600 font-normal">
                                  (+৳{member.totalPendingDeposits.toFixed(2)} pending)
                                </span>
                              )}
                            </td>

                            {/* Net Balance */}
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                  isCredit
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isCredit ? `+৳${member.netBalance.toFixed(2)}` : `-৳${Math.abs(member.netBalance).toFixed(2)}`}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              {isCredit ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>Advance / Paid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Due (বকেয়া)</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Summary / Total Footer Row (Directly matching Excel Total Row!) */}
                  {ledger.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-extrabold border-t-2 border-slate-800 text-xs">
                        <td className="py-3.5 px-4 uppercase tracking-wider text-[11px]">
                          TOTAL (সর্বমোট)
                        </td>
                        <td className="py-3.5 px-3 text-center text-sm font-bold text-emerald-400">
                          {ledgerTotals.meals}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          ৳{ledgerTotals.mealCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          ৳{ledgerTotals.fixedCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          ৳{ledgerTotals.openingBalance.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                          ৳{ledgerTotals.totalCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                          ৳{ledgerTotals.deposits.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            ledgerTotals.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {ledgerTotals.netBalance >= 0 
                              ? `+৳${ledgerTotals.netBalance.toFixed(2)}` 
                              : `-৳${Math.abs(ledgerTotals.netBalance).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-[10px] text-slate-400 font-semibold">
                          Reconciled
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Shared Fixed Expenses Breakdown Modal (Image 1 from Excel) */}
      {showFixedModal && summary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Shared Fixed & Utility Bills</h3>
                  <p className="text-xs text-slate-500">Water, Khala, Wifi, Electricity, Rent breakdown</p>
                </div>
              </div>
              <button
                onClick={() => setShowFixedModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {summary.fixedExpensesBreakdown.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No shared fixed bills recorded for {selectedMonth}.
                </div>
              ) : (
                summary.fixedExpensesBreakdown.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                      <p className="text-[10px] text-slate-400">
                        Paid by {item.paidByName} • {item.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-sm text-slate-900">
                        ৳ {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Total Fixed:</span>
              <span className="font-extrabold font-mono text-base text-purple-700">
                ৳ {summary.totalApprovedFixed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-1 text-center">
              <button
                onClick={() => setShowFixedModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 7 Live Financial Engine
      </footer>
    </div>
  );
};
