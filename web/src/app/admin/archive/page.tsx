'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

type ApiSource = 'production-live' | 'production-id' | 'v2';

export default function AdminArchivePage() {
  const [year, setYear] = useState(2025);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Import state
  const [apiSource, setApiSource] = useState<ApiSource>('production-live');
  
  // 1. Live Production HR Master API (api.avegabros.org/api/hr-employees)
  const [liveApiUrl, setLiveApiUrl] = useState('https://api.avegabros.org/api/hr-employees');
  const [liveToken, setLiveToken] = useState('');
  const [liveLoginUrl, setLiveLoginUrl] = useState('https://api.avegabros.org/api/auth-login');
  const [liveUsername, setLiveUsername] = useState('');
  const [livePassword, setLivePassword] = useState('');

  // 2. Legacy Production ID Badges API (api.avegabros.org/website/id-employees)
  const [prodApiUrl, setProdApiUrl] = useState('https://api.avegabros.org/website/id-employees');
  const [prodApiKey, setProdApiKey] = useState('tMxLOAEnad9heg7fpIZWQrm2F');

  // 3. Next Version HRIS V2 states (api.avegabros.net)
  const [v2ApiUrl, setV2ApiUrl] = useState('https://api.avegabros.net/v2/hris/employees');
  const [v2Token, setV2Token] = useState('');
  const [v2LoginUrl, setV2LoginUrl] = useState('https://api.avegabros.net/v2/auth/login');
  const [v2Username, setV2Username] = useState('admin');
  const [v2Password, setV2Password] = useState('1234567890');

  const [importYear, setImportYear] = useState(2026);
  const [wipeBeforeSync, setWipeBeforeSync] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Attendee count & Clear Attendees state
  const [currentAttendeeCount, setCurrentAttendeeCount] = useState<number | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMsg, setClearMsg] = useState('');

  // Fetch current attendee count for selected importYear
  const fetchAttendeeCount = async (targetYear: number) => {
    try {
      const res = await fetch(`/api/admin/clear-attendees?year=${targetYear}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentAttendeeCount(data.count ?? 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAttendeeCount(importYear);
  }, [importYear]);

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
        fetchAttendeeCount(importYear);
      } else {
        setArchiveMsg(`❌ ${data.error}`);
      }
    } catch {
      setArchiveMsg('❌ Archive connection failed');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleClearAttendees = async () => {
    const countText = currentAttendeeCount !== null ? `(${currentAttendeeCount} records)` : '';
    if (
      !confirm(
        `⚠️ DANGER: Are you sure you want to completely empty/delete ALL attendees ${countText} for year ${importYear}?\n\nThis will allow a completely clean slate before importing from another API source.`
      )
    ) {
      return;
    }

    setClearLoading(true);
    setClearMsg('');
    try {
      const res = await fetch('/api/admin/clear-attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: importYear }),
      });
      const data = await res.json();
      if (res.ok) {
        setClearMsg(`✅ ${data.message}`);
        fetchAttendeeCount(importYear);
      } else {
        setClearMsg(`❌ ${data.error}`);
      }
    } catch {
      setClearMsg('❌ Failed to connect to clear attendees endpoint');
    } finally {
      setClearLoading(false);
    }
  };

  const handleImportABAS = async () => {
    if (
      wipeBeforeSync &&
      !confirm(
        `⚠️ Notice: "Replace all attendees" is checked. This will DELETE all existing attendees for Year ${importYear} before syncing from the new API source.\n\nProceed?`
      )
    ) {
      return;
    }

    setImportLoading(true);
    setImportMsg('');

    let payload: Record<string, unknown> = {
      source: apiSource,
      eventYear: importYear,
      wipeExisting: wipeBeforeSync,
    };

    if (apiSource === 'production-live') {
      payload = {
        ...payload,
        apiUrl: liveApiUrl,
        token: liveToken.trim() || undefined,
        loginUrl: liveLoginUrl,
        username: liveUsername,
        password: livePassword,
      };
    } else if (apiSource === 'production-id') {
      payload = {
        ...payload,
        apiUrl: prodApiUrl,
        apiKey: prodApiKey,
      };
    } else {
      payload = {
        ...payload,
        apiUrl: v2ApiUrl,
        token: v2Token.trim() || undefined,
        loginUrl: v2LoginUrl,
        username: v2Username,
        password: v2Password,
      };
    }

    try {
      const res = await fetch('/api/admin/import-abas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(`✅ ${data.message}`);
        fetchAttendeeCount(importYear);
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight">Archive & Event Transition</h1>
            <Link
              href="/admin/events"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center gap-1.5"
            >
              <span>🎪</span> Manage Named Events
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Export historical winners for permanent static archiving, manage attendee rosters, and sync between API sources
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

        {/* Section 2: Manage & Empty Attendees */}
        <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗑️</span>
              <div>
                <h2 className="text-xl font-bold text-white">2. Clear / Empty Attendees Database</h2>
                <p className="text-xs text-slate-400">
                  Delete current attendees to switch cleanly between production and development API rosters.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Database Count</span>
              <span className="text-lg font-black font-mono text-amber-400">
                {currentAttendeeCount !== null ? `${currentAttendeeCount} Attendees` : 'Loading...'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-950/20 border border-red-500/20 p-4 rounded-2xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-200">
                Delete all attendees for Event Year {importYear}
              </p>
              <p className="text-[11px] text-slate-400">
                This deletes Guest entries without touching Admin accounts, System Settings, or Prize definitions.
              </p>
            </div>

            <button
              onClick={handleClearAttendees}
              disabled={clearLoading || currentAttendeeCount === 0}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 font-bold rounded-xl text-xs shadow transition disabled:opacity-40 text-white whitespace-nowrap flex items-center gap-2 self-start sm:self-auto"
            >
              <span>{clearLoading ? '⏳' : '⚠️'}</span>
              <span>{clearLoading ? 'Wiping Attendees...' : `Clear Year ${importYear} Attendees`}</span>
            </button>
          </div>

          {clearMsg && (
            <div className="p-4 bg-slate-800/80 border border-white/10 rounded-2xl text-xs font-semibold">
              {clearMsg}
            </div>
          )}
        </div>

        {/* Section 3: Import from Selected Employee API */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-xl font-bold">3. Import / Sync Employees from Avega HR System</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setApiSource('production-live')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                    apiSource === 'production-live'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ABAS v3 Live Master
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    api.avegabros.org/api/hr-employees — Live Core HR master with login/token, real separation dates, group, and location assignment.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setApiSource('production-id')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                    apiSource === 'production-id'
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      ABAS v3 ID Badges
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Legacy Key
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    api.avegabros.org/website/id-employees — Legacy ID printing badge records (uses static API key).
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
                      HRIS v2 (Next Gen)
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

            {/* Mode 1: ABAS v3 Live Master with Login / Token */}
            {apiSource === 'production-live' && (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                    <span>⚡</span> ABAS v3 Core HR Master (Live Master Table)
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
                    Live Employees Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={liveApiUrl}
                    onChange={(e) => setLiveApiUrl(e.target.value)}
                    placeholder="https://api.avegabros.org/api/hr-employees"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Automatically queries with <code className="text-emerald-400">?action=active</code> to exclude separated and resigned staff.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-400">
                      Bearer Token (Optional if logging in below)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {liveToken ? 'Using direct Bearer token' : 'If empty, will use username & password below'}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={liveToken}
                    onChange={(e) => setLiveToken(e.target.value)}
                    placeholder="Paste Bearer token here..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    liveToken ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-800/40 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <span>🔐</span> ABAS v3 API Login Credentials
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Automatically logs in to get fresh Bearer token
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Login Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={liveLoginUrl}
                        onChange={(e) => setLiveLoginUrl(e.target.value)}
                        placeholder="https://api.avegabros.org/api/auth-login"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                          ABAS Username
                        </label>
                        <input
                          type="text"
                          value={liveUsername}
                          onChange={(e) => setLiveUsername(e.target.value)}
                          placeholder="Your ABAS username"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                          ABAS Password
                        </label>
                        <input
                          type="password"
                          value={livePassword}
                          onChange={(e) => setLivePassword(e.target.value)}
                          placeholder="Your ABAS password"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Legacy Production ID Badges Inputs */}
            {apiSource === 'production-id' && (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                    <span>⚡</span> Production ABAS v3 ID Badges (Static Key)
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

            {/* Target Event Year */}
            <div className="pt-2">
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

            {/* Wipe existing checkbox */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700 flex items-center gap-3">
              <input
                id="wipeBeforeSync"
                type="checkbox"
                checked={wipeBeforeSync}
                onChange={(e) => setWipeBeforeSync(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-600"
              />
              <label htmlFor="wipeBeforeSync" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                <span className="text-amber-400 font-bold">Wipe & replace:</span> Delete existing attendees for Year {importYear} before syncing from the selected source
              </label>
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
                  : apiSource === 'production-live'
                  ? 'Sync Employees from ABAS v3 Live Master'
                  : apiSource === 'production-id'
                  ? 'Sync Employees from Legacy ID Badges'
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
