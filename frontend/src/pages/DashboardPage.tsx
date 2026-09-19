import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Sparkles, 
  Building2, 
  CheckCircle, 
  Users, 
  PlusCircle, 
  Clock,
  Receipt,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: FC = () => {
  const { user, activeMess, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-200">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              MessManager
            </span>
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
              Phase 6 Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            {activeMess?.status === 'ACTIVE' && (
              <>
                <Link
                  to="/meals"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <span>Daily Meals</span>
                </Link>
                <Link
                  to="/expenses"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Expenses</span>
                </Link>
                <Link
                  to="/deposits"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Deposits</span>
                </Link>
                <Link
                  to="/members"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Members</span>
                </Link>
              </>
            )}

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 font-medium">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span>{user?.name}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-10 w-full">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl shadow-emerald-900/10 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tenancy & Member Onboarding Active</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {activeMess?.status === 'ACTIVE' ? activeMess.messName : `Welcome, ${user?.name}!`}
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              {activeMess?.status === 'ACTIVE'
                ? `You are logged in as ${activeMess.role} of ${activeMess.messName}. Prepare for Phase 4 daily meal logging.`
                : 'You have not joined a mess yet. Create a new mess or join with an invite code.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs flex flex-col gap-1.5 shrink-0">
            <span className="text-emerald-200 font-semibold uppercase tracking-wider">Session Info</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span className="font-mono">{user?.email}</span>
            </div>
            <div className="text-emerald-200">
              User ID: #{user?.id}
            </div>
          </div>
        </div>

        {/* Phase 3 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Mess Membership Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Current Mess Details</h3>
                  <p className="text-xs text-slate-500">Multi-tenant group ledger</p>
                </div>
              </div>

              {activeMess?.status === 'ACTIVE' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span>{activeMess.messName}</span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {activeMess.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-emerald-700">
                      {activeMess.inviteCode && (
                        <span>Invite Code: <strong className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded border border-emerald-300">{activeMess.inviteCode}</strong></span>
                      )}
                      <span>Status: <strong>Active</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                      to="/meals"
                      className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>Daily Meals</span>
                    </Link>
                    <Link
                      to="/expenses"
                      className="w-full py-3 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Expenses</span>
                    </Link>
                    <Link
                      to="/deposits"
                      className="w-full py-3 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Deposits</span>
                    </Link>
                    <Link
                      to="/members"
                      className="w-full py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Users className="w-4 h-4" />
                      <span>Members</span>
                    </Link>
                  </div>
                </div>
              ) : activeMess?.status === 'PENDING' ? (
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                  <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2 animate-pulse" />
                  <p className="font-bold text-amber-900 text-sm mb-1">Request Pending Approval</p>
                  <p className="text-xs text-amber-700">
                    Your request to join <strong>{activeMess.messName}</strong> is waiting for the manager.
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    You are not currently enrolled in any mess.
                  </p>
                  <Link
                    to="/onboarding"
                    className="inline-flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create or Join a Mess</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Next: <strong>Phase 4 Daily Meals</strong></span>
              <span>Tenancy: <strong>Enforced</strong></span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">User Account</h3>
                <p className="text-xs text-slate-500">Stored securely with JWT authentication</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-800">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">{user?.phone || 'None'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Active Mess</span>
                <span className="font-semibold text-slate-800">{activeMess?.messName || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 6 Complete
      </footer>
    </div>
  );
};
