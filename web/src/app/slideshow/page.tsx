'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Maximize2, Play, Pause, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

interface PrizeItem {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  isGrandPrize: boolean;
  quantity: number;
  location?: string | null;
  eventYear?: number | null;
  imagePath?: string | null;
}

interface WinnerSlideItem {
  id: number;
  fullName: string;
  employeeId: string;
  department?: string | null;
  position?: string | null;
  location?: string | null;
  prize: string;
  winOn: string;
  avatar?: string | null;
  year?: number;
}

export default function PrizeSlideshowPage() {
  const [mode, setMode] = useState<'PRIZES' | 'WINNERS'>('PRIZES');
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);
  const [winners, setWinners] = useState<WinnerSlideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(5);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(true);

  const fetchPrizes = (loc = selectedLocation, yr = selectedYear) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (loc && loc !== 'ALL') params.set('location', loc);
    if (yr) params.set('year', String(yr));

    fetch(`/api/prizes?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.prizes) {
          setPrizes(data.prizes);
          setCurrentIndex(0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchWinners = (loc = selectedLocation, yr = selectedYear) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('year', String(yr));
    if (loc && loc !== 'ALL') params.set('location', loc);

    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.winners) {
          setWinners(data.winners);
          setCurrentIndex(0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // First read system settings for active location
    fetch('/api/settings')
      .then((res) => res.json())
      .then((s) => {
        if (s.activeLocation) setSelectedLocation(s.activeLocation);
        if (s.activeYear) setSelectedYear(s.activeYear);
        if (mode === 'PRIZES') {
          fetchPrizes(s.activeLocation || 'ALL', s.activeYear || 2026);
        } else {
          fetchWinners(s.activeLocation || 'ALL', s.activeYear || 2026);
        }
      })
      .catch(() => {
        if (mode === 'PRIZES') fetchPrizes();
        else fetchWinners();
      });
  }, [mode]);

  // Handle data reload when filters change
  const handleLocationChange = (loc: string) => {
    setSelectedLocation(loc);
    if (mode === 'PRIZES') fetchPrizes(loc, selectedYear);
    else fetchWinners(loc, selectedYear);
  };

  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    if (mode === 'PRIZES') fetchPrizes(selectedLocation, yr);
    else fetchWinners(selectedLocation, yr);
  };

  const totalItems = mode === 'PRIZES' ? prizes.length : winners.length;

  // Auto-play slideshow timer
  useEffect(() => {
    if (!isPlaying || totalItems === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalItems);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, totalItems, intervalSec]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const currentPrize = prizes[currentIndex];
  const currentWinner = winners[currentIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between overflow-hidden relative select-none">
      {/* Top Floating Controls */}
      <header className="absolute top-6 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/stage"
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-white/10 backdrop-blur-md text-xs font-bold transition flex items-center gap-2"
          >
            ← Wheel Stage
          </Link>

          {/* Mode Switcher: Prizes Showcase vs Previous Winners */}
          <div className="flex bg-slate-900/90 rounded-2xl p-1 border border-white/10 text-xs font-black">
            <button
              onClick={() => setMode('PRIZES')}
              className={`px-4 py-1.5 rounded-xl transition ${
                mode === 'PRIZES' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎁 Prizes Showcase
            </button>
            <button
              onClick={() => setMode('WINNERS')}
              className={`px-4 py-1.5 rounded-xl transition ${
                mode === 'WINNERS' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Winners Slideshow
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
          {/* Location filter */}
          <div className="flex bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-xs font-bold">
            {['ALL', 'TAYUD', 'MAKATI'].map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocationChange(loc)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedLocation === loc ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="bg-slate-950 text-xs font-bold text-amber-400 rounded-xl px-2.5 py-1.5 border border-slate-800 focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-amber-400"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(parseInt(e.target.value, 10))}
            className="bg-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 py-2 border border-slate-700 focus:outline-none"
          >
            <option value={3}>3s Speed</option>
            <option value={5}>5s Speed</option>
            <option value={8}>8s Speed</option>
          </select>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-white"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Slide Content */}
      <main className="flex-1 flex items-center justify-center p-8 lg:p-16 my-auto">
        {loading ? (
          <div className="text-xl text-slate-500 font-bold animate-pulse">
            {mode === 'PRIZES' ? 'Loading Prize Showcase...' : 'Loading Winners Slideshow...'}
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center text-slate-400">
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'PRIZES' ? 'No Prizes in Catalog' : 'No Winners Found'}
            </h2>
            <p className="text-sm">
              {mode === 'PRIZES'
                ? 'Please add prizes via the Admin panel or Android app.'
                : `No winners recorded for ${selectedYear} (${selectedLocation}).`}
            </p>
          </div>
        ) : mode === 'PRIZES' && currentPrize ? (
          <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-12 bg-slate-900/60 border border-white/10 rounded-3xl p-8 lg:p-12 shadow-[0_0_80px_rgba(245,158,11,0.15)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
            {/* Prize Image (Left) */}
            <div className="w-full md:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden bg-slate-950/80 border border-white/10 shadow-2xl flex items-center justify-center relative">
              {currentPrize.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPrize.imagePath}
                  alt={currentPrize.name}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <span className="text-8xl mb-3">{currentPrize.isGrandPrize ? '🏆' : '🎁'}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Prize Showcase</span>
                </div>
              )}

              <div className="absolute top-4 left-4">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${
                    currentPrize.isGrandPrize
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white'
                  }`}
                >
                  {currentPrize.isGrandPrize ? '🌟 GRAND PRIZE' : '🎁 REGULAR PRIZE'}
                </span>
              </div>
            </div>

            {/* Prize Info (Right) */}
            <div className="w-full md:w-1/2 space-y-4 text-left">
              <div className="text-xs font-mono text-amber-400 tracking-widest uppercase">
                Prize {currentIndex + 1} of {prizes.length}
              </div>

              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {currentPrize.name}
              </h1>

              {currentPrize.description && (
                <p className="text-lg text-slate-300 font-medium leading-relaxed">
                  {currentPrize.description}
                </p>
              )}

              <div className="pt-4 flex items-center gap-4">
                <div className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white">
                  Available Quantity: <span className="text-amber-400 font-black">{currentPrize.quantity}</span>
                </div>
              </div>
            </div>
          </div>
        ) : mode === 'WINNERS' && currentWinner ? (
          <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-12 bg-slate-900/60 border border-amber-500/20 rounded-3xl p-8 lg:p-12 shadow-[0_0_90px_rgba(245,158,11,0.2)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
            {/* Winner Portrait (Left) */}
            <div className="w-full md:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden bg-slate-950/80 border border-amber-500/30 shadow-2xl flex items-center justify-center relative">
              {currentWinner.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentWinner.avatar}
                  alt={currentWinner.fullName}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-amber-500">
                  <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-5xl font-black text-slate-950 shadow-2xl mb-4 border-4 border-amber-300">
                    {currentWinner.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
                    {currentWinner.employeeId || 'Champion Winner'}
                  </span>
                </div>
              )}

              <div className="absolute top-4 left-4">
                <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 inline" /> {currentWinner.year || selectedYear} CHAMPION
                </span>
              </div>

              {currentWinner.location && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900/80 border border-white/20 text-slate-300 backdrop-blur-md">
                    {currentWinner.location}
                  </span>
                </div>
              )}
            </div>

            {/* Winner Info (Right) */}
            <div className="w-full md:w-1/2 space-y-4 text-left">
              <div className="text-xs font-mono text-amber-400 tracking-widest uppercase flex items-center gap-2">
                <span>Winner {currentIndex + 1} of {winners.length}</span>
                {currentWinner.employeeId && (
                  <span className="text-slate-500">• ID: {currentWinner.employeeId}</span>
                )}
              </div>

              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {currentWinner.fullName}
              </h1>

              {(currentWinner.department || currentWinner.position) && (
                <div className="flex flex-wrap items-center gap-2 text-slate-300">
                  {currentWinner.department && (
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700">
                      {currentWinner.department}
                    </span>
                  )}
                  {currentWinner.position && (
                    <span className="text-sm font-medium text-slate-400">
                      {currentWinner.position}
                    </span>
                  )}
                </div>
              )}

              {/* Prize Details Card */}
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Prize Claimed
                </div>
                <div className="text-2xl font-black text-white">
                  {currentWinner.prize}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation Buttons */}
      <footer className="w-full pb-8 flex items-center justify-center gap-4 z-20">
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems))}
          className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-full border border-white/10 text-white transition active:scale-95 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2 max-w-xs overflow-x-auto px-4 py-2">
          {Array.from({ length: totalItems }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${
                currentIndex === idx ? 'w-8 bg-amber-500' : 'w-2.5 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % Math.max(1, totalItems))}
          className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-full border border-white/10 text-white transition active:scale-95 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}
