'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface EventItem {
  id: number;
  code: string;
  name: string;
  year: number;
  description?: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  _count?: {
    guests: number;
    prizes: number;
  };
}

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form states for creating new event
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [year, setYear] = useState<number>(2026);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSetActive = async (id: number) => {
    try {
      setMessage('Activating event...');
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message || 'Active event changed!'}`);
        fetchEvents();
      } else {
        setMessage(`❌ ${data.error || 'Failed to activate event'}`);
      }
    } catch {
      setMessage('❌ Network error while activating event');
    }
  };

  const handleArchiveEvent = async (eventCode: string, eventName: string) => {
    if (!confirm(`Are you sure you want to archive "${eventName}" (${eventCode})?\n\nThis will freeze all winners and prizes into a permanent snapshot and mark the event archived.`)) {
      return;
    }

    try {
      setMessage(`Archiving ${eventName}...`);
      const res = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message || 'Event archived successfully!'}`);
        fetchEvents();
      } else {
        setMessage(`❌ ${data.error || 'Failed to archive event'}`);
      }
    } catch {
      setMessage('❌ Network error while archiving event');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setMessage('❌ Please enter an event name and unique code.');
      return;
    }

    setIsCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          code,
          year,
          description,
          isActive: events.length === 0, // make active if first
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Event "${data.event.name}" created successfully!`);
        setName('');
        setCode('');
        setDescription('');
        fetchEvents();
      } else {
        setMessage(`❌ ${data.error || 'Failed to create event'}`);
      }
    } catch {
      setMessage('❌ Network error while creating event');
    } finally {
      setIsCreating(false);
    }
  };

  // Helper to suggest a code based on name and year
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code.startsWith('EV-')) {
      const slug = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 15);
      if (slug) {
        setCode(`${slug}-${year}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      <AdminNav badgeTitle="Event Management" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-amber-400 tracking-tight flex items-center gap-2">
              <span>🎪</span> Event Archiving & Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create and manage distinct events across the year (e.g. Christmas Party, Midyear Loyalty Awards, Outings).
            </p>
          </div>
          <Link
            href="/admin/archive"
            className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-white/10 transition flex items-center gap-1.5"
          >
            <span>📦</span> View Archiving & Reset
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-white/10 text-sm font-semibold flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-xs text-slate-500 hover:text-white">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Event Card */}
          <div className="lg:col-span-1 bg-slate-900/80 border border-white/10 p-6 rounded-2xl h-fit">
            <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <span>➕</span> Add New Event
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Define a midyear award, Christmas celebration, or standalone raffle event.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-400 mb-1">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Loyalty Awards 2026 Midyear"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Event Code (Slug)</label>
                  <input
                    type="text"
                    placeholder="LOYALTY-2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes about location, criteria, or purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg disabled:opacity-50 mt-2"
              >
                {isCreating ? 'Creating Event...' : '🚀 Create Event'}
              </button>
            </form>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center justify-between">
              <span>All Registered Events</span>
              <button
                onClick={fetchEvents}
                className="text-xs text-slate-400 hover:text-amber-400 font-semibold"
              >
                🔄 Refresh
              </button>
            </h2>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-white/5">
                No events found. Create the first one above!
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-5 rounded-2xl border transition ${
                    ev.isActive
                      ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-white/10">
                          {ev.code}
                        </span>
                        <h3 className="text-lg font-black text-white">{ev.name}</h3>
                        {ev.isActive && (
                          <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            ● Active Live Event
                          </span>
                        )}
                        {ev.isArchived && (
                          <span className="bg-slate-700 text-slate-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                            📦 Archived
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        <span>📅 Year: <strong className="text-white">{ev.year}</strong></span>
                        <span>👥 Attendees: <strong className="text-amber-400">{ev._count?.guests ?? 0}</strong></span>
                        <span>🎁 Prizes: <strong className="text-amber-400">{ev._count?.prizes ?? 0}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {ev.isActive ? (
                        <span className="text-xs font-bold text-amber-400 px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          Active Target
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActive(ev.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl border border-white/10 transition"
                        >
                          🎯 Set as Active
                        </button>
                      )}

                      {!ev.isArchived ? (
                        <button
                          onClick={() => handleArchiveEvent(ev.code, ev.name)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition flex items-center gap-1"
                          title="Archive winners and prizes to static snapshot"
                        >
                          <span>📦</span> Archive
                        </button>
                      ) : (
                        <Link
                          href={`/history`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 font-bold text-xs rounded-xl border border-white/10 transition"
                        >
                          View Archive
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

