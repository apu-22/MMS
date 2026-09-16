import { useState, useEffect } from 'react';
import { Utensils, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import axios from 'axios';

export default function App() {
  const [healthStatus, setHealthStatus] = useState<string>('Checking backend...');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/health')
      .then((res) => {
        if (res.data?.data?.status === 'ok') {
          setHealthStatus('Backend Online (Port 5000)');
          setIsBackendOnline(true);
        }
      })
      .catch(() => {
        setHealthStatus('Backend Offline (Start server to connect)');
        setIsBackendOnline(false);
      });
  }, []);

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
              MVP Phase 0
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isBackendOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {healthStatus}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Bachelor & Student Mess Management System
          </h1>
          <p className="text-base text-slate-600">
            A real-world full-stack portfolio application for automated meal tracking, daily grocery ledger, shared overhead expenses, and zero-error month-end settlements.
          </p>
        </div>

        {/* Status Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Architecture Ready</h3>
            <p className="text-sm text-slate-500">
              Express + TypeScript backend structure configured with error handling and health checks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Tailwind CSS Verified</h3>
            <p className="text-sm text-slate-500">
              Utility classes, typography, and responsive grid layout compiling with zero warnings.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Upcoming: Phase 1</h3>
            <p className="text-sm text-slate-500">
              MySQL schema initialization, connection pool, and atomic transaction helper.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 0 Scaffolding Complete
      </footer>
    </div>
  );
}
