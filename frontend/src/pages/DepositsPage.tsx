import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Calendar,
  Banknote,
  Smartphone,
  CreditCard,
  Building,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { depositService } from '../services/deposit.service';
import { messService } from '../services/mess.service';
import type {
  Deposit,
  PaymentMethod,
  DepositStatus,
  DepositSummary,
} from '../types/deposit';
import type { Member } from '../types/mess';

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

export const DepositsPage: FC = () => {
  const { user, activeMess } = useAuth();
  const messId = activeMess?.messId;
  const isManager = activeMess?.role === 'MANAGER';

  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonth = todayStr.substring(0, 7);

  // States
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [statusFilter, setStatusFilter] = useState<DepositStatus | 'ALL'>('ALL');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<DepositSummary>({
    totalApproved: 0,
    totalPending: 0,
    totalCash: 0,
    totalDigital: 0,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMethod, setModalMethod] = useState<PaymentMethod>('BKASH');
  const [modalAmount, setModalAmount] = useState('');
  const [modalDate, setModalDate] = useState(todayStr);
  const [modalTrxRef, setModalTrxRef] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalTargetUserId, setModalTargetUserId] = useState<number | ''>('');
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

  const loadDeposits = async () => {
    if (!messId) return;
    setIsLoading(true);
    try {
      const res = await depositService.getDeposits({
        messId,
        month: selectedMonth,
        status: statusFilter,
      });
      setDeposits(res.deposits);
      setSummary(res.summary);
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load deposits',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!messId || !isManager) return;
    try {
      const memberList = await messService.getMembers(messId);
      setMembers(memberList.filter((m) => m.status === 'ACTIVE'));
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    loadDeposits();
  }, [messId, selectedMonth, statusFilter]);

  useEffect(() => {
    loadMembers();
  }, [messId, isManager]);

  const handleCreateDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (!messId) return;

    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ type: 'error', text: 'Please enter a valid positive deposit amount' });
      return;
    }

    setIsSubmitting(true);
    try {
      await depositService.createDeposit({
        messId,
        amount: amt,
        depositDate: modalDate,
        paymentMethod: modalMethod,
        transactionRef: modalTrxRef.trim() || undefined,
        notes: modalNotes.trim() || undefined,
        targetUserId: modalTargetUserId ? Number(modalTargetUserId) : undefined,
      });

      setToast({
        type: 'success',
        text: isManager
          ? 'Deposit recorded and approved successfully!'
          : 'Deposit slip submitted for manager verification!',
      });

      setIsModalOpen(false);
      setModalAmount('');
      setModalTrxRef('');
      setModalNotes('');
      setModalDate(todayStr);
      setModalTargetUserId('');

      await loadDeposits();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to submit deposit',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (depositId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!messId) return;
    setActionLoadingId(depositId);
    try {
      await depositService.updateStatus(depositId, messId, newStatus);
      setToast({
        type: 'success',
        text: `Deposit marked as ${newStatus}`,
      });
      await loadDeposits();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update deposit status',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteDeposit = async (depositId: number) => {
    if (!messId) return;
    if (!window.confirm('Are you sure you want to delete this deposit record?')) return;

    setActionLoadingId(depositId);
    try {
      await depositService.deleteDeposit(depositId, messId);
      setToast({
        type: 'success',
        text: 'Deposit record deleted successfully',
      });
      await loadDeposits();
    } catch (err: any) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to delete deposit',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
                <Wallet className="w-6 h-6" />
              </span>
              Deposit Reconciliation
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeMess?.messName ? `${activeMess.messName} • ` : ''}
              Track member cash deposits, bKash/Nagad transfers, and manager reconciliation
            </p>
          </div>

          <button
            onClick={() => {
              setModalTargetUserId(user?.id || '');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Deposit</span>
          </button>
        </div>

        {/* Global Toast */}
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
          {/* Total Approved Deposits */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Total Approved Pool
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              ৳ {summary.totalApproved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-1">Available mess funds</p>
          </div>

          {/* Pending Approval */}
          <div className="bg-amber-950/20 border border-amber-500/30 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              Pending Verification
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              ৳ {summary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-amber-500/80 mt-1">Awaiting manager check</p>
          </div>

          {/* Cash Collections */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-1">
              <Banknote className="w-4 h-4" />
              Cash Deposits
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              ৳ {summary.totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Hand-to-hand cash</p>
          </div>

          {/* Digital Transfers */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-semibold mb-1">
              <Smartphone className="w-4 h-4" />
              Digital (bKash/Nagad/Bank)
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              ৳ {summary.totalDigital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">MFS & Bank slips</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Deposits
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rejected
            </button>
          </div>

          {/* Right Controls: Month Selector & Refresh */}
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

            <button
              onClick={loadDeposits}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Deposits Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Member</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Trx ID / Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Notes</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                      Loading deposits...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No deposit records found for this period.
                    </td>
                  </tr>
                ) : (
                  deposits.map((item) => {
                    const isCaller = item.userId === user?.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Member */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-200">
                            {item.userName}
                            {isCaller && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.userEmail}</div>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4">
                          {item.paymentMethod === 'CASH' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Banknote className="w-3.5 h-3.5" />
                              Cash
                            </span>
                          )}
                          {item.paymentMethod === 'BKASH' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                              <Smartphone className="w-3.5 h-3.5" />
                              bKash
                            </span>
                          )}
                          {item.paymentMethod === 'NAGAD' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              <Smartphone className="w-3.5 h-3.5" />
                              Nagad
                            </span>
                          )}
                          {item.paymentMethod === 'BANK' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <Building className="w-3.5 h-3.5" />
                              Bank
                            </span>
                          )}
                          {item.paymentMethod === 'OTHER' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              <CreditCard className="w-3.5 h-3.5" />
                              Other
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          {item.depositDate}
                          <span className="block text-[11px] text-slate-500">
                            {formatDisplayDate(item.depositDate).split(',')[0]}
                          </span>
                        </td>

                        {/* Transaction Ref */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          {item.transactionRef ? (
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.transactionRef}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">
                          {item.notes || '-'}
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
                            {/* Manager Approval Actions */}
                            {isManager && item.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                                  title="Approve Deposit"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                                  title="Reject Deposit"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Delete Action (Manager or Member on own PENDING) */}
                            {(isManager || (isCaller && item.status === 'PENDING')) && (
                              <button
                                type="button"
                                disabled={actionLoadingId === item.id}
                                onClick={() => handleDeleteDeposit(item.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Deposit"
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

        {/* Modal: Submit Deposit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {isManager ? 'Record Deposit' : 'Submit Deposit Slip'}
                    </h3>
                    <p className="text-xs text-slate-400">Cash collection or digital advance contribution</p>
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

              <form onSubmit={handleCreateDeposit} className="space-y-4">
                {/* If Manager: Choose Member */}
                {isManager && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Deposit On Behalf Of
                    </label>
                    <select
                      value={modalTargetUserId}
                      onChange={(e) => setModalTargetUserId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value={user?.id}>Myself ({user?.name})</option>
                      {members
                        .filter((m) => m.userId !== user?.id)
                        .map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['BKASH', 'NAGAD', 'CASH', 'BANK', 'OTHER'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setModalMethod(method)}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          modalMethod === method
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {method === 'CASH' && <Banknote className="w-4 h-4" />}
                        {method === 'BKASH' && <Smartphone className="w-4 h-4 text-pink-400" />}
                        {method === 'NAGAD' && <Smartphone className="w-4 h-4 text-orange-400" />}
                        {method === 'BANK' && <Building className="w-4 h-4 text-sky-400" />}
                        {method === 'OTHER' && <CreditCard className="w-4 h-4" />}
                        <span className="text-[11px] font-bold">
                          {method === 'BKASH'
                            ? 'bKash'
                            : method === 'NAGAD'
                            ? 'Nagad'
                            : method === 'CASH'
                            ? 'Cash'
                            : method === 'BANK'
                            ? 'Bank'
                            : 'Other'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount & Date */}
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
                      placeholder="e.g. 2000"
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Deposit Date <span className="text-rose-400">*</span>
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

                {/* TrxID (for digital payments) */}
                {modalMethod !== 'CASH' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Transaction ID / Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9J28DA71 or Bank slip number"
                      value={modalTrxRef}
                      onChange={(e) => setModalTrxRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Notes <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sent from personal 017xxxxxxxx number"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Notice */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {isManager
                      ? 'As Manager, this deposit will be approved immediately upon entry.'
                      : 'This deposit will appear as "Pending" until verified and approved by the Mess Manager.'}
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
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {isManager ? 'Record Deposit' : 'Submit Deposit'}
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
