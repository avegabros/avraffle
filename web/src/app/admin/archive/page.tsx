'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminArchivePage() {
  const [year, setYear] = useState(2025);
  const [archiveMsg, setArchiveMsg] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Import state
  const [apiUrl, setApiUrl] = useState('http://localhost:8080/api/v1/hr/employees');
  const [apiKey, setApiKey] = useState('');
  const [importLocation, setImportLocation] = useState('TAYUD');
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
          apiKey,
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
      setImportMsg('❌ Failed to connect to ABAS-API');
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
              <h2 className="text-xl font-bold">2. Import 2026 Employees from ABAS-API</h2>
              <p className="text-xs text-slate-400">
                Connects directly to the HR Employee endpoint to populate attendees for 2026.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                ABAS-API Endpoint URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8080/api/v1/hr/employees"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Bearer Token / API Key (optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Bearer token if authentication is enabled"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
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
              {importLoading ? 'Syncing...' : 'Sync Employees from ABAS-API'}
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
