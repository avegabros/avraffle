'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import { EventFeedbackCard } from '@/components/feedback/EventFeedbackCard';

interface GuestStatus {
  id?: number;
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

interface MatchCandidate {
  id: number;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  department?: string | null;
  position?: string | null;
  location: string;
  eventYear: number;
  avatar?: string | null;
}

export default function CheckRegistrationPage() {
  const [searchMode, setSearchMode] = useState<'employee' | 'name'>('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameOrTag, setNameOrTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<MatchCandidate[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  const executeCheck = async (payload: { employeeId?: string; lastName?: string; fullName?: string; guestId?: number }) => {
    setErrorMessage('');
    setMultipleMatches([]);
    setLoading(true);

    try {
      const res = await fetch('/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || data.error || 'Attendee or guest not found.');
      } else if (data.multiple && Array.isArray(data.matches)) {
        setMultipleMatches(data.matches);
        setStatus(null);
      } else if (data.guest) {
        setStatus(data.guest);
        setMultipleMatches([]);
        setIsFormCollapsed(true);
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setMultipleMatches([]);

    if (searchMode === 'employee') {
      await executeCheck({ employeeId, lastName });
    } else {
      await executeCheck({ employeeId: nameOrTag, fullName: nameOrTag });
    }
  };

  const handleSelectCandidate = async (candidate: MatchCandidate) => {
    await executeCheck({ guestId: candidate.id });
  };

  const resetSearch = () => {
    setIsFormCollapsed(false);
    setStatus(null);
    setMultipleMatches([]);
    setErrorMessage('');
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

        {/* Collapsible Search Form Banner */}
        {isFormCollapsed && status ? (
          <div className="mb-4 p-3 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-amber-400 font-mono font-bold">
                {status.employeeId}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-white font-semibold">
                {status.fullName}
              </span>
            </div>
            <button
              type="button"
              onClick={resetSearch}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition cursor-pointer"
            >
              Check Another ID ↻
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Search Type Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-800/90 border border-white/10 rounded-2xl mb-2">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('employee');
                  setMultipleMatches([]);
                  setErrorMessage('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  searchMode === 'employee'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏢 By Employee ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('name');
                  setMultipleMatches([]);
                  setErrorMessage('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  searchMode === 'name'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔍 By Name / Guest Tag
              </button>
            </div>

            {searchMode === 'employee' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-001 or ABMCI-251102"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name, Surname, or Guest Tag
                </label>
                <input
                  type="text"
                  required
                  value={nameOrTag}
                  onChange={(e) => setNameOrTag(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz, GUEST-001, etc."
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Both employees and guests can search by full name or guest badge tag.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Check My Status'}
            </button>
          </form>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* Disambiguation: Multiple Matches Picker */}
        {multipleMatches.length > 0 && !status && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-800/90 border border-amber-500/30 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <div>
                <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Multiple Attendees Found ({multipleMatches.length})
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Select your profile from the list below:
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {multipleMatches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectCandidate(m)}
                  className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-700/80 border border-white/5 hover:border-amber-500/40 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs flex-shrink-0">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt={m.fullName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        m.firstName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                        {m.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-300 font-semibold">{m.employeeId}</span>
                        <span>•</span>
                        <span>{m.department || 'General'}</span>
                        <span>•</span>
                        <span className="uppercase text-amber-400/80">{m.location}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Single Profile Status Display */}
        {status && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-800/90 border border-white/10 space-y-3 animate-in fade-in duration-300">
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

            {/* Embedded Non-Intrusive Feedback Card */}
            <EventFeedbackCard
              employeeId={status.employeeId}
              name={status.fullName}
              location={status.location || 'ALL'}
            />
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-3">
          <Link href="/" className="hover:text-amber-400 transition">← Home</Link>
          <span>•</span>
          <Link href="/stage" className="hover:text-amber-400 transition">Live Wheel</Link>
          <span>•</span>
          <span className="font-mono text-slate-600">{APP_VERSION.tag}</span>
        </div>
      </div>
    </div>
  );
}
