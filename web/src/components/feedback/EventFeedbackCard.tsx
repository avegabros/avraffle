'use client';

import React, { useState } from 'react';

interface FeedbackProps {
  employeeId?: string;
  name?: string;
  location?: string;
  onSubmitted?: () => void;
}

export const EventFeedbackCard: React.FC<FeedbackProps> = ({
  employeeId,
  name,
  location = 'ALL',
  onSubmitted,
}) => {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');

  // The 8 requested categories
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

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

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

  const handleRatingChange = (key: keyof typeof categories, val: number) => {
    setCategories((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: overallRating,
          employeeId,
          name,
          location,
          foodRating: categories.food,
          drinksRating: categories.drinks,
          programRating: categories.program,
          venueRating: categories.venue,
          raffleRating: categories.raffle,
          decorRating: categories.decor,
          gamesRating: categories.games,
          presentationsRating: categories.presentations,
          comment,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onSubmitted?.();
      }
    } catch (e) {
      console.error('Feedback submit error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/40 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="text-3xl mb-1">🎉🌟</div>
        <h4 className="text-sm font-bold text-emerald-300">Thank you for your feedback!</h4>
        <p className="text-xs text-slate-400 mt-1">Your ratings help make future Avega events even better.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg text-white animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Event Feedback
          </span>
        </div>
        <span className="text-[10px] text-slate-400">10-sec review</span>
      </div>

      <p className="text-xs text-slate-300 font-medium mb-3">
        How is your experience at the event so far?
      </p>

      {/* Quick 5-Star / Emoji Bar */}
      <div className="flex items-center justify-center gap-2 py-2 mb-3 bg-slate-950/60 rounded-xl border border-white/5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setOverallRating(star)}
            className="text-2xl sm:text-3xl p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer"
          >
            {star <= overallRating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Expand/Collapse Detailed Categories Toggle */}
      <div className="mb-3 text-center">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] font-bold text-amber-400/90 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
        >
          {showDetails ? 'Hide Category Ratings ▲' : 'Rate Food, Drinks, Games & more (Optional) ▼'}
        </button>
      </div>

      {/* Expanded 8 Categories */}
      {showDetails && (
        <div className="space-y-2 mb-4 p-3 bg-slate-950/80 rounded-xl border border-white/10 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categoryLabels.map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between px-2 py-1 bg-slate-900 rounded-lg">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
                  <span>{icon}</span> {label}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleRatingChange(key, num)}
                      className={`text-xs px-1.5 py-0.5 rounded transition ${
                        categories[key] >= num ? 'text-amber-400 font-bold' : 'text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <textarea
              rows={2}
              placeholder="Any shoutout or suggestion for the committee? (Optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {/* Quick Submit Button */}
      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Submitting...' : 'Send Feedback ✨'}
      </button>
    </div>
  );
};
