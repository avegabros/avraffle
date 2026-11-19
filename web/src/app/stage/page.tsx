'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RaffleWheel, WheelSegment, RaffleWheelHandle } from '@/components/wheel/RaffleWheel';
import { WinnerModal } from '@/components/stage/WinnerModal';
import { StageControls } from '@/components/stage/StageControls';
import { soundManager } from '@/lib/sound';

export default function StagePage() {
  const wheelRef = useRef<RaffleWheelHandle | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isMaster, setIsMaster] = useState(true);
  const isMasterRef = useRef(true);
  useEffect(() => {
    isMasterRef.current = isMaster;
  }, [isMaster]);

  const sessionIdRef = useRef<string>('');
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    let currentId = sessionStorage.getItem('raffle_stage_session_id');
    if (!currentId) {
      currentId = 'stage_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('raffle_stage_session_id', currentId);
    }
    sessionIdRef.current = currentId;
    setSessionId(currentId);
  }, []);

  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWinner, setCurrentWinner] = useState<WheelSegment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pointingAttendee, setPointingAttendee] = useState<WheelSegment | null>(null);
  const [lockedSpotlightName, setLockedSpotlightName] = useState<string | null>(null);

  // Hidden by default top header, Show prize card by default
  const [showTopHeader, setShowTopHeader] = useState(false);
  const [showPrizeCard, setShowPrizeCard] = useState(true);

  // Settings loaded from /api/settings
  const [duration, setDuration] = useState(8);
  const [power, setPower] = useState<'low' | 'medium' | 'high'>('high');
  const [fontSize, setFontSize] = useState(13);
  const [wheelSize, setWheelSize] = useState(900);
  const [allowManualSpin, setAllowManualSpin] = useState(false);

  const [allPrizesClaimed, setAllPrizesClaimed] = useState(false);

  const [selectedPrize, setSelectedPrize] = useState<{ id?: number; name: string; isGrand: boolean; imagePath?: string | null }>({
    name: 'Loading Prize...',
    isGrand: false,
    imagePath: null,
  });

  const [activeLocation, setActiveLocation] = useState<string>('ALL');
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [activeEventName, setActiveEventName] = useState<string>('Unified Event');

  const loadWheelData = async (loc = activeLocation, yr = activeYear) => {
    try {
      const res = await fetch(`/api/wheel?location=${encodeURIComponent(loc)}&year=${encodeURIComponent(yr)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.segments)) {
        setSegments(data.segments);
      }
      if (typeof data.allPrizesClaimed === 'boolean') {
        setAllPrizesClaimed(data.allPrizesClaimed);
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
        const evName = data.activeEventName || 'Unified Event';
        currentLoc = loc;
        currentYr = yr;
        if (data.duration) setDuration(data.duration);
        if (data.power) setPower(data.power);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.wheelSize) setWheelSize(data.wheelSize);
        setActiveLocation(loc);
        setActiveYear(yr);
        setActiveEventName(evName);
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
    let lastSeenTrigger = -1;
    let lastSeenSettingsUpdate = 0;
    let lastSeenReloadGuests = 0;
    let heartbeatTick = 0;

    const pollInterval = 500;

    const interval = setInterval(async () => {
      try {
        heartbeatTick++;
        // Stage heartbeat ping every ~2 seconds (every 4 ticks of 500ms)
        const sendHeartbeat = heartbeatTick % 4 === 1;

        const currentSessionId = sessionIdRef.current;
        const [stateRes, settingsRes] = await Promise.all([
          fetch(`/api/wheel/state?sessionId=${encodeURIComponent(currentSessionId)}`),
          fetch('/api/settings'),
          sendHeartbeat && currentSessionId
            ? fetch('/api/wheel/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'STAGE_HEARTBEAT', sessionId: currentSessionId }),
              })
                .then((r) => r.json())
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        if (stateRes.ok) {
          const data = await stateRes.json();
          const state = data.state;
          if (typeof data.isMaster === 'boolean') {
            setIsMaster(data.isMaster);
          }
          if (state) {
            // Initialize lastSeenTrigger on first poll so navigating to /stage doesn't fire stale past spins
            if (lastSeenTrigger === -1) {
              lastSeenTrigger = state.spinTriggerCount ?? 0;
            }

            // Reload wheel attendees when remote confirms a winner
            if (state.reloadGuestsCount && state.reloadGuestsCount > lastSeenReloadGuests) {
              lastSeenReloadGuests = state.reloadGuestsCount;
              loadWheelData(currentLoc, currentYr);
            }

            // Sync allPrizesClaimed from state
            if (state.allPrizesClaimed !== undefined) {
              setAllPrizesClaimed(Boolean(state.allPrizesClaimed));
            } else if (state.prizeName === 'All Prizes Claimed!') {
              setAllPrizesClaimed(true);
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
              setLockedSpotlightName(null);
              
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

  const handleTakeOverMaster = async () => {
    try {
      const res = await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TAKE_OVER_MASTER', sessionId }),
      });
      if (res.ok) {
        setIsMaster(true);
      }
    } catch (e) {
      console.error('Failed to take over master lock:', e);
    }
  };

  const handleSpinStart = async () => {
    if (!isMasterRef.current) return;
    if (segments.length === 0 || isSpinning) return;
    // Pick winner index upfront so all viewer screens (/raffle) and the stage wheel stop on the exact same person
    const winnerIdx = Math.floor(Math.random() * segments.length);
    const targetWinner = segments[winnerIdx];
    setLockedSpotlightName(null);

    // 1. Immediately spin local wheel to the selected winner
    wheelRef.current?.spinToWinner(winnerIdx);

    // 2. Broadcast spin trigger to /api/wheel/state so /raffle viewers spin synchronously
    try {
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SPIN',
          sessionId,
          prizeName: selectedPrize.name,
          prizeImagePath: selectedPrize.imagePath,
          isGrand: selectedPrize.isGrand,
          grandPrizeId: selectedPrize.id,
          targetWinnerId: targetWinner?.id,
          location: activeLocation,
          eventYear: activeYear,
        }),
      });
    } catch (err) {
      console.error('Failed to broadcast spin:', err);
    }
  };

  const handleSpinEnd = async (winner: WheelSegment) => {
    setCurrentWinner(winner);
    setLockedSpotlightName(winner.name);
    setIsModalOpen(true);

    if (!isMasterRef.current) return;

    try {
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WINNER_ANNOUNCED',
          sessionId,
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

  const handleStopSpin = async () => {
    wheelRef.current?.resetWheel();
    setIsSpinning(false);
    try {
      await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP_SPIN', sessionId }),
      });
    } catch (_) {}
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
      {/* Top Secondary Display Warning / Take-Over Banner */}
      {!isMaster && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-900/95 border border-amber-500/50 text-amber-200 text-xs sm:text-sm font-semibold shadow-[0_4px_25px_rgba(245,158,11,0.25)] backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping mr-1" />
          <span>Secondary Display (Master Stage Active on Another Window)</span>
          <button
            onClick={handleTakeOverMaster}
            className="ml-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-full text-xs shadow transition-all cursor-pointer"
          >
            Take Over as Master
          </button>
        </div>
      )}

      {/* Top Right Options & Controls */}
      <StageControls
        isMuted={isMuted}
        toggleMute={toggleMute}
        showTopHeader={showTopHeader}
        setShowTopHeader={setShowTopHeader}
        showPrizeCard={showPrizeCard}
        setShowPrizeCard={setShowPrizeCard}
        isSpinning={isSpinning}
        onStopSpin={isMaster ? handleStopSpin : undefined}
        activeLocation={activeLocation}
        onLocationChange={handleLocationChange}
        isViewer={false}
        allowManualSpin={allowManualSpin}
        onToggleManualSpin={setAllowManualSpin}
      />

      {/* Stage Header Banner (Hidden by default) */}
      {showTopHeader && (
        <header className="w-full flex items-center justify-between px-8 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-2xl shadow-lg z-20 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              AV-RAFFLE
            </div>
            <span className="text-xs uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold tracking-wider">
              🎉 {activeEventName} ({activeYear})
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
          ) : allPrizesClaimed ? (
            <div className="text-center p-8 lg:p-10 max-w-xl bg-slate-900/80 rounded-3xl border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] backdrop-blur-xl animate-in zoom-in-95 duration-500">
              <div className="text-5xl lg:text-6xl mb-3">🏆🎉</div>
              <h2 className="text-3xl font-black text-amber-400 mb-2 tracking-wide">
                All Prizes Claimed!
              </h2>
              <p className="text-sm lg:text-base text-slate-300 font-medium leading-relaxed">
                Thank you for celebrating with us! All raffle prizes have been officially awarded.
              </p>
              
              {/* Event Feedback QR / Call to Action */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-left">
                <div>
                  <div className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                    <span>⭐</span> Tell Us How We Did!
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Scan or open <span className="text-amber-400 font-mono font-bold">/check</span> on your phone to rate food, drinks, games & the show!
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-black text-amber-400 flex-shrink-0">
                  📱✨
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                ✨ Raffle Complete ✨
              </div>
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
                onSpinStart={isMaster && allowManualSpin ? handleSpinStart : undefined}
                onSpinEnd={handleSpinEnd}
                onSpinStateChange={setIsSpinning}
                onPointingSegmentChange={setPointingAttendee}
                duration={duration}
                power={power}
                fontSize={fontSize}
                wheelSize={showPrizeCard ? Math.min(wheelSize, 780) : Math.min(wheelSize, 850)}
                isViewer={!isMaster || !allowManualSpin}
              />

              {/* Dynamic Live Attendee Spotlight Banner */}
              <div className="mt-3 min-w-[320px] max-w-[90vw] px-8 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-xl flex items-center justify-center text-center transition-all duration-100">
                <div className="text-2xl lg:text-3xl font-black text-amber-400 tracking-wide truncate max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {lockedSpotlightName || pointingAttendee?.name || '---'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Prize Spotlight Panel */}
        {showPrizeCard && !allPrizesClaimed && (
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
