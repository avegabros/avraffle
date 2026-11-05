'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface AdminStats {
  totalGuests: number;
  checkedInGuests: number;
  activeWheelCount: number;
  totalPrizes: number;
  grandPrizes: number;
  wonPrizes: number;
  adminCount: number;
}

interface WheelSettings {
  duration: number;
  power: 'low' | 'medium' | 'high';
  fontSize: number;
  wheelSize: number;
  activeLocation: 'TAYUD' | 'MAKATI';
  activeYear: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Wheel Controls on Admin
  const [settings, setSettings] = useState<WheelSettings>({
    duration: 8,
    power: 'high',
    fontSize: 13,
    wheelSize: 900,
    activeLocation: 'TAYUD',
    activeYear: 2026,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchStats = (loc = settings.activeLocation, yr = settings.activeYear) => {
    setLoading(true);
    fetch(`/api/admin/stats?location=${loc}&year=${yr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Fetch wheel settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const loc = data.activeLocation ?? 'TAYUD';
          const yr = data.activeYear ?? 2026;
          setSettings({
            duration: data.duration ?? 8,
            power: data.power ?? 'high',
            fontSize: data.fontSize ?? 13,
            wheelSize: data.wheelSize ?? 900,
            activeLocation: loc,
            activeYear: yr,
          });
          fetchStats(loc, yr);
        }
      })
      .catch(() => {
        fetchStats();
      });
  }, []);

  // Automatically send real-time updates as user drags or taps settings
  const updateSettingRealtime = async (newSettings: WheelSettings) => {
    setSettings(newSettings);
    setSavedSuccess(true);
    if (newSettings.activeLocation !== settings.activeLocation || newSettings.activeYear !== settings.activeYear) {
      fetchStats(newSettings.activeLocation, newSettings.activeYear);
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      setTimeout(() => setSavedSuccess(false), 1200);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="Admin Console" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Live metrics across attendees, prizes, and raffle wheel</p>
        </div>

        {/* Location & Year Active Scope Bar */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                Active Raffle Scope
              </div>
              <div className="text-xs text-slate-400">
                Controls which location & year the wheel stage and apps actively spin for
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
              {(['TAYUD', 'MAKATI'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => updateSettingRealtime({ ...settings, activeLocation: loc })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-wider transition ${
                    settings.activeLocation === loc
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {loc === 'TAYUD' ? 'Tayud (Cebu)' : 'Makati (HQ)'}
                </button>
              ))}
            </div>

            <select
              value={settings.activeYear}
              onChange={(e) => updateSettingRealtime({ ...settings, activeYear: parseInt(e.target.value, 10) })}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none"
            >
              <option value={2026}>2026 Raffle</option>
              <option value={2025}>2025 Raffle</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Employees</div>
            <div className="text-4xl font-black text-white mt-2">
              {loading ? '...' : stats?.totalGuests}
            </div>
            <div className="text-xs text-emerald-400 mt-2 font-medium">178 imported from master list</div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Checked In (Registered)</div>
            <div className="text-4xl font-black text-emerald-400 mt-2">
              {loading ? '...' : stats?.checkedInGuests}
            </div>
            <div className="text-xs text-slate-400 mt-2">Active attendance count</div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active in Wheel</div>
            <div className="text-4xl font-black text-amber-400 mt-2">
              {loading ? '...' : stats?.activeWheelCount}
            </div>
            <div className="text-xs text-slate-400 mt-2">Eligible participants ready to spin</div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Prizes Catalog</div>
            <div className="text-4xl font-black text-purple-400 mt-2">
              {loading ? '...' : stats?.totalPrizes}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {stats?.grandPrizes ?? 0} Grand • {stats?.wonPrizes ?? 0} Claimed
            </div>
          </div>
        </div>

        {/* Wheel Physics & Stage Display Configuration Panel */}
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                ⚙️ Wheel Physics & Stage Settings
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Configure spin duration, revolutions power, typography, and canvas size for the projector screen
              </p>
            </div>
            {savedSuccess && (
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold animate-pulse">
                ✓ Saved to Stage
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Duration */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div className="flex justify-between text-xs font-bold mb-2 text-slate-300">
                <span>Duration</span>
                <span className="text-amber-400 font-black">{settings.duration}s</span>
              </div>
              <input
                type="range"
                min={3}
                max={25}
                value={settings.duration}
                onChange={(e) => updateSettingRealtime({ ...settings, duration: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-2">Spin deceleration time</p>
            </div>

            {/* Power */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div className="text-xs font-bold mb-2 text-slate-300">Power / Speed</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'medium', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => updateSettingRealtime({ ...settings, power: lvl })}
                    className={`py-1.5 text-xs font-bold uppercase rounded-lg border transition ${
                      settings.power === lvl
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Revolutions count</p>
            </div>

            {/* Name Font Size */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div className="flex justify-between text-xs font-bold mb-2 text-slate-300">
                <span>Font Size</span>
                <span className="text-amber-400 font-black">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min={9}
                max={24}
                value={settings.fontSize}
                onChange={(e) => updateSettingRealtime({ ...settings, fontSize: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-2">Slice text size</p>
            </div>

            {/* Wheel Diameter */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <div className="flex justify-between text-xs font-bold mb-2 text-slate-300">
                <span>Wheel Diameter</span>
                <span className="text-amber-400 font-black">{settings.wheelSize}px</span>
              </div>
              <input
                type="range"
                min={700}
                max={1300}
                step={50}
                value={settings.wheelSize}
                onChange={(e) => updateSettingRealtime({ ...settings, wheelSize: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-2">Stage projector size</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">⚡ Changes sync live to /stage in real-time.</span>
          </div>
        </div>

        {/* Quick Action Navigation Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/guests"
            className="bg-slate-900 hover:bg-slate-800/80 transition border border-white/10 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col justify-between group shadow-xl"
          >
            <div>
              <div className="text-amber-400 text-3xl mb-2">👥</div>
              <h3 className="text-xl font-bold mb-1 text-white group-hover:text-amber-400 transition">
                Attendee Management →
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Search guests, verify check-ins, view portrait photos, and toggle wheel eligibility.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-amber-400 font-bold">
              <span>Open Guest Manager</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/admin/prizes"
            className="bg-slate-900 hover:bg-slate-800/80 transition border border-white/10 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between group shadow-xl"
          >
            <div>
              <div className="text-emerald-400 text-3xl mb-2">🎁</div>
              <h3 className="text-xl font-bold mb-1 text-white group-hover:text-emerald-400 transition">
                Prizes Inventory →
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Add grand prizes, upload photos via mobile or web, and monitor won items.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span>Open Prize Inventory</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-slate-900 hover:bg-slate-800/80 transition border border-white/10 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col justify-between group shadow-xl"
          >
            <div>
              <div className="text-blue-400 text-3xl mb-2">🔐</div>
              <h3 className="text-xl font-bold mb-1 text-white group-hover:text-blue-400 transition">
                Users & Admins →
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Create staff accounts, grant access to registration desks, and reset passwords.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-blue-400 font-bold">
              <span>Manage Accounts ({stats?.adminCount ?? 1})</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
