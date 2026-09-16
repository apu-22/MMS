import type { FC } from 'react';
import { Utensils, LogOut, User as UserIcon, Shield, Sparkles, Building2, CheckCircle } from 'lucide-react';
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
              Auth Verified
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 font-medium">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
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
              <span>Phase 2: Authentication Engine Active</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Your JWT session is active and verified by the backend. You can safely explore user profiles and prepare for mess onboarding.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs flex flex-col gap-1.5 shrink-0">
            <span className="text-emerald-200 font-semibold uppercase tracking-wider">Session Info</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span className="font-mono">{user?.email}</span>
            </div>
            <div className="text-emerald-200">
              Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
            </div>
          </div>
        </div>

        {/* Phase 2 Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* User Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">User Profile Details</h3>
                <p className="text-xs text-slate-500">Stored securely in MySQL with bcrypt hash</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">User ID</span>
                <span className="font-semibold text-slate-800">#{user?.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-800">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">{user?.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Mess Membership Status Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mess Membership</h3>
                  <p className="text-xs text-slate-500">Next step in Phase 3</p>
                </div>
              </div>

              {activeMess ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-sm">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{activeMess.messName}</span>
                  </div>
                  <p className="text-emerald-700 text-xs">
                    Role: {activeMess.role} • Status: {activeMess.status}
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-center">
                  <p className="font-semibold text-slate-700 mb-1">No Active Mess</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    You have not joined or created a mess yet. In <strong>Phase 3</strong>, you will be able to create a new mess or join with a 6-digit code.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Token Status: <strong>Valid</strong></span>
              <span>Expires in: <strong>7 Days</strong></span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 2 Auth Completed
      </footer>
    </div>
  );
};
