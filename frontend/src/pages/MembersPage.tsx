import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ArrowLeft, 
  Copy, 
  Check, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Clock, 
  Mail, 
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messService } from '../services/mess.service';
import type { Member, Mess } from '../types/mess';

export const MembersPage: FC = () => {
  const { user, activeMess } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [messDetails, setMessDetails] = useState<Mess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const messId = activeMess?.messId;
  const isManager = activeMess?.role === 'MANAGER';

  const fetchData = async () => {
    if (!messId) return;
    setIsLoading(true);
    try {
      const [membersData, detailsData] = await Promise.all([
        messService.getMembers(messId),
        messService.getDetails(messId),
      ]);
      setMembers(membersData);
      setMessDetails(detailsData);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to load member directory.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [messId]);

  const handleCopyCode = () => {
    if (!messDetails?.inviteCode) return;
    navigator.clipboard.writeText(messDetails.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStatusUpdate = async (memberId: number, newStatus: 'ACTIVE' | 'REJECTED') => {
    if (!messId) return;
    try {
      await messService.updateMemberStatus(messId, memberId, newStatus);
      setActionMsg({
        type: 'success',
        text: `Member successfully ${newStatus === 'ACTIVE' ? 'approved' : 'rejected'}.`,
      });
      await fetchData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update member status.',
      });
    }
  };

  const pendingMembers = members.filter((m) => m.status === 'PENDING');
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Member Directory</h1>
              <p className="text-xs text-slate-500">{activeMess?.messName}</p>
            </div>
          </div>

          {/* Copy Invite Code Badge */}
          {messDetails && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-semibold text-slate-500">Invite Code:</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
              >
                <span>{messDetails.inviteCode}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Banner Alert */}
        {actionMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm flex items-center justify-between ${
              actionMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <span>{actionMsg.text}</span>
            <button
              onClick={() => setActionMsg(null)}
              className="text-xs font-bold underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pending Requests Section (Manager Only) */}
        {isManager && pendingMembers.length > 0 && (
          <div className="mb-8 bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-base mb-1">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>Pending Join Requests ({pendingMembers.length})</span>
            </div>
            <p className="text-xs text-amber-700 mb-4">
              These users entered your mess invite code. Approve them so they can record meals and view mess expenses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMembers.map((member) => (
                <div
                  key={member.memberId}
                  className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusUpdate(member.memberId, 'ACTIVE')}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      title="Approve Member"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(member.memberId, 'REJECTED')}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-red-200 transition-all cursor-pointer"
                      title="Reject Member"
                    >
                      <UserX className="w-4 h-4" />
                      <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Members Directory */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Active Mess Members ({activeMembers.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All confirmed residents of {activeMess?.messName}
              </p>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Cutoffs: Lunch <strong className="text-slate-700">{messDetails?.lunchCutoffTime.slice(0, 5)}</strong> • Dinner <strong className="text-slate-700">{messDetails?.dinnerCutoffTime.slice(0, 5)}</strong>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading member directory...</div>
          ) : activeMembers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No active members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Member Name</th>
                    <th className="py-3.5 px-6">Contact Info</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeMembers.map((m) => {
                    const isCurrentUser = m.userId === user?.id;
                    return (
                      <tr key={m.memberId} className={`hover:bg-slate-50/80 transition-colors ${isCurrentUser ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          <div>{m.email}</div>
                          {m.phone && <div className="text-slate-400 mt-0.5">{m.phone}</div>}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                              m.role === 'MANAGER'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {m.role === 'MANAGER' && <ShieldAlert className="w-3 h-3" />}
                            {m.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 bg-white text-center text-xs text-slate-500">
        Mess Management System • Phase 3 Tenancy & Directory
      </footer>
    </div>
  );
};
