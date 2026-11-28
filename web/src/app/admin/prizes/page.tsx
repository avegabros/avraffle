'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface Prize {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  isGrandPrize: boolean;
  quantity: number;
  priority?: number;
  location: string;
  eventYear: number;
  isWon: boolean;
  imagePath?: string | null;
  wonBy?: {
    employeeId: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function AdminPrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStagePrize, setActiveStagePrize] = useState<{
    prizeName: string;
    isGrand: boolean;
    grandPrizeId?: number | null;
  } | null>(null);
  const [settingActivePrize, setSettingActivePrize] = useState(false);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGrandPrize, setIsGrandPrize] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState(999);
  const [location, setLocation] = useState('TAYUD');
  const [eventYear, setEventYear] = useState(2026);
  const [isWon, setIsWon] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const fetchPrizes = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (selectedLocation !== 'ALL') query.set('location', selectedLocation);
    if (selectedYear) query.set('year', String(selectedYear));

    fetch(`/api/prizes?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.prizes) setPrizes(data.prizes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchActiveStageState = () => {
    fetch('/api/wheel/state')
      .then((res) => res.json())
      .then((data) => {
        if (data.state) {
          setActiveStagePrize({
            prizeName: data.state.prizeName,
            isGrand: Boolean(data.state.isGrand),
            grandPrizeId: data.state.grandPrizeId,
          });
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    // Sync default filter to activeLocation and activeYear from system settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeLocation) setSelectedLocation(data.activeLocation);
        if (data.activeYear) setSelectedYear(data.activeYear);
      })
      .catch(console.error);

    fetchActiveStageState();
    const interval = setInterval(fetchActiveStageState, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPrizes();
  }, [selectedLocation, selectedYear]);

  const openAddModal = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setIsGrandPrize(false);
    setQuantity(1);
    setPriority(999);
    setLocation(selectedLocation === 'ALL' ? 'TAYUD' : selectedLocation);
    setEventYear(selectedYear);
    setIsWon(false);
    setPhoto(null);
    setShowModal(true);
  };

  const openEditModal = (p: Prize) => {
    setEditId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setIsGrandPrize(p.isGrandPrize);
    setQuantity(p.quantity);
    setPriority(p.priority ?? 999);
    setLocation(p.location || 'TAYUD');
    setEventYear(p.eventYear || 2026);
    setIsWon(p.isWon);
    setPhoto(null);
    setShowModal(true);
  };

  const handleDeletePrize = async (id: number) => {
    if (!confirm('Are you sure you want to delete this prize?')) return;
    try {
      const res = await fetch('/api/prizes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchPrizes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearPrizes = async () => {
    const locMsg = selectedLocation === 'ALL' ? 'ALL locations' : `${selectedLocation} location`;
    if (!confirm(`Are you sure you want to CLEAR all prizes for ${selectedYear} (${locMsg})? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch('/api/prizes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearAll: true,
          location: selectedLocation === 'ALL' ? undefined : selectedLocation,
          eventYear: selectedYear,
        }),
      });
      if (res.ok) {
        alert('Prizes cleared successfully for selected filter!');
        fetchPrizes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetActiveLivePrize = async (p: Prize) => {
    setSettingActivePrize(true);
    try {
      const res = await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELECT_PRIZE',
          prizeName: p.name,
          prizeImagePath: p.imagePath || null,
          isGrand: p.isGrandPrize,
          grandPrizeId: p.isGrandPrize ? p.id : null,
          location: selectedLocation === 'ALL' ? undefined : selectedLocation,
        }),
      });
      if (res.ok) {
        setActiveStagePrize({
          prizeName: p.name,
          isGrand: p.isGrandPrize,
          grandPrizeId: p.isGrandPrize ? p.id : null,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSettingActivePrize(false);
    }
  };

  const handleResetAutoQueue = async () => {
    setSettingActivePrize(true);
    try {
      const res = await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_TO_AUTO_QUEUE',
          location: selectedLocation === 'ALL' ? undefined : selectedLocation,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setActiveStagePrize({
            prizeName: data.state.prizeName,
            isGrand: Boolean(data.state.isGrand),
            grandPrizeId: data.state.grandPrizeId,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSettingActivePrize(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('quantity', String(quantity));
    formData.append('priority', String(priority));
    formData.append('isGrandPrize', String(isGrandPrize));
    formData.append('type', isGrandPrize ? 'GRAND' : 'REGULAR');
    formData.append('location', location);
    formData.append('eventYear', String(eventYear));
    if (photo) formData.append('photo', photo);

    if (editId) {
      formData.append('id', String(editId));
      formData.append('isWon', String(isWon));
    }

    try {
      const res = await fetch('/api/prizes', {
        method: editId ? 'PUT' : 'POST',
        body: formData,
      });
      if (res.ok) {
        setShowModal(false);
        fetchPrizes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="Prizes Inventory" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Prize Inventory</h1>
            <p className="text-slate-400 text-sm mt-1">
              Add, edit, remove prizes, upload showcase pictures, filter by year/location
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearPrizes}
              className="px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold rounded-xl text-sm transition"
            >
              🗑️ Clear Prizes ({selectedYear})
            </button>
            <button
              onClick={openAddModal}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl text-sm shadow-lg transition text-slate-950"
            >
              + Add New Prize
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Live Stage Prize Status */}
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400 mr-2">Location:</span>
            {['ALL', 'TAYUD', 'MAKATI'].map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedLocation === loc
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {loc === 'ALL' ? 'All Locations' : loc}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-slate-400">Raffle Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026 (Upcoming)</option>
              <option value={2025}>2025 (Previous / Archived)</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* Live Stage Prize Control Banner */}
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-xl">
              🎯
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>Active Live Stage Prize</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                <span>{activeStagePrize?.prizeName || 'Auto-queue active'}</span>
                {activeStagePrize?.isGrand && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    Grand Prize
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAutoQueue}
              disabled={settingActivePrize}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Reset wheel to automatic priority queue"
            >
              <span>⚡ Reset to Auto-Queue</span>
            </button>
            <a
              href="/stage"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 transition flex items-center gap-1.5"
            >
              <span>📺 Open Stage Wheel</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Prizes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-500 animate-pulse">
              Loading prizes inventory...
            </div>
          ) : prizes.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500">
              No prizes added yet. Click &quot;+ Add New Prize&quot; to begin.
            </div>
          ) : (
            prizes.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-white/20 transition"
              >
                <div>
                  <div className="h-44 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                    {p.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagePath} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">{p.isGrandPrize ? '🏆' : '🎁'}</span>
                    )}

                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          p.isGrandPrize
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-emerald-500 text-white shadow'
                        }`}
                      >
                        {p.isGrandPrize ? 'Grand Prize' : 'Regular Draw'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-300 border border-amber-500/30">
                        {p.location || 'ALL'} · {p.eventYear}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          p.isWon ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {p.isWon ? 'Claimed' : `Qty: ${p.quantity}`}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-extrabold text-lg text-white leading-tight">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs">
                    {p.isWon ? (
                      <span className="text-red-400 font-bold">Claimed / Won</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">In Inventory</span>
                    )}
                  </div>

                  {/* Actions: Set as Live Stage Prize, Edit, Delete */}
                  <div className="flex items-center gap-2">
                    {!p.isWon && p.quantity > 0 && (
                      <button
                        onClick={() => handleSetActiveLivePrize(p)}
                        disabled={settingActivePrize}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          activeStagePrize?.prizeName === p.name
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                        title="Set as the active prize on the live wheel stage right now"
                      >
                        {activeStagePrize?.prizeName === p.name ? 'Active' : 'Set Live'}
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200 transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePrize(p.id)}
                      className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-xs font-bold rounded-lg border border-red-800/60 text-red-300 transition cursor-pointer"
                      title="Delete Prize"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Prize Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? 'Edit Prize' : 'Add New Prize'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Prize Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 1 Sack 5 kl Rice"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Premium Dinorado 5kg"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Queue Priority</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                    placeholder="999"
                    title="Higher numbers draw first (default 999)"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="grandPrize"
                    checked={isGrandPrize}
                    onChange={(e) => setIsGrandPrize(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                  />
                  <label htmlFor="grandPrize" className="text-xs font-bold uppercase text-amber-400 cursor-pointer">
                    Grand Prize
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Target Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="TAYUD">Tayud</option>
                    <option value="MAKATI">Makati</option>
                    <option value="ALL">All Locations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Raffle Event Year</label>
                  <input
                    type="number"
                    value={eventYear}
                    onChange={(e) => setEventYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {editId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="wonPrize"
                    checked={isWon}
                    onChange={(e) => setIsWon(e.target.checked)}
                    className="w-4 h-4 accent-red-500 cursor-pointer rounded"
                  />
                  <label htmlFor="wonPrize" className="text-xs font-bold uppercase text-red-400 cursor-pointer">
                    Mark as Won / Claimed
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Prize Photo Upload (Auto-WebP)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl text-sm shadow-lg transition text-slate-950 font-black"
              >
                {editId ? 'Save Prize Changes' : 'Upload & Save Prize'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
