'use client';

import React, { useState } from 'react';

interface GuestStatus {
  employeeId: string;
  fullName: string;
  department: string | null;
  position: string | null;
  location?: string | null;
  eventYear?: number | null;
  isRegistered: boolean;
  inWheel: boolean;
  isWinner: boolean;
  prizeWon: string | null;
  avatar: string | null;
}

export default function CheckRegistrationPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch('/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, lastName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Attendee not found.');
      } else {
        setStatus(data.guest);
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-3xl mb-2">
            🎟️
          </div>
          <h1 className="text-2xl font-black tracking-tight">Raffle Status Check</h1>
          <p className="text-xs text-slate-400 mt-1">
            Check your registration and active raffle entry
          </p>
        </div>

        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Employee ID
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-001"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Last Name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Dela Cruz"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Check My Status'}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {status && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-800/90 border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-amber-400 border border-amber-400/30">
                {status.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={status.avatar} alt={status.fullName} className="w-full h-full object-cover" />
                ) : (
                  status.fullName.charAt(0)
                )}
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">{status.fullName}</h3>
                <p className="text-xs text-slate-400">
                  {status.employeeId} {status.department ? `• ${status.department}` : ''}
                </p>
                <div className="mt-1">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 border border-slate-700">
                    {status.department || 'Avega Group'} · {status.eventYear || 2026}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
              {status.isWinner ? (
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs text-center font-semibold">
                  🏆 Winner: {status.prizeWon || 'Prize'}
                </div>
              ) : status.inWheel ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-semibold">
                  🟢 All Set! You are in the active raffle wheel.
                </div>
              ) : status.isRegistered ? (
                <div className="p-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs text-center font-semibold">
                  🟡 Registered (Not in active wheel draw)
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center font-semibold">
                  🔴 Please proceed to the registration desk to complete check-in.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
