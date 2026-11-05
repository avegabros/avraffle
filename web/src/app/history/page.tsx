'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface WinnerRecord {
  id: number;
  employeeId: string;
  fullName: string;
  department?: string | null;
  position?: string | null;
  location?: string | null;
  prize: string;
  winOn: string;
  avatar?: string | null;
}

export default function HistoryPage() {
  const [availableYears, setAvailableYears] = useState<string[]>(['2026', '2025']);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = (yr = selectedYear, loc = selectedLocation) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('year', yr);
    if (loc && loc !== 'ALL') params.set('location', loc);

    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.availableYears) setAvailableYears(data.availableYears);
        if (data.winners) setWinners(data.winners);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Check system setting for active location
    fetch('/api/settings')
      .then((res) => res.json())
      .then((s) => {
        if (s.activeLocation) setSelectedLocation(s.activeLocation);
        fetchHistory(selectedYear, s.activeLocation || 'ALL');
      })
      .catch(() => fetchHistory(selectedYear, 'ALL'));
  }, [selectedYear, selectedLocation]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-black text-white flex flex-col">
      <AdminNav badgeTitle="Winners Archive" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">🏆 Winners Hall of Fame</h1>
            <p className="text-slate-400 text-sm mt-1">
              Browse previous raffle champions across event years
            </p>
          </div>

          {/* Location & Year Switcher Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Location Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              {['ALL', 'TAYUD', 'MAKATI'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedLocation === loc
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {loc === 'ALL' ? 'All Locations' : loc}
                </button>
              ))}
            </div>

            {/* Year Switcher Pills */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-5 py-2 rounded-xl text-sm font-black transition ${
                    selectedYear === yr
                      ? 'bg-amber-500 text-slate-950 shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {yr === '2026' ? '🔴 Live 2026 Winners' : `${yr} Archive`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Winners Gallery Cards */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 animate-pulse font-semibold">
            Loading {selectedYear} Winners Archive...
          </div>
        ) : winners.length === 0 ? (
          <div className="py-24 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-white/5">
            <span className="text-4xl mb-2 block">📜</span>
            No archived winners found for {selectedYear}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {winners.map((w, idx) => (
              <div
                key={w.id || idx}
                className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden group hover:border-amber-500/50 transition duration-300"
              >
                <div className="absolute top-3 left-4 text-xs font-black text-slate-600 group-hover:text-amber-500 transition">
                  #{idx + 1}
                </div>

                <div className="w-24 h-24 rounded-full border-2 border-amber-400/50 overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-amber-400 text-2xl mb-4 shadow-lg">
                  {w.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.avatar} alt={w.fullName} className="w-full h-full object-cover" />
                  ) : (
                    w.fullName.charAt(0)
                  )}
                </div>

                <h3 className="font-extrabold text-lg text-white leading-snug">{w.fullName}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {w.employeeId} {w.department ? `• ${w.department}` : ''}
                </p>
                {w.location && (
                  <span className="mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-blue-300 border border-slate-700">
                    📍 {w.location}
                  </span>
                )}

                <div className="mt-4 pt-4 border-t border-slate-800/80 w-full">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    🎁 {w.prize}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    Won: {new Date(w.winOn).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
