'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminArchivePage() {
  const [year, setYear] = useState(2025);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Import state
  const [apiUrl, setApiUrl] = useState('https://api.avegabros.net/v2/hris/employees');
  const [token, setToken] = useState('');
  const [loginUrl, setLoginUrl] = useState('https://api.avegabros.net/v2/auth/login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234567890');
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
    try {
      const res = await fetch('/api/admin/import-abas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl,
          token: token.trim() || undefined,
          loginUrl,
          username,
          password,
          location: importLocation,
          eventYear: importYear,
        }),
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
            Export historical winners for permanent static archiving, reset the database, and import 2026 employees
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

        {/* Section 2: Import from ABAS-API */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-xl font-bold">2. Import / Sync Employees from Avega HRIS V2</h2>
              <p className="text-xs text-slate-400">
                Connects directly to https://api.avegabros.net/v2/hris/employees with automatic JWT authentication.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                HRIS Employees Endpoint URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.avegabros.net/v2/hris/employees"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Bearer Token (Optional)
                </label>
                <span className="text-[10px] text-slate-500">
                  {token ? 'Using direct Bearer token' : 'If empty, will automatically login to API below'}
                </span>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste Bearer token here (e.g. eyJhbGciOi...)"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${token ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-800/40 border-slate-700'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🔐</span> Fallback: Automatic Login Authentication
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
                    value={loginUrl}
                    onChange={(e) => setLoginUrl(e.target.value)}
                    placeholder="https://api.avegabros.net/v2/auth/login"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      API Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold rounded-xl text-sm shadow transition disabled:opacity-50 text-white"
            >
              {importLoading ? 'Syncing...' : 'Sync Employees from HRIS V2'}
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
