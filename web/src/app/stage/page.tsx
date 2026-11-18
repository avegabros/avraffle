'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RaffleWheel, WheelSegment, RaffleWheelHandle } from '@/components/wheel/RaffleWheel';
import { WinnerModal } from '@/components/stage/WinnerModal';
import { StageControls } from '@/components/stage/StageControls';
import { soundManager } from '@/lib/sound';

export default function StagePage() {
  const wheelRef = useRef<RaffleWheelHandle | null>(null);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWinner, setCurrentWinner] = useState<WheelSegment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pointingAttendee, setPointingAttendee] = useState<WheelSegment | null>(null);

  // Hidden by default top header, Show prize card by default
  const [showTopHeader, setShowTopHeader] = useState(false);
  const [showPrizeCard, setShowPrizeCard] = useState(true);

  // Settings loaded from /api/settings
  const [duration, setDuration] = useState(8);
  const [power, setPower] = useState<'low' | 'medium' | 'high'>('high');
  const [fontSize, setFontSize] = useState(13);
  const [wheelSize, setWheelSize] = useState(900);

  const [selectedPrize, setSelectedPrize] = useState<{ id?: number; name: string; isGrand: boolean; imagePath?: string | null }>({
    name: 'Loading Prize...',
    isGrand: false,
    imagePath: null,
  });

  const [activeLocation, setActiveLocation] = useState<string>('ALL');
  const [activeYear, setActiveYear] = useState<number>(2026);

  const loadWheelData = async (loc = activeLocation, yr = activeYear) => {
    try {
      const res = await fetch(`/api/wheel?location=${encodeURIComponent(loc)}&year=${encodeURIComponent(yr)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.segments)) {
        setSegments(data.segments);
      }
      // If no prize currently selected or still in initial state, sync with first prize from database
      if (data.regularPrizes?.length > 0 || data.grandPrizes?.length > 0) {
        const firstPrize = data.regularPrizes?.[0] || data.grandPrizes?.[0];
        setSelectedPrize((prev) => {
          if (!prev.id && (prev.name === 'Loading Prize...' || prev.name === 'General Raffle Prize')) {
            return {
              id: firstPrize.id,
              name: firstPrize.name,
              isGrand: firstPrize.isGrandPrize,
              imagePath: firstPrize.imagePath || null,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load wheel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let currentLoc = activeLocation;
    let currentYr = activeYear;

    // 1. Initial fetch of settings & attendees
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('settings failed');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const loc = data.activeLocation || 'ALL';
        const yr = data.activeYear || 2026;
        currentLoc = loc;
        currentYr = yr;
        if (data.duration) setDuration(data.duration);
        if (data.power) setPower(data.power);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.wheelSize) setWheelSize(data.wheelSize);
        setActiveLocation(loc);
        setActiveYear(yr);
        loadWheelData(loc, yr);
      })
      .catch((err) => {
        console.warn('Settings load fallback:', err);
        if (isMounted) loadWheelData(currentLoc, currentYr);
      });

    // 2. Fetch initial prize from /api/wheel/state
    fetch('/api/wheel/state')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.state?.prizeName) {
          setSelectedPrize({
            id: data.state.grandPrizeId,
            name: data.state.prizeName,
            isGrand: data.state.isGrand ?? false,
            imagePath: data.state.prizeImagePath || null,
          });
        }
      })
      .catch(console.error);

    // 3. Poll for remote spin triggers & live settings updates (500ms for master stage)
    let lastSeenTrigger = 0;
    let lastSeenSettingsUpdate = 0;
    let lastSeenReloadGuests = 0;

    const pollInterval = 500;

    const interval = setInterval(async () => {
      try {
        const [stateRes, settingsRes] = await Promise.all([
          fetch('/api/wheel/state'),
          fetch('/api/settings'),
        ]);

        if (!isMounted) return;

        if (stateRes.ok) {
          const data = await stateRes.json();
          const state = data.state;
          if (state) {
            // Reload wheel attendees when remote confirms a winner
            if (state.reloadGuestsCount && state.reloadGuestsCount > lastSeenReloadGuests) {
              lastSeenReloadGuests = state.reloadGuestsCount;
              loadWheelData(currentLoc, currentYr);
            }

            // Sync selected prize from remote
            if (state.prizeName) {
              setSelectedPrize((prev) => {
                if (
                  prev.name !== state.prizeName ||
                  prev.id !== state.grandPrizeId ||
                  prev.imagePath !== state.prizeImagePath
                ) {
                  return {
                    id: state.grandPrizeId,
                    name: state.prizeName,
                    isGrand: state.isGrand ?? false,
                    imagePath: state.prizeImagePath || null,
                  };
                }
                return prev;
              });
            }

            // Trigger remote spin
            if (state.status === 'SPINNING' && state.spinTriggerCount > lastSeenTrigger) {
              lastSeenTrigger = state.spinTriggerCount;
              setIsModalOpen(false);
              setCurrentWinner(null);
              
              // If target winner segment ID is provided, find its index so all screens stop identically
              let targetIdx: number | undefined = undefined;
              if (state.targetWinnerId) {
                const foundIdx = segments.findIndex((s) => s.id === state.targetWinnerId);
                if (foundIdx !== -1) targetIdx = foundIdx;
              }
              wheelRef.current?.spinToWinner(targetIdx);
            }

            // If remote triggered respin or closed modal, dismiss winner dialog immediately!
            if (state.winner === null) {
              setIsModalOpen(false);
              setCurrentWinner(null);
            }
          }
        }

        // Live real-time settings sync from /admin or Android app
        if (settingsRes.ok) {
          const cfg = await settingsRes.json();
          if (cfg.updatedAt && cfg.updatedAt > lastSeenSettingsUpdate) {
            lastSeenSettingsUpdate = cfg.updatedAt;
            if (cfg.duration) setDuration(cfg.duration);
            if (cfg.power) setPower(cfg.power);
            if (cfg.fontSize) setFontSize(cfg.fontSize);
            if (cfg.wheelSize) setWheelSize(cfg.wheelSize);

            // If location or year changed, reload wheel segments automatically!
            if (cfg.activeLocation && (cfg.activeLocation !== currentLoc || cfg.activeYear !== currentYr)) {
              currentLoc = cfg.activeLocation;
              currentYr = cfg.activeYear || 2026;
              setActiveLocation(currentLoc);
              setActiveYear(currentYr);
              loadWheelData(currentLoc, currentYr);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSpinEnd = async (winner: WheelSegment) => {
    setCurrentWinner(winner);
    setIsModalOpen(true);

    try {
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WINNER_ANNOUNCED',
          winner: {
            id: winner.id,
            employeeId: winner.employeeId,
            name: winner.name,
            department: winner.department,
          },
        }),
      });
    } catch (_) { }
  };

  const handleConfirmWinner = async () => {
    if (!currentWinner) return;
    try {
      await fetch('/api/wheel/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: currentWinner.id,
          prizeName: selectedPrize.name,
          grandPrizeId: selectedPrize.id,
        }),
      });
      // Also clear winner from shared stage state immediately so pollers don't re-trigger it
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONFIRM_CLAIMED' }),
      });
      setIsModalOpen(false);
      setCurrentWinner(null);
      loadWheelData();
    } catch (err) {
      console.error('Failed to confirm winner:', err);
    }
  };

  const handleRespin = async () => {
    setIsModalOpen(false);
    setCurrentWinner(null);
    try {
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESPIN' }),
      });
    } catch (_) {}
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleStopSpin = () => {
    wheelRef.current?.resetWheel();
  };

  const handleLocationChange = async (newLoc: string) => {
    setActiveLocation(newLoc);
    loadWheelData(newLoc, activeYear);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeLocation: newLoc }),
      });
    } catch (_) { }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-black text-white flex flex-col items-center justify-between p-4 overflow-hidden relative">
      {/* Top Right Options & Controls */}
      <StageControls
        isMuted={isMuted}
        toggleMute={toggleMute}
        showTopHeader={showTopHeader}
        setShowTopHeader={setShowTopHeader}
        showPrizeCard={showPrizeCard}
        setShowPrizeCard={setShowPrizeCard}
        isSpinning={isSpinning}
        onStopSpin={handleStopSpin}
        activeLocation={activeLocation}
        onLocationChange={handleLocationChange}
        isViewer={false}
      />

      {/* Stage Header Banner (Hidden by default) */}
      {showTopHeader && (
        <header className="w-full flex items-center justify-between px-8 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-2xl shadow-lg z-20 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              AV-RAFFLE
            </div>
            <span className="text-xs uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold tracking-wider">
              🎉 Unified Event ({activeYear})
            </span>
            <span className="text-xs uppercase px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold tracking-widest">
              {selectedPrize.isGrand ? '🌟 Grand Prize Mode' : '🎁 Regular Draw'}
            </span>
          </div>

          <div className="text-right pr-28">
            <div className="text-sm font-semibold text-slate-300">
              Draw: <span className="text-amber-400 font-bold">{selectedPrize.name}</span>
            </div>
            <div className="text-xs text-slate-400">
              Participants: <span className="text-white font-bold">{segments.length}</span>
            </div>
          </div>
        </header>
      )}

      {/* Main Stage Presentation Area */}
      <div className={`flex-1 flex items-center w-full my-auto z-10 transition-all duration-500 ${showPrizeCard ? 'justify-between px-8 lg:px-16' : 'justify-center'
        }`}>
        {/* Left/Center Wheel Container */}
        <div className={`flex flex-col items-center justify-center transition-all duration-500 -translate-y-4 ${showPrizeCard ? 'lg:-translate-x-6' : ''
          }`}>
          {loading ? (
            <div className="text-xl text-slate-400 animate-pulse font-semibold">
              Loading attendees into wheel...
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center p-8 bg-slate-900/60 rounded-2xl border border-white/10">
              <h2 className="text-2xl font-bold mb-2">No Attendees in Active Wheel</h2>
              <p className="text-slate-400">Please check in attendees or activate them via the Admin panel.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <RaffleWheel
                ref={wheelRef}
                segments={segments}
                onSpinEnd={handleSpinEnd}
                onSpinStateChange={setIsSpinning}
                onPointingSegmentChange={setPointingAttendee}
                duration={duration}
                power={power}
                fontSize={fontSize}
                wheelSize={showPrizeCard ? Math.min(wheelSize, 780) : Math.min(wheelSize, 850)}
                isViewer={false}
              />

              {/* Dynamic Live Attendee Spotlight Banner */}
              <div className="mt-3 min-w-[320px] max-w-[90vw] px-8 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-xl flex items-center justify-center text-center transition-all duration-100">
                <div className="text-2xl lg:text-3xl font-black text-amber-400 tracking-wide truncate max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {pointingAttendee?.name || '---'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Prize Spotlight Panel */}
        {showPrizeCard && (
          <div className="hidden md:flex flex-col items-center justify-center w-80 lg:w-96 p-6 rounded-3xl bg-slate-900/80 border-2 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.2)] backdrop-blur-xl animate-in fade-in slide-in-from-right-6 transition-all duration-300">
            <div className="px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow mb-4">
              {selectedPrize.isGrand ? '🌟 GRAND PRIZE DRAW 🌟' : '🎁 REGULAR DRAW PRIZE'}
            </div>

            {/* Prize Photo Preview */}
            <div className="w-full h-56 lg:h-64 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner flex items-center justify-center mb-4 relative">
              {selectedPrize.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPrize.imagePath}
                  alt={selectedPrize.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <span className="text-6xl mb-2">{selectedPrize.isGrand ? '🏆' : '🎁'}</span>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Featured Prize</span>
                </div>
              )}
            </div>

            {/* Prize Title & Subtitle */}
            <div className="text-center w-full">
              <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {selectedPrize.name}
              </h3>
              <p className="text-xs text-amber-400 font-semibold mt-2 uppercase tracking-widest">
                Current Item To Be Won
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Winner Celebration Modal */}
      <WinnerModal
        isOpen={isModalOpen}
        winner={currentWinner}
        prizeName={selectedPrize.name}
        isGrandPrize={selectedPrize.isGrand}
        isViewer={false}
        onConfirm={handleConfirmWinner}
        onRespin={handleRespin}
      />
    </main>
  );
}
