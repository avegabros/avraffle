'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Star, RefreshCw, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface PrizeOption {
  id: number;
  name: string;
  quantity: number;
  priority?: number;
  isGrandPrize: boolean;
  imagePath?: string | null;
}

interface PrizeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLocation?: string;
  activeYear?: number;
  currentPrizeName?: string;
  onPrizeSelected?: (prize: { name: string; isGrand: boolean; id?: number; imagePath?: string | null }) => void;
}

export const PrizeSelectorModal: React.FC<PrizeSelectorModalProps> = ({
  isOpen,
  onClose,
  activeLocation = 'ALL',
  activeYear = 2026,
  currentPrizeName = '',
  onPrizeSelected,
}) => {
  const [regularPrizes, setRegularPrizes] = useState<PrizeOption[]>([]);
  const [grandPrizes, setGrandPrizes] = useState<PrizeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchAvailablePrizes = async () => {
    setLoading(true);
    try {
      const locParam = activeLocation && activeLocation !== 'ALL' ? `?location=${activeLocation}` : '';
      const res = await fetch(`/api/wheel${locParam}`);
      if (res.ok) {
        const data = await res.json();
        setRegularPrizes(data.regularPrizes || []);
        setGrandPrizes(data.grandPrizes || []);
      }
    } catch (err) {
      console.error('Failed to load prizes for selection:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailablePrizes();
    }
  }, [isOpen, activeLocation, activeYear]);

  const handleSelectPrize = async (p: PrizeOption) => {
    setUpdating(true);
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
          location: activeLocation,
        }),
      });
      if (res.ok) {
        onPrizeSelected?.({
          name: p.name,
          isGrand: p.isGrandPrize,
          id: p.id,
          imagePath: p.imagePath || null,
        });
        onClose();
      }
    } catch (err) {
      console.error('Failed to set prize:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAutoQueue = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/wheel/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_TO_AUTO_QUEUE',
          location: activeLocation,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const state = data?.state;
        if (state) {
          onPrizeSelected?.({
            name: state.prizeName,
            isGrand: Boolean(state.isGrand),
            id: state.grandPrizeId,
            imagePath: state.prizeImagePath,
          });
        }
        onClose();
      }
    } catch (err) {
      console.error('Failed to reset to auto queue:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎁</span>
            <div>
              <h3 className="font-extrabold text-base text-white">Select Current Live Prize</h3>
              <p className="text-xs text-slate-400">
                Scope: <span className="font-bold text-amber-400 uppercase">{activeLocation}</span> · Syncs live to stage & phones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Auto-Queue Action */}
          <button
            onClick={handleAutoQueue}
            disabled={updating}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-cyan-900/40 to-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 text-left transition flex items-center justify-between group active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                <RefreshCw className={`w-5 h-5 ${updating ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="font-black text-sm text-white group-hover:text-cyan-300 transition">
                  ⚡ Auto-Queue by Priority
                </div>
                <div className="text-xs text-slate-400">
                  Automatically pulls highest priority available prize
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
          </button>

          {loading ? (
            <div className="py-12 text-center text-slate-500 animate-pulse text-sm">
              Loading available prizes...
            </div>
          ) : (
            <>
              {/* Regular Prizes */}
              {regularPrizes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 px-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Regular Prizes ({regularPrizes.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {regularPrizes.map((p) => {
                      const isCurrent = currentPrizeName === p.name;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPrize(p)}
                          disabled={updating}
                          className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between group cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-950/50 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                              : 'bg-slate-800/60 hover:bg-slate-800 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                              <Gift className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{p.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Qty: <span className="text-emerald-400 font-bold">{p.quantity}</span>
                                {p.priority !== undefined && ` · Priority: ${p.priority}`}
                              </div>
                            </div>
                          </div>
                          {isCurrent ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grand Prizes */}
              {grandPrizes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Grand Prizes ({grandPrizes.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {grandPrizes.map((p) => {
                      const isCurrent = currentPrizeName === p.name;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPrize(p)}
                          disabled={updating}
                          className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between group cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-950/50 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                              : 'bg-slate-800/60 hover:bg-slate-800 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isCurrent ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                              <Star className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{p.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Qty: <span className="text-amber-400 font-bold">{p.quantity}</span>
                                {p.priority !== undefined && ` · Priority: ${p.priority}`}
                              </div>
                            </div>
                          </div>
                          {isCurrent ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {regularPrizes.length === 0 && grandPrizes.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-sm italic">
                  No active prizes available for {activeLocation}. Add prizes in Admin Panel.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
