import { useState, type FormEvent, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, KeyRound, Clock, MapPin, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messService } from '../services/mess.service';

export const OnboardingPage: FC = () => {
  const { user, activeMess, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Create form state
  const [messName, setMessName] = useState('');
  const [address, setAddress] = useState('');
  const [lunchCutoff, setLunchCutoff] = useState('09:00');
  const [dinnerCutoff, setDinnerCutoff] = useState('16:00');

  // Join form state
  const [inviteCode, setInviteCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateMess = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!messName.trim()) {
      setError('Please enter a mess name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await messService.createMess({
        name: messName.trim(),
        address: address.trim() || undefined,
        lunchCutoffTime: lunchCutoff ? `${lunchCutoff}:00` : '09:00:00',
        dinnerCutoffTime: dinnerCutoff ? `${dinnerCutoff}:00` : '16:00:00',
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create mess.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinMess = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!inviteCode.trim()) {
      setError('Please enter an invite code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await messService.joinMess(inviteCode.trim().toUpperCase());
      setSuccessMsg(res.message || 'Join request submitted! Waiting for manager approval.');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to join mess.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already pending approval
  if (activeMess?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Join Request Pending</h2>
          <p className="text-sm text-slate-600 mb-6">
            You have requested to join <strong>{activeMess.messName}</strong>. Your membership is awaiting manager approval.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 mb-6 text-left space-y-2 border border-slate-100">
            <p>• The mess manager must accept your request before you can log meals or view records.</p>
            <p>• Once approved, this page will automatically grant access to the mess dashboard.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refreshUser()}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Check Status
            </button>
            <button
              onClick={logout}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">Mess Onboarding</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome, {user?.name}!
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            To begin managing meals and shared finances, create a new mess or join your roommates' existing mess.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 p-1.5 rounded-2xl max-w-md mx-auto mb-8">
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Create Mess</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>Join Existing</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Card: Create Mess */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create a New Mess</h2>
              <p className="text-xs text-slate-500 mt-1">
                You will be assigned as the Mess Manager and will receive an invite code to share with roommates.
              </p>
            </div>

            <form onSubmit={handleCreateMess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mess Name *
                </label>
                <input
                  type="text"
                  value={messName}
                  onChange={(e) => setMessName(e.target.value)}
                  placeholder="e.g. Bachelor Paradise"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Address / Flat Info (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Flat 4B, House 12, Road 5, Uttara"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Lunch Cutoff</span>
                  </label>
                  <input
                    type="time"
                    value={lunchCutoff}
                    onChange={(e) => setLunchCutoff(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Daily deadline for lunch</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Dinner Cutoff</span>
                  </label>
                  <input
                    type="time"
                    value={dinnerCutoff}
                    onChange={(e) => setDinnerCutoff(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Daily deadline for dinner</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Mess...</span>
                  </>
                ) : (
                  <>
                    <span>Create Mess & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Card: Join Mess */}
        {activeTab === 'join' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Join an Existing Mess</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the unique invite code given to you by your mess manager.
              </p>
            </div>

            <form onSubmit={handleJoinMess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mess Invite Code *
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. M-8X2F9C"
                    required
                    maxLength={10}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none uppercase"
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1.5 block">
                  Invite codes typically start with 'M-' followed by 6 alphanumeric characters.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Join Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 3 Onboarding
      </footer>
    </div>
  );
};
