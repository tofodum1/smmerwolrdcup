import { useState, useEffect, useCallback } from 'react';
import { Lock, RefreshCw, Trash2, AlertCircle, Trophy, ShieldCheck, CheckCircle2, Mail, Undo2 } from 'lucide-react';

const DISPLAY = { fontFamily: "'Cinzel', serif", letterSpacing: '0.04em' };
const BODY_FONT = { fontFamily: "'Jost', sans-serif" };
const TOKEN_KEY = 'swc-admin-token';

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadRegistrations = useCallback(async (tok) => {
    setLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/admin-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken('');
        }
        throw new Error(data.error || 'Failed to load registrations');
      }
      setRegistrations(data.registrations || []);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadRegistrations(token);
  }, [token, loadRegistrations]);

  const handleLogin = async () => {
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect password');
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword('');
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setRegistrations([]);
  };

  const handleDeleteOne = async (id) => {
    setActionError('');
    setActionNote('');
    try {
      const res = await fetch('/api/admin-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete registration');
      setRegistrations((regs) => regs.filter((r) => r.id !== id));
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleDeleteAll = async () => {
    setActionError('');
    setActionNote('');
    try {
      const res = await fetch('/api/admin-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear registrations');
      setRegistrations([]);
      setConfirmAll(false);
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleTogglePaid = async (reg) => {
    setActionError('');
    setActionNote('');
    setBusyId(reg.id);
    try {
      const goingToPaid = reg.status !== 'paid';
      const res = await fetch('/api/admin-mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id: reg.id, paid: goingToPaid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update registration');
      setRegistrations((regs) => regs.map((r) => (r.id === reg.id ? data.registration : r)));
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSendEmail = async (reg) => {
    setActionError('');
    setActionNote('');
    setBusyId(reg.id);
    try {
      const res = await fetch('/api/admin-send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id: reg.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      setActionNote(`Email sent to ${reg.email}`);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] flex items-center justify-center px-4" style={BODY_FONT}>
        <div className="w-full max-w-sm bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-6 sm:p-8 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <Lock size={22} />
            </div>
          </div>
          <h2 className="text-lg font-bold text-[#F2D879]" style={DISPLAY}>Admin Access</h2>
          <p className="text-sm text-[#F6F1E4]/60">
            Enter the admin password to manage registrations.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            className="w-full bg-[#0C0C0E] border border-[#D4AF37]/30 text-[#F6F1E4] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            placeholder="Password"
          />
          {loginError && <p className="text-sm text-[#F2D879]">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loggingIn || !password}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879] transition disabled:opacity-50"
          >
            {loggingIn ? 'Checking…' : 'Unlock'}
          </button>
          <p className="text-xs text-[#F6F1E4]/30">
            This page is not linked from the registration site. Keep this URL private.
          </p>
        </div>
      </div>
    );
  }

  const squadCount = registrations.filter((r) => r.type === 'squad').length;
  const soloCount = registrations.filter((r) => r.type === 'solo').length;
  const paidCount = registrations.filter((r) => r.status === 'paid').length;
  const totalCollected = registrations
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + (r.amount_paid || 0), 0);

  return (
    <div className="min-h-screen bg-[#0C0C0E]" style={BODY_FONT}>
      <header className="bg-gradient-to-b from-[#17171B] to-[#0C0C0E] text-[#F6F1E4] px-4 py-6 sm:px-8 border-b border-[#D4AF37]/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#F2D879] text-xs font-semibold uppercase tracking-widest mb-2">
              <Trophy size={14} /> Summer World Cup
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F2D879]" style={DISPLAY}>Admin Dashboard</h1>
            <p className="text-[#F6F1E4]/60 text-sm mt-1 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Private — not linked from the public site.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => loadRegistrations(token)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879] transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-[#D4AF37]/40 text-[#F6F1E4] hover:border-[#D4AF37] transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {actionError && (
          <div className="flex items-start gap-2 bg-[#5C1A1A]/30 border border-[#5C1A1A] text-[#F2D879] text-sm rounded-lg p-3">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}
        {actionNote && (
          <div className="flex items-start gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F6F1E4]/80 text-sm rounded-lg p-3">
            <CheckCircle2 size={16} className="mt-0.5" />
            <span>{actionNote}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Squads" value={squadCount} />
          <StatCard label="Solo Players" value={soloCount} />
          <StatCard label="Paid" value={paidCount} />
          <StatCard label="Fees Collected" value={`$${totalCollected}`} />
        </div>

        <div className="bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#F2D879]" style={DISPLAY}>All Registrations</h2>
            {!confirmAll ? (
              <button
                onClick={() => setConfirmAll(true)}
                className="text-xs text-[#F6F1E4]/40 hover:text-[#F2D879] underline"
              >
                Clear all registrations
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#F2D879]">Delete everything?</span>
                <button onClick={handleDeleteAll} className="px-2 py-1 rounded bg-[#5C1A1A] text-[#F6F1E4] font-semibold">
                  Yes, delete all
                </button>
                <button onClick={() => setConfirmAll(false)} className="px-2 py-1 rounded border border-[#D4AF37]/30 text-[#F6F1E4]/70">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-[#F6F1E4]/40">Loading…</p>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-[#F6F1E4]/40">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#F6F1E4]/40 text-xs uppercase border-b border-[#D4AF37]/20">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Country</th>
                    <th className="py-2 pr-3">Group</th>
                    <th className="py-2 pr-3">Fee</th>
                    <th className="py-2 pr-3">Registered</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-b border-[#D4AF37]/10">
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'squad' ? 'bg-[#D4AF37]/20 text-[#F2D879]' : 'bg-[#5C1A1A]/40 text-[#F2D879]'}`}>
                          {r.type === 'squad' ? 'Squad' : 'Solo'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-medium text-[#F6F1E4]">{r.type === 'squad' ? r.squad_name : r.player_name}</td>
                      <td className="py-2 pr-3 text-[#F6F1E4]/50">{r.email}</td>
                      <td className="py-2 pr-3 text-[#F6F1E4]/50">{r.contact}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2 pr-3 text-[#F6F1E4]/50">{r.country || '—'}</td>
                      <td className="py-2 pr-3 text-[#F6F1E4]/50">{r.group_key || '—'}</td>
                      <td className="py-2 pr-3 text-[#F2D879] font-medium">${r.amount_paid}</td>
                      <td className="py-2 pr-3 text-[#F6F1E4]/30">{new Date(r.registered_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePaid(r)}
                            disabled={busyId === r.id}
                            title={r.status === 'paid' ? 'Move back to awaiting payment' : 'Mark as paid'}
                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                              r.status === 'paid'
                                ? 'border border-[#D4AF37]/30 text-[#F6F1E4]/70 hover:border-[#D4AF37]'
                                : 'bg-[#D4AF37] text-[#0C0C0E] hover:bg-[#F2D879]'
                            } disabled:opacity-50`}
                          >
                            {r.status === 'paid' ? <Undo2 size={12} /> : <CheckCircle2 size={12} />}
                            {r.status === 'paid' ? 'Unpaid' : 'Mark Paid'}
                          </button>
                          <button
                            onClick={() => handleSendEmail(r)}
                            disabled={busyId === r.id}
                            title="Send confirmation email"
                            className="text-[#F6F1E4]/40 hover:text-[#F2D879] disabled:opacity-50"
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteOne(r.id)}
                            disabled={busyId === r.id}
                            title="Delete this registration"
                            className="text-[#F6F1E4]/30 hover:text-[#F2D879] disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    awaiting_payment: { label: 'Awaiting Payment', cls: 'bg-[#F6F1E4]/10 text-[#F6F1E4]/60' },
    paid: { label: 'Paid', cls: 'bg-[#D4AF37]/25 text-[#F2D879]' },
  };
  const m = map[status] || { label: status, cls: 'bg-[#F6F1E4]/10 text-[#F6F1E4]/60' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#17171B] rounded-2xl shadow-sm border border-[#D4AF37]/30 p-4 text-center">
      <div className="text-2xl font-bold text-[#F2D879]" style={DISPLAY}>{value}</div>
      <div className="text-xs text-[#F6F1E4]/40 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
