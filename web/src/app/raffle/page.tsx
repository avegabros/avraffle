'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RaffleWheel, WheelSegment, RaffleWheelHandle } from '@/components/wheel/RaffleWheel';
import { WinnerModal } from '@/components/stage/WinnerModal';
import { soundManager } from '@/lib/sound';
import { Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

export default function PublicRaffleViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">Loading Live Stream...</div>}>
      <RaffleViewContent />
    </Suspense>
  );
}

function RaffleViewContent() {
  const searchParams = useSearchParams();
  const lockedLocation = searchParams.get('location');

  const wheelRef = useRef<RaffleWheelHandle | null>(null);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const segmentsRef = useRef<WheelSegment[]>([]);
  segmentsRef.current = segments;
  const [loading, setLoading] = useState(true);
  const [currentWinner, setCurrentWinner] = useState<WheelSegment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted on phones
  const [pointingAttendee, setPointingAttendee] = useState<WheelSegment | null>(null);
  const [lockedSpotlightName, setLockedSpotlightName] = useState<string | null>(null);
  const [isStageActive, setIsStageActive] = useState(false);

  const [allPrizesClaimed, setAllPrizesClaimed] = useState(false);

  // Settings synced from server
  const [duration, setDuration] = useState(8);
  const [power, setPower] = useState<'low' | 'medium' | 'high'>('high');
  const [fontSize, setFontSize] = useState(13);
  const [wheelSize, setWheelSize] = useState(700);

  const [selectedPrize, setSelectedPrize] = useState<{ id?: number; name: string; isGrand: boolean; imagePath?: string | null }>({
    name: 'Loading Live Prize...',
    isGrand: false,
    imagePath: null,
  });

  const [activeLocation, setActiveLocation] = useState<string>(lockedLocation || 'ALL');
  const [activeYear, setActiveYear] = useState<number>(2026);

  const loadWheelData = async (loc = activeLocation, yr = activeYear, isGrand?: boolean) => {
    try {
      const grandFlag = isGrand !== undefined ? isGrand : selectedPrize.isGrand;
      const res = await fetch(`/api/wheel?location=${encodeURIComponent(loc)}&year=${encodeURIComponent(yr)}&isGrand=${grandFlag}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.segments)) {
        setSegments(data.segments);
      }
      if (typeof data.allPrizesClaimed === 'boolean') {
        setAllPrizesClaimed(data.allPrizesClaimed);
      }
      if (data.regularPrizes?.length > 0 || data.grandPrizes?.length > 0) {
        const firstPrize = data.regularPrizes?.[0] || data.grandPrizes?.[0];
        setSelectedPrize((prev) => {
          if (!prev.id && (prev.name === 'Loading Live Prize...' || prev.name === 'General Raffle Prize')) {
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

    // 1. Initial settings fetch
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const loc = lockedLocation || data.activeLocation || 'ALL';
        const yr = data.activeYear || 2026;
        currentLoc = loc;
        currentYr = yr;
        if (data.duration) setDuration(data.duration);
        if (data.power) setPower(data.power);
        if (data.fontSize) setFontSize(data.fontSize);
        setActiveLocation(loc);
        setActiveYear(yr);
        loadWheelData(loc, yr);
      })
      .catch(() => {
        if (isMounted) loadWheelData(currentLoc, currentYr);
      });

    // 2. Poll stage state (1200ms lightweight poll)
    let lastSeenTrigger = -1;
    let lastSeenSettingsUpdate = 0;
    let lastSeenReloadGuests = 0;

    const interval = setInterval(async () => {
      try {
        const stateRes = await fetch('/api/wheel/state');

        if (!isMounted) return;

        if (stateRes.ok) {
          const data = await stateRes.json();
          const state = data.state;
          const cfg = data.settings;

          if (state) {
            // Check if stage is actively opened on the master projector
            setIsStageActive(Boolean(state.stageActive));

            // Initialize lastSeenTrigger on first poll so we don't fire stale spins
            if (lastSeenTrigger === -1) {
              lastSeenTrigger = state.spinTriggerCount ?? 0;
            }

            // Reload segments if winner claimed, guests updated, or grand prize toggled
            if (state.reloadGuestsCount && state.reloadGuestsCount > lastSeenReloadGuests) {
              lastSeenReloadGuests = state.reloadGuestsCount;
              loadWheelData(currentLoc, currentYr, state.isGrand);
            }

            // Sync allPrizesClaimed
            if (state.allPrizesClaimed !== undefined) {
              setAllPrizesClaimed(Boolean(state.allPrizesClaimed));
            } else if (state.prizeName === 'All Prizes Claimed!') {
              setAllPrizesClaimed(true);
            }

            // Sync current prize
            if (state.prizeName) {
              setSelectedPrize((prev) => {
                if (
                  prev.name !== state.prizeName ||
                  prev.id !== state.grandPrizeId ||
                  prev.imagePath !== state.prizeImagePath
                ) {
                  // Issue #14: Reset spotlight banner and previous winner when selecting a new prize
                  setLockedSpotlightName(null);
                  setCurrentWinner(null);
                  setIsModalOpen(false);
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

            // Sync live spin trigger whenever remote spins and trigger count increments
            if (state.status === 'SPINNING' && state.spinTriggerCount > lastSeenTrigger) {
              lastSeenTrigger = state.spinTriggerCount;
              setIsModalOpen(false);
              setCurrentWinner(null);
              setLockedSpotlightName(null);

              let targetIdx: number | undefined = undefined;
              if (state.targetWinnerId) {
                const foundIdx = segmentsRef.current.findIndex((s) => s.id === state.targetWinnerId);
                if (foundIdx !== -1) {
                  targetIdx = foundIdx;
                  const remoteTarget = segmentsRef.current[foundIdx];
                  const preloadSrc = remoteTarget?.imagePath || remoteTarget?.thumbPath;
                  if (preloadSrc) {
                    const preloadImg = new Image();
                    preloadImg.src = preloadSrc;
                  }
                }
              }
              wheelRef.current?.spinToWinner(targetIdx);
            }

            // Sync winner modal (only if viewer is not actively spinning)
            if (state.winner === null) {
              setIsModalOpen(false);
              setCurrentWinner(null);
              setLockedSpotlightName(null);
            } else if (state.winner && !isSpinning) {
              setCurrentWinner({
                id: state.winner.id,
                employeeId: state.winner.employeeId,
                name: state.winner.name,
                department: state.winner.department,
                imagePath: state.winner.imagePath,
                thumbPath: state.winner.thumbPath,
              });
              setLockedSpotlightName(state.winner.name);
              setIsModalOpen(true);
            }
          }

          // Sync settings bundled directly in /api/wheel/state
          if (cfg && cfg.updatedAt && cfg.updatedAt > lastSeenSettingsUpdate) {
            lastSeenSettingsUpdate = cfg.updatedAt;
            if (cfg.duration) setDuration(cfg.duration);
            if (cfg.power) setPower(cfg.power);
            if (cfg.fontSize) setFontSize(cfg.fontSize);

            if (!lockedLocation && cfg.activeLocation && (cfg.activeLocation !== currentLoc || cfg.activeYear !== currentYr)) {
              currentLoc = cfg.activeLocation;
              currentYr = cfg.activeYear || 2026;
              setActiveLocation(currentLoc);
              setActiveYear(currentYr);
              loadWheelData(currentLoc, currentYr);
            }
          }
        }
      } catch (_) { }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lockedLocation]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-black text-white flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden relative">
      {/* Top Header Floating Status */}
      <header className="w-full flex items-center justify-between px-4 py-2.5 bg-black/50 border border-white/10 backdrop-blur-xl rounded-2xl shadow-lg z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl">🎡</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wide text-amber-400">
                LIVE RAFFLE STAGE
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                isStageActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {isStageActive ? '● Stage Active' : '○ Standby'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Venue: {activeLocation === 'ALL' ? 'Unified (All)' : activeLocation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            onClick={toggleMute}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 transition text-xs flex items-center gap-1.5"
            title="Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 transition"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Center Wheel Presentation */}
      <div className="flex-1 flex flex-col items-center justify-center w-full my-auto z-10 px-2 sm:px-4">
        {loading ? (
          <div className="text-lg text-slate-400 animate-pulse font-semibold">
            Loading attendees into wheel...
          </div>
        ) : allPrizesClaimed ? (
          <div className="text-center p-8 max-w-md bg-slate-900/80 rounded-3xl border border-amber-500/40 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-500">
            <div className="text-5xl mb-3">🏆🎉</div>
            <h2 className="text-2xl font-black text-amber-400 mb-2 tracking-wide">
              All Prizes Claimed!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Thank you for celebrating with us! All raffle prizes have been officially awarded.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
              ✨ Raffle Complete ✨
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center p-6 bg-slate-900/60 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-1">No Active Attendees</h2>
            <p className="text-xs text-slate-400">Check-in at the registration desk to enter the wheel.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-full">
            <RaffleWheel
              ref={wheelRef}
              segments={segments}
              onSpinEnd={(winner) => {
                setCurrentWinner(winner);
                setLockedSpotlightName(winner.name);
                setIsModalOpen(true);
              }}
              onSpinStateChange={setIsSpinning}
              onPointingSegmentChange={setPointingAttendee}
              duration={duration}
              power={power}
              fontSize={fontSize}
              wheelSize={Math.min(wheelSize, 720)}
              isViewer={true}
            />

            {/* Live Name Spotlight Banner */}
            <div className="mt-3 min-w-[280px] max-w-[90vw] px-6 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-xl backdrop-blur-xl flex items-center justify-center text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide truncate max-w-full">
                {lockedSpotlightName || pointingAttendee?.name || '---'}
              </div>
            </div>
          </div>
        )}

        {/* Current Prize Bar Below Wheel */}
        {!allPrizesClaimed && (
          <div className="mt-4 px-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-center max-w-md w-full">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Current Prize Draw</div>
            <div className="text-base sm:text-lg font-black text-amber-300 truncate">
              {selectedPrize.name}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <footer className="w-full text-center text-[11px] text-slate-500 py-2">
        AV-Raffle {APP_VERSION.tag} • Live Attendee Stream
      </footer>

      {/* Winner Celebration Modal */}
      <WinnerModal
        isOpen={isModalOpen}
        winner={currentWinner}
        prizeName={selectedPrize.name}
        isGrandPrize={selectedPrize.isGrand}
        isViewer={true}
        onConfirm={() => setIsModalOpen(false)}
        onRespin={() => setIsModalOpen(false)}
      />
    </main>
  );
}

