import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Plus,
  ShoppingCart,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expense.service';
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseSummary,
} from '../types/expense';

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

export const ExpensesPage: FC = () => {
  const { user, activeMess } = useAuth();
  const messId = activeMess?.messId;
  const isManager = activeMess?.role === 'MANAGER';

  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonth = todayStr.substring(0, 7);

  // States
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalBazar: 0,
    totalSharedFixed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<ExpenseCategory>('BAZAR');
  const [modalTitle, setModalTitle] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalDate, setModalDate] = useState(todayStr);
  const [modalDescription, setModalDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Auto clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadExpenses = async () => {
    if (!messId) return;
    setIsLoading(true);
    try {
      const res = await expenseService.getExpenses({
        messId,
        month: selectedMonth,
        category: categoryFilter,
        status: statusFilter,
      });
      setExpenses(res.expenses);
      setSummary(res.summary);
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load expenses',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [messId, selectedMonth, categoryFilter, statusFilter]);

  const handleCreateExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!messId) return;

    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ type: 'error', text: 'Please enter a valid positive amount' });
      return;
    }
    if (!modalTitle.trim()) {
      setToast({ type: 'error', text: 'Please enter an expense title' });
      return;
    }

    setIsSubmitting(true);
    try {
      await expenseService.createExpense({
        messId,
        category: modalCategory,
        title: modalTitle.trim(),
        amount: amt,
        expenseDate: modalDate,
        description: modalDescription.trim() || undefined,
      });

      setToast({
        type: 'success',
        text: isManager
          ? 'Expense logged and auto-approved!'
          : 'Expense submitted for manager approval!',
      });

      // Reset modal
      setIsModalOpen(false);
      setModalTitle('');
      setModalAmount('');
      setModalDescription('');
      setModalDate(todayStr);

      await loadExpenses();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to create expense',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (expenseId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!messId) return;
    setActionLoadingId(expenseId);
    try {
      await expenseService.updateStatus(expenseId, messId, newStatus);
      setToast({
        type: 'success',
        text: `Expense marked as ${newStatus}`,
      });
      await loadExpenses();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update expense status',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!messId) return;
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    setActionLoadingId(expenseId);
    try {
      await expenseService.deleteExpense(expenseId, messId);
      setToast({
        type: 'success',
        text: 'Expense deleted successfully',
      });
      await loadExpenses();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to delete expense',
      });
    } finally {
      setActionLoadingId(null);
    }
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
                <Receipt className="w-6 h-6" />
              </span>
              Dual Expense Ledger
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeMess?.messName ? `${activeMess.messName} • ` : ''}
              Track Bazar groceries (variable meal rate) and Shared Fixed utilities
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
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

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Bazar Total */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <ShoppingCart className="w-4 h-4" />
              Bazar Expense (Meal)
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              ৳ {summary.totalBazar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Calculates meal rate</p>
          </div>

          {/* Shared Fixed Total */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
              <Building className="w-4 h-4" />
              Shared Fixed Overhead
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              ৳ {summary.totalSharedFixed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Split equally per head</p>
          </div>

          {/* Total Approved */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Total Approved
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              ৳ {summary.totalApproved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-1">Ready for settlement</p>
          </div>

          {/* Total Pending */}
          <div className="bg-amber-950/20 border border-amber-500/30 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              Pending Approval
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              ৳ {summary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-amber-500/80 mt-1">Awaiting manager check</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Expenses
            </button>
            <button
              onClick={() => setCategoryFilter('BAZAR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                categoryFilter === 'BAZAR'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Bazar (Meal)
            </button>
            <button
              onClick={() => setCategoryFilter('SHARED_FIXED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                categoryFilter === 'SHARED_FIXED'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Shared Fixed
            </button>
          </div>

          {/* Right Controls: Month Selector & Status Filter */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              onClick={loadExpenses}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Expense Title</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Paid By</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No expenses found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  expenses.map((item) => {
                    const isBazar = item.category === 'BAZAR';
                    const isCallerPayer = item.paidByUserId === user?.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Category Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                              isBazar
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {isBazar ? <ShoppingCart className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                            {isBazar ? 'Bazar' : 'Shared Fixed'}
                          </span>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-slate-400 max-w-xs truncate mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          {item.expenseDate}
                          <span className="block text-[11px] text-slate-500">
                            {formatDisplayDate(item.expenseDate).split(',')[0]}
                          </span>
                        </td>

                        {/* Paid By */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-300">
                            {item.paidByUserName}
                            {isCallerPayer && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px]">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.paidByUserEmail}</div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 text-base">
                          ৳ {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {item.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved
                            </span>
                          )}
                          {item.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manager Approval Controls */}
                            {isManager && item.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                                  title="Approve Expense"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                                  title="Reject Expense"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Delete Control (Manager, or Member on their own PENDING item) */}
                            {(isManager || (isCallerPayer && item.status === 'PENDING')) && (
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleDeleteExpense(item.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Log New Expense */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Log New Expense</h3>
                    <p className="text-xs text-slate-400">Record a meal grocery or shared flat expense</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Expense Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalCategory('BAZAR')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        modalCategory === 'BAZAR'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <ShoppingCart className="w-4 h-4" />
                        Bazar (Groceries)
                      </div>
                      <span className="text-[11px] text-slate-500">Meal rate calculation</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalCategory('SHARED_FIXED')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        modalCategory === 'SHARED_FIXED'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Building className="w-4 h-4" />
                        Shared Fixed
                      </div>
                      <span className="text-[11px] text-slate-500">Rent, utility, internet</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Expense Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={modalCategory === 'BAZAR' ? 'e.g. Chicken, Rice & Eggs' : 'e.g. House Rent Sep 2026'}
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Amount & Date in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Amount (BDT ৳) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="0.00"
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Notes / Description <span className="text-slate-500">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide itemized details or receipt notes..."
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Notice */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {isManager
                      ? 'As Manager, this expense will be automatically approved upon logging.'
                      : 'As a Member, this expense will be submitted with "Pending" status for Manager approval.'}
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving Expense...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Submit Expense
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
