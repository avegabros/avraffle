'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

type ApiSource = 'production' | 'v2';

export default function AdminArchivePage() {
  const [year, setYear] = useState(2025);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Import state
  const [apiSource, setApiSource] = useState<ApiSource>('production');
  
  // Production API (ABAS v3) states
  const [prodApiUrl, setProdApiUrl] = useState('https://api.avegabros.org/website/id-employees');
  const [prodApiKey, setProdApiKey] = useState('tMxLOAEnad9heg7fpIZWQrm2F');

  // Next Version HRIS V2 states
  const [v2ApiUrl, setV2ApiUrl] = useState('https://api.avegabros.net/v2/hris/employees');
  const [v2Token, setV2Token] = useState('');
  const [v2LoginUrl, setV2LoginUrl] = useState('https://api.avegabros.net/v2/auth/login');
  const [v2Username, setV2Username] = useState('admin');
  const [v2Password, setV2Password] = useState('1234567890');

  const [importLocation, setImportLocation] = useState('ALL');
  const [importYear, setImportYear] = useState(2026);
  const [importMsg, setImportMsg] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive ${year} winners, clear old prizes, and reset the raffle for 2026?`)) {
      return;
    }

    setArchiveLoading(true);
    setArchiveMsg('');
    try {
      const res = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (res.ok) {
        setArchiveMsg(`✅ ${data.message}`);
      } else {
        setArchiveMsg(`❌ ${data.error}`);
      }
    } catch {
      setArchiveMsg('❌ Archive connection failed');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleImportABAS = async () => {
    setImportLoading(true);
    setImportMsg('');

    const payload =
      apiSource === 'production'
        ? {
            source: 'production',
            apiUrl: prodApiUrl,
            apiKey: prodApiKey,
            location: importLocation,
            eventYear: importYear,
          }
        : {
            source: 'v2',
            apiUrl: v2ApiUrl,
            token: v2Token.trim() || undefined,
            loginUrl: v2LoginUrl,
            username: v2Username,
            password: v2Password,
            location: importLocation,
            eventYear: importYear,
          };

    try {
      const res = await fetch('/api/admin/import-abas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(`✅ ${data.message}`);
      } else {
        setImportMsg(`❌ ${data.error}`);
      }
    } catch {
      setImportMsg('❌ Failed to connect to HRIS API');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="Archive & ABAS" />

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Archive & Year Transition</h1>
          <p className="text-slate-400 text-sm mt-1">
            Export historical winners for permanent static archiving, reset the database, and sync employee rosters
          </p>
        </div>

        {/* Section 1: Archive & Clean Slate */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="text-3xl">📦</span>
            <div>
              <h2 className="text-xl font-bold">1. Archive Historical Winners & Clean Slate</h2>
              <p className="text-xs text-slate-400">
                Exports all won records into static JSON (`/public/winners/[year]/data.json`) and resets check-ins for the new year.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Archive Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold w-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={handleArchive}
              disabled={archiveLoading}
              className="mt-5 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold rounded-xl text-sm shadow transition disabled:opacity-50"
            >
              {archiveLoading ? 'Archiving...' : `Archive Year ${year} & Reset for 2026`}
            </button>
          </div>

          {archiveMsg && (
            <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl text-xs font-semibold">
              {archiveMsg}
            </div>
          )}
        </div>

        {/* Section 2: Import from Selected Employee API */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-xl font-bold">2. Import / Sync Employees from Avega HR System</h2>
              <p className="text-xs text-slate-400">
                Select your API source: Current Production ABAS v3 API or Development HRIS v2
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* API Source Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Select API Source & Environment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setApiSource('production')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                    apiSource === 'production'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Production API (ABAS v3)
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    api.avegabros.org — Main corporate employee directory (900+ verified active records).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setApiSource('v2')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                    apiSource === 'v2'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      HRIS v2 (Next Version)
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Development
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    api.avegabros.net — Next generation HRIS microservice with JWT token authentication.
                  </p>
                </button>
              </div>
            </div>

            {/* Mode A: Production Inputs */}
            {apiSource === 'production' && (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                    <span>⚡</span> Production ABAS v3 Configuration
                  </span>
                  <a
                    href="https://api.avegabros.org/documentation/hr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    View API Docs ↗
                  </a>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={prodApiUrl}
                    onChange={(e) => setProdApiUrl(e.target.value)}
                    placeholder="https://api.avegabros.org/website/id-employees"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={prodApiKey}
                    onChange={(e) => setProdApiKey(e.target.value)}
                    placeholder="tMxLOAEnad9heg7fpIZWQrm2F"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Mode B: HRIS v2 Inputs */}
            {apiSource === 'v2' && (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                    <span>⚡</span> HRIS v2 Microservice Configuration
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    HRIS Employees Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={v2ApiUrl}
                    onChange={(e) => setV2ApiUrl(e.target.value)}
                    placeholder="https://api.avegabros.net/v2/hris/employees"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-400">
                      Bearer Token (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {v2Token ? 'Using direct Bearer token' : 'If empty, will automatically login to API below'}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={v2Token}
                    onChange={(e) => setV2Token(e.target.value)}
                    placeholder="Paste Bearer token here (e.g. eyJhbGciOi...)"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    v2Token ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-800/40 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <span>🔐</span> Automatic Login Authentication
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Used if no bearer token is supplied
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Login Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={v2LoginUrl}
                        onChange={(e) => setV2LoginUrl(e.target.value)}
                        placeholder="https://api.avegabros.net/v2/auth/login"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                          API Username
                        </label>
                        <input
                          type="text"
                          value={v2Username}
                          onChange={(e) => setV2Username(e.target.value)}
                          placeholder="admin"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                          API Password
                        </label>
                        <input
                          type="password"
                          value={v2Password}
                          onChange={(e) => setV2Password(e.target.value)}
                          placeholder="Password"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Common Location and Event Year Settings */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Default Target Location
                </label>
                <select
                  value={importLocation}
                  onChange={(e) => setImportLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Locations (Unified)</option>
                  <option value="TAYUD">Tayud Land-Based</option>
                  <option value="MAKATI">Makati Land-Based</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Import Target Year
                </label>
                <input
                  type="number"
                  value={importYear}
                  onChange={(e) => setImportYear(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleImportABAS}
              disabled={importLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold rounded-xl text-sm shadow transition disabled:opacity-50 text-white flex items-center gap-2"
            >
              <span>{importLoading ? '⏳' : '⚡'}</span>
              <span>
                {importLoading
                  ? 'Syncing Employees...'
                  : apiSource === 'production'
                  ? 'Sync Employees from Production API (ABAS v3)'
                  : 'Sync Employees from HRIS v2'}
              </span>
            </button>
          </div>

          {importMsg && (
            <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl text-xs font-semibold">
              {importMsg}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
