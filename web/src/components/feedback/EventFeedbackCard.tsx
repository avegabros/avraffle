'use client';

import React, { useState, useRef, useEffect } from 'react';

interface FeedbackProps {
  employeeId?: string;
  name?: string;
  location?: string;
}

export const EventFeedbackCard: React.FC<FeedbackProps> = ({
  employeeId,
  name,
  location = 'ALL',
}) => {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // The 8 requested categories - all listed by default
  const [categories, setCategories] = useState<{
    food: number;
    drinks: number;
    program: number;
    venue: number;
    raffle: number;
    decor: number;
    games: number;
    presentations: number;
  }>({
    food: 5,
    drinks: 5,
    program: 5,
    venue: 5,
    raffle: 5,
    decor: 5,
    games: 5,
    presentations: 5,
  });

  const categoryLabels: { key: keyof typeof categories; label: string; icon: string }[] = [
    { key: 'food', label: 'Food', icon: '🍲' },
    { key: 'drinks', label: 'Drinks', icon: '🍹' },
    { key: 'program', label: 'Program', icon: '🎤' },
    { key: 'venue', label: 'Venue', icon: '🏛️' },
    { key: 'raffle', label: 'Raffle', icon: '🎡' },
    { key: 'decor', label: 'Decor', icon: '✨' },
    { key: 'games', label: 'Games', icon: '🎯' },
    { key: 'presentations', label: 'Presentations', icon: '📊' },
  ];

  // Auto-save logic with debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = (updatedOverall?: number, updatedCats?: typeof categories, updatedComment?: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    setSaveStatus('saving');
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const curOverall = updatedOverall !== undefined ? updatedOverall : overallRating;
        const curCats = updatedCats || categories;
        const curComment = updatedComment !== undefined ? updatedComment : comment;

        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: curOverall,
            employeeId,
            name,
            location,
            foodRating: curCats.food,
            drinksRating: curCats.drinks,
            programRating: curCats.program,
            venueRating: curCats.venue,
            raffleRating: curCats.raffle,
            decorRating: curCats.decor,
            gamesRating: curCats.games,
            presentationsRating: curCats.presentations,
            comment: curComment,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('idle');
        }
      } catch {
        setSaveStatus('idle');
      }
    }, 600); // 600ms debounce
  };

  const handleOverallChange = (val: number) => {
    setOverallRating(val);
    triggerAutoSave(val);
  };

  const handleCategoryChange = (key: keyof typeof categories, val: number) => {
    const updated = { ...categories, [key]: val };
    setCategories(updated);
    triggerAutoSave(undefined, updated);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    triggerAutoSave(undefined, undefined, val);
  };

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Event Feedback
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          {saveStatus === 'saving' && (
            <span className="text-amber-400 flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-400 flex items-center gap-1">
              ✓ Saved!
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-slate-400">⚡ Auto-saves instantly</span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-300 font-medium mb-3">
        Tap the stars below to rate the event. Ratings save automatically!
      </p>

      {/* Main Overall 5-Star Rating - Responsive & No Overflow */}
      <div className="py-2.5 px-3 mb-4 bg-slate-950/70 rounded-xl border border-white/5 flex flex-col items-center justify-center">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Overall Experience
        </div>
        <div className="flex items-center justify-center gap-1.5 sm:gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleOverallChange(star)}
              className="text-2xl sm:text-3xl p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer leading-none"
            >
              <span className={star <= overallRating ? 'text-amber-400' : 'text-slate-600'}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* All 8 Categories Listed Cleanly */}
      <div className="space-y-2 mb-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Category Ratings
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categoryLabels.map(({ key, label, icon }) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 bg-slate-950/50 rounded-xl border border-white/5"
            >
              <span className="flex items-center gap-2 font-semibold text-slate-300 text-xs">
                <span>{icon}</span> {label}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleCategoryChange(key, num)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-90"
                    title={`${num} stars for ${label}`}
                  >
                    <span
                      className={`text-sm sm:text-base leading-none ${
                        categories[key] >= num ? 'text-amber-400 font-bold' : 'text-slate-700'
                      }`}
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Shoutout / Comment Field */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Suggestions or Shoutouts for the Committee (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="Write your note here... (automatically saves)"
          value={comment}
          onChange={handleCommentChange}
          className="w-full text-xs p-3 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
        />
      </div>
    </div>
  );
};
