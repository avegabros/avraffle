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

interface EventOption {
  code: string;
  label: string;
  year: number;
  isActive: boolean;
}

export default function HistoryPage() {
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('XMAS-2026');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchHistory = (ev = selectedEvent, loc = selectedLocation) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ev) params.set('event', ev);
    if (loc && loc !== 'ALL') params.set('location', loc);

    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.eventOptions) setEventOptions(data.eventOptions);
        if (data.selectedEvent && !selectedEvent) setSelectedEvent(data.selectedEvent);
        if (data.winners) setWinners(data.winners);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleResetHistory = async () => {
    const currentOpt = eventOptions.find((e) => e.code === selectedEvent);
    const eventName = currentOpt ? currentOpt.label : selectedEvent;

    const confirmPrompt = prompt(
      `⚠️ RESET RAFFLE TEST DRAW?\n\nThis will reset ALL winners for "${eventName}" (${selectedLocation}), returning winners back to the wheel and making prizes available again.\n\nType "RESET" to confirm:`
    );

    if (confirmPrompt !== 'RESET') {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: selectedEvent,
          location: selectedLocation,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Raffle winners successfully reset!');
        fetchHistory(selectedEvent, selectedLocation);
      } else {
        alert(data.error || 'Failed to reset history');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while resetting history');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((s) => {
        if (s.activeLocation) setSelectedLocation(s.activeLocation);
        if (s.activeEventCode) setSelectedEvent(s.activeEventCode);
        fetchHistory(s.activeEventCode || selectedEvent, s.activeLocation || 'ALL');
      })
      .catch(() => fetchHistory(selectedEvent, 'ALL'));
  }, []);

  const currentEvent = eventOptions.find((e) => e.code === selectedEvent);
  const isLive = currentEvent?.isActive || selectedEvent === '2026' || selectedEvent === 'XMAS-2026';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="Winners Archive" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🏆</span> Winners Hall of Fame
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Browse previous raffle champions across named events and annual archives
            </p>
          </div>

          {/* Event & Location Switcher Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Location Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              {['ALL', 'TAYUD', 'MAKATI'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setSelectedLocation(loc);
                    fetchHistory(selectedEvent, loc);
                  }}
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

            {/* Event Dropdown / Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              <select
                value={selectedEvent}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  fetchHistory(e.target.value, selectedLocation);
                }}
                className="bg-slate-800 text-white font-black text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500"
              >
                {eventOptions.map((ev) => (
                  <option key={ev.code} value={ev.code}>
                    {ev.isActive ? '🔴 ' : '📦 '} {ev.label}
                  </option>
                ))}
              </select>

              {/* Reset History Test Button (Visible for Live / Active Event) */}
              {isLive && (
                <button
                  onClick={handleResetHistory}
                  disabled={isResetting || winners.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black transition border bg-red-950/60 hover:bg-red-900 border-red-500/40 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow"
                  title="Reset all winners and return them to the wheel"
                >
                  <span>🔄</span>
                  <span>{isResetting ? 'Resetting...' : 'Reset Draw (Test)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Winners Gallery Cards */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 animate-pulse font-semibold">
            Loading {currentEvent?.label || selectedEvent} Winners...
          </div>
        ) : winners.length === 0 ? (
          <div className="py-24 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-white/5">
            <span className="text-4xl mb-2 block">📜</span>
            <p className="font-semibold text-lg text-slate-400">
              No raffle winners recorded yet for {currentEvent?.label || selectedEvent}
            </p>
            <p className="text-sm mt-1">Spin the wheel on the Live Stage to begin filling the Hall of Fame!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {winners.map((winner, idx) => (
              <div
                key={winner.id || idx}
                className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-amber-500/50 rounded-3xl p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 overflow-hidden"
              >
                {/* Background Glow Badge */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all"></div>

                {/* Avatar with Ring */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500/40 p-1 group-hover:border-amber-400 transition-colors">
                    {winner.avatar ? (
                      <img
                        src={winner.avatar}
                        alt={winner.fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center font-black text-amber-400 text-xl">
                        {winner.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-1 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                    #{idx + 1}
                  </span>
                </div>

                {/* Info */}
                <h3 className="font-black text-lg text-white group-hover:text-amber-400 transition">
                  {winner.fullName}
                </h3>
                <span className="text-xs font-mono font-bold text-amber-500/80 mb-2">
                  {winner.employeeId}
                </span>

                <div className="text-xs text-slate-400 flex flex-col gap-0.5 mb-4">
                  {winner.position && <span className="font-medium text-slate-300">{winner.position}</span>}
                  {winner.department && <span>{winner.department}</span>}
                  {winner.location && (
                    <span className="text-[11px] text-slate-500 font-semibold">{winner.location}</span>
                  )}
                </div>

                {/* Prize Banner */}
                <div className="mt-auto w-full bg-slate-950/80 border border-white/10 py-2.5 px-3 rounded-2xl flex flex-col items-center gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400/80">
                    Prize Won
                  </span>
                  <span className="text-sm font-black text-amber-300 truncate max-w-full">
                    🎁 {winner.prize}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(winner.winOn).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
