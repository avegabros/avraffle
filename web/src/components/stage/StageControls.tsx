'use client';

import React, { useState } from 'react';
import { Settings2, Volume2, VolumeX, Maximize2, Square, X } from 'lucide-react';

interface StageControlsProps {
  isMuted: boolean;
  toggleMute: () => void;
  showTopHeader: boolean;
  setShowTopHeader: (val: boolean) => void;
  showPrizeCard: boolean;
  setShowPrizeCard: (val: boolean) => void;
  isSpinning: boolean;
  onStopSpin?: () => void;
}

export const StageControls: React.FC<StageControlsProps> = ({
  isMuted,
  toggleMute,
  showTopHeader,
  setShowTopHeader,
  showPrizeCard,
  setShowPrizeCard,
  isSpinning,
  onStopSpin,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
      {/* If spinning: Styled Circular STOP button in header */}
      {isSpinning && onStopSpin && (
        <button
          onClick={onStopSpin}
          className="p-3 bg-red-600/90 hover:bg-red-500 text-white rounded-full border border-red-400/50 shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center justify-center animate-pulse"
          title="Stop Wheel"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>
      )}

      {/* Main Single Options Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full border border-white/20 shadow-xl backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center justify-center"
        title="Stage Options"
      >
        {isOpen ? <X className="w-5 h-5 text-slate-300" /> : <Settings2 className="w-5 h-5 text-amber-400" />}
      </button>

      {/* Options Popup Drawer */}
      {isOpen && (
        <div className="absolute top-14 right-0 w-64 bg-slate-900/95 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
              Stage Display Options
            </h4>
          </div>

          {/* Audio Mute Option */}
          <button
            onClick={toggleMute}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition text-xs font-semibold"
          >
            <span>Audio Sound Effects</span>
            {isMuted ? (
              <span className="flex items-center gap-1 text-red-400 font-bold"><VolumeX className="w-4 h-4" /> Muted</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-bold"><Volume2 className="w-4 h-4" /> Active</span>
            )}
          </button>

          {/* Fullscreen Option */}
          <button
            onClick={toggleFullscreen}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition text-xs font-semibold"
          >
            <span>Projector Fullscreen</span>
            <Maximize2 className="w-4 h-4 text-amber-400" />
          </button>

          {/* Toggle Top Header Banner */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 rounded-xl text-xs font-semibold">
            <span>Show Top Header</span>
            <input
              type="checkbox"
              checked={showTopHeader}
              onChange={(e) => setShowTopHeader(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Toggle Prize Spotlight Card */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 rounded-xl text-xs font-semibold">
            <span>Show Prize Showcase</span>
            <input
              type="checkbox"
              checked={showPrizeCard}
              onChange={(e) => setShowPrizeCard(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* Direct Link to Slideshow & Archive */}
          <div className="pt-2 border-t border-slate-700/80 flex flex-col gap-1.5">
            <a
              href="/slideshow"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-xs flex items-center justify-between"
            >
              <span>📽️ Open Prizes Slideshow</span>
              <span>↗</span>
            </a>
            <a
              href="/history"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-between"
            >
              <span>🏆 Past Winners Archive</span>
              <span>↗</span>
            </a>
          </div>

          <div className="pt-2 border-t border-slate-700/80 text-[11px] text-slate-400 text-center">
            Wheel physics & size configured in{' '}
            <a href="/admin" target="_blank" className="text-amber-400 hover:underline">
              /admin
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
