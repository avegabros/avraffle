'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { WheelSegment } from '@/components/wheel/RaffleWheel';

interface WinnerModalProps {
  isOpen: boolean;
  winner: WheelSegment | null;
  prizeName?: string;
  isGrandPrize?: boolean;
  isViewer?: boolean;
  onConfirm: () => void;
  onRespin: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  isOpen,
  winner,
  prizeName = 'Regular Prize',
  isGrandPrize = false,
  isViewer = false,
  onConfirm,
  onRespin,
}) => {
  // Resilience state for image rendering (retries and thumb fallback)
  const [imgErrorCount, setImgErrorCount] = useState<number>(0);
  const [isImgLoaded, setIsImgLoaded] = useState<boolean>(false);

  // Reset image load state whenever the winner changes or modal opens
  useEffect(() => {
    setImgErrorCount(0);
    setIsImgLoaded(false);
  }, [winner?.id, winner?.imagePath, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti cannon
      const end = Date.now() + 3 * 1000;
      const colors = ['#bb0000', '#ffffff', '#ffd700', '#00ffcc'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isOpen]);

  if (!isOpen || !winner) return null;

  // Determine which image URL candidate to attempt:
  // attempt 0: winner.imagePath
  // attempt 1: winner.thumbPath (if different from imagePath)
  // attempt 2: retry imagePath with cache-buster timestamp (in case of stale network hiccup/connection drop)
  const getActiveImgSrc = (): string | null => {
    if (imgErrorCount === 0) {
      return winner.imagePath || winner.thumbPath || null;
    } else if (imgErrorCount === 1) {
      if (winner.thumbPath && winner.thumbPath !== winner.imagePath) {
        return winner.thumbPath;
      }
      // If no distinct thumbPath, attempt cache-busted retry on original path
      const base = winner.imagePath || winner.thumbPath;
      if (!base) return null;
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}retry=1`;
    } else if (imgErrorCount === 2) {
      // Final attempt: cache-busted retry
      const base = winner.imagePath || winner.thumbPath;
      if (!base) return null;
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}retry=2`;
    }
    return null; // All retries exhausted, fall back to clean avatar badge
  };

  const currentImgSrc = getActiveImgSrc();

  const handleImageError = () => {
    setImgErrorCount((prev) => prev + 1);
  };

  const handleImageLoad = () => {
    setIsImgLoaded(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center text-white overflow-hidden">
        
        {/* Glowing Badge Header */}
        <div className="inline-block px-6 py-2 rounded-full font-bold tracking-widest text-sm uppercase mb-4 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 shadow-md">
          {isGrandPrize ? '🌟 GRAND PRIZE WINNER! 🌟' : '🎉 RAFFLE WINNER! 🎉'}
        </div>

        {/* Prize Name Announcement */}
        <h3 className="text-2xl font-semibold text-amber-400 mb-6 tracking-wide">
          {prizeName}
        </h3>

        {/* Winner Avatar / Mugshot Portrait */}
        <div className="relative mx-auto mb-6 w-48 h-48 rounded-full border-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] overflow-hidden bg-slate-800 flex items-center justify-center">
          {currentImgSrc ? (
            <>
              {/* Spinner placeholder while loading */}
              {!isImgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentImgSrc}
                src={currentImgSrc}
                alt={winner.name}
                loading="eager"
                decoding="async"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isImgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <span className="text-6xl font-black text-amber-500/80">
                {winner.name.charAt(0)}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                {winner.imagePath ? 'Mugshot Unavailable' : 'No Mugshot'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none" />
        </div>

        {/* Winner Name & Details */}
        <h2 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
          {winner.name}
        </h2>
        <p className="text-lg text-slate-300 font-medium">
          {winner.employeeId} {winner.department ? `• ${winner.department}` : ''}
        </p>

        {/* Action Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {isViewer ? (
            <div className="px-6 py-2.5 rounded-full bg-slate-800/80 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider animate-pulse">
              🎉 Official Winner Announcement • Live Sync
            </div>
          ) : (
            <>
              <button
                onClick={onRespin}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition"
              >
                Absent / Respin
              </button>
              <button
                onClick={onConfirm}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition"
              >
                Confirm & Claim Prize
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
