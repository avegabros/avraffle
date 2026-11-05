'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface Guest {
  id: number;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  department?: string | null;
  position?: string | null;
  assigned?: string | null;
  location: string;
  eventYear: number;
  isRegistered: boolean;
  inWheel: boolean;
  isWinner: boolean;
  prizeWon?: string | null;
  thumbPath?: string | null;
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [loading, setLoading] = useState(true);

  // Edit attendee modal state
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editLocation, setEditLocation] = useState('TAYUD');
  const [editYear, setEditYear] = useState(2026);
  const [editIsRegistered, setEditIsRegistered] = useState(false);
  const [editInWheel, setEditInWheel] = useState(false);
  const [editIsWinner, setEditIsWinner] = useState(false);
  const [editPrizeWon, setEditPrizeWon] = useState('');

  const fetchGuests = (query = search, loc = selectedLocation, yr = selectedYear) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (loc && loc !== 'ALL') params.set('location', loc);
    if (yr) params.set('year', String(yr));

    fetch(`/api/guests?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.guests) setGuests(data.guests);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGuests(search, selectedLocation, selectedYear);
  }, [selectedLocation, selectedYear]);

  const toggleStatus = async (id: number, field: 'inWheel' | 'isRegistered', currentValue: boolean) => {
    try {
      const res = await fetch('/api/guests/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: !currentValue }),
      });
      if (res.ok) {
        setGuests((prev) =>
          prev.map((g) => (g.id === id ? { ...g, [field]: !currentValue } : g))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetWinner = async (g: Guest) => {
    if (!confirm(`Reset winner status for "${g.firstName} ${g.lastName}" and return them to the raffle wheel?`)) {
      return;
    }
    try {
      const res = await fetch('/api/guests/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: g.id, isWinner: false }),
      });
      if (res.ok) {
        fetchGuests(search, selectedLocation, selectedYear);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (g: Guest) => {
    setEditingGuest(g);
    setEditFirstName(g.firstName);
    setEditLastName(g.lastName);
    setEditDepartment(g.department || '');
    setEditPosition(g.position || '');
    setEditLocation(g.location || 'TAYUD');
    setEditYear(g.eventYear || 2026);
    setEditIsRegistered(g.isRegistered);
    setEditInWheel(g.inWheel);
    setEditIsWinner(g.isWinner);
    setEditPrizeWon(g.prizeWon || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;

    try {
      const res = await fetch('/api/guests/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGuest.id,
          firstName: editFirstName,
          lastName: editLastName,
          department: editDepartment,
          position: editPosition,
          location: editLocation,
          eventYear: editYear,
          isRegistered: editIsRegistered,
          inWheel: editInWheel,
          isWinner: editIsWinner,
          prizeWon: editPrizeWon,
        }),
      });

      if (res.ok) {
        setEditingGuest(null);
        fetchGuests(search, selectedLocation, selectedYear);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="Guest Attendance & Wheel" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Attendee Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage check-ins, portrait photos, and active raffle wheel eligibility
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchGuests(search, selectedLocation, selectedYear);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name..."
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-52"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Table View */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Company / Year</th>
                  <th className="px-6 py-4">Department / Position</th>
                  <th className="px-6 py-4 text-center">Registered</th>
                  <th className="px-6 py-4 text-center">In Wheel</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                      Loading attendee list...
                    </td>
                  </tr>
                ) : guests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No attendees found.
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-white">{g.employeeId}</td>
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                            {g.thumbPath ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={g.thumbPath} alt={g.firstName} className="w-full h-full object-cover" />
                            ) : (
                              g.firstName.charAt(0)
                            )}
                          </div>
                          <span>
                            {g.firstName} {g.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                          {g.department || g.assigned || 'Avega Group'} · {g.eventYear || 2026}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {g.department || 'N/A'} {g.position ? `• ${g.position}` : ''}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(g.id, 'isRegistered', g.isRegistered)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                            g.isRegistered
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {g.isRegistered ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(g.id, 'inWheel', g.inWheel)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                            g.inWheel
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {g.inWheel ? 'In Wheel' : 'Excluded'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {g.isWinner ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              🏆 {g.prizeWon || 'Won'}
                            </span>
                            <button
                              onClick={() => handleResetWinner(g)}
                              className="text-[10px] text-amber-400 hover:underline font-bold"
                              title="Reset Winner status back to eligible"
                            >
                              ↺ Reset Winner
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Eligible</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(g)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200 transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Attendee Modal */}
      {editingGuest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold">Edit Attendee</h2>
                <p className="text-xs text-slate-400 font-mono">ID: {editingGuest.employeeId}</p>
              </div>
              <button onClick={() => setEditingGuest(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Position</label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Location</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="TAYUD">Tayud</option>
                    <option value="MAKATI">Makati</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Event Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="p-3 bg-slate-800/80 rounded-xl space-y-2 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Checked In (Registered)</span>
                  <input
                    type="checkbox"
                    checked={editIsRegistered}
                    onChange={(e) => setEditIsRegistered(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Active in Raffle Wheel</span>
                  <input
                    type="checkbox"
                    checked={editInWheel}
                    onChange={(e) => setEditInWheel(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                  <span className="text-xs font-bold text-purple-300">Marked as Winner</span>
                  <input
                    type="checkbox"
                    checked={editIsWinner}
                    onChange={(e) => setEditIsWinner(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                </div>
              </div>

              {editIsWinner && (
                <div>
                  <label className="block text-xs font-bold uppercase text-purple-400 mb-1">Prize Won Description</label>
                  <input
                    type="text"
                    value={editPrizeWon}
                    onChange={(e) => setEditPrizeWon(e.target.value)}
                    placeholder="e.g. Smart 4K TV 55 inch"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-black rounded-xl text-sm shadow transition text-slate-950"
              >
                Save Attendee Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
