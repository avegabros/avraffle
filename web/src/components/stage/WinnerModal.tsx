'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { WheelSegment } from '@/components/wheel/RaffleWheel';

interface WinnerModalProps {
  isOpen: boolean;
  winner: WheelSegment | null;
  prizeName?: string;
  isGrandPrize?: boolean;
  onConfirm: () => void;
  onRespin: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  isOpen,
  winner,
  prizeName = 'Regular Prize',
  isGrandPrize = false,
  onConfirm,
  onRespin,
}) => {
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
          {winner.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={winner.imagePath}
              alt={winner.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <span className="text-6xl font-black text-amber-500/80">
                {winner.name.charAt(0)}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                No Mugshot
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
        </div>
      </div>
    </div>
  );
};
