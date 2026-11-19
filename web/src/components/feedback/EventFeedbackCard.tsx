'use client';

import React, { useState, useRef } from 'react';

interface FeedbackProps {
  employeeId?: string;
  name?: string;
  location?: string;
}

interface StepMeta {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

const STEPS: StepMeta[] = [
  { key: 'overall', title: 'Overall Experience', subtitle: 'How is your overall event experience so far?', icon: '⭐' },
  { key: 'food', title: 'Food & Catering', subtitle: 'How is the food quality and selection?', icon: '🍲' },
  { key: 'drinks', title: 'Drinks & Bar', subtitle: 'How are the beverages, juices, and drinks?', icon: '🍹' },
  { key: 'program', title: 'Program & Emcees', subtitle: 'How is the event flow, hosting, and program?', icon: '🎤' },
  { key: 'venue', title: 'Venue & Comfort', subtitle: 'How is the venue space, seating, and ambiance?', icon: '🏛️' },
  { key: 'raffle', title: 'Raffle & Prizes', subtitle: 'Excited for the prizes and wheel draws?', icon: '🎡' },
  { key: 'decor', title: 'Decor & Theme', subtitle: 'How do you like the stage and theme decorations?', icon: '✨' },
  { key: 'games', title: 'Games & Activities', subtitle: 'How engaging and fun were the party games?', icon: '🎯' },
  { key: 'presentations', title: 'Presentations & Show', subtitle: 'How did you enjoy the performances?', icon: '📊' },
];

export const EventFeedbackCard: React.FC<FeedbackProps> = ({
  employeeId,
  name,
  location = 'ALL',
}) => {
  // Current active step: 0 to STEPS.length - 1 (ratings), STEPS.length = comment, STEPS.length + 1 = completed
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Store ratings starting as null (unselected)
  const [ratings, setRatings] = useState<Record<string, number | null>>({
    overall: null,
    food: null,
    drinks: null,
    program: null,
    venue: null,
    raffle: null,
    decor: null,
    games: null,
    presentations: null,
  });

  const [comment, setComment] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save helper
  const saveToServer = async (updatedRatings: typeof ratings, updatedComment?: string) => {
    try {
      setSaveStatus('saving');
      const payload: Record<string, unknown> = {
        employeeId,
        name,
        location,
        rating: updatedRatings.overall || 5, // Fallback if overall not set
        foodRating: updatedRatings.food,
        drinksRating: updatedRatings.drinks,
        programRating: updatedRatings.program,
        venueRating: updatedRatings.venue,
        raffleRating: updatedRatings.raffle,
        decorRating: updatedRatings.decor,
        gamesRating: updatedRatings.games,
        presentationsRating: updatedRatings.presentations,
      };

      if (updatedComment !== undefined) {
        payload.comment = updatedComment;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('idle');
      }
    } catch {
      setSaveStatus('idle');
    }
  };

  // When a star is tapped: highlight star, save, and auto-advance after 280ms
  const handleRate = (score: number) => {
    const curStepMeta = STEPS[currentStep];
    if (!curStepMeta) return;

    const updated = { ...ratings, [curStepMeta.key]: score };
    setRatings(updated);
    saveToServer(updated);

    // Auto-advance to next step
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 280);
  };

  const handleSkip = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveToServer(ratings, val);
    }, 600);
  };

  const handleFinish = () => {
    saveToServer(ratings, comment);
    setCurrentStep(STEPS.length + 1);
  };

  // Total questions count: 9 categories + 1 comment step
  const totalSteps = STEPS.length + 1;
  const isCommentStep = currentStep === STEPS.length;
  const isCompletedStep = currentStep > STEPS.length;

  if (isCompletedStep) {
    return (
      <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl text-center text-white animate-in zoom-in-95 duration-300">
        <div className="text-4xl mb-2">🎉🌟</div>
        <h3 className="text-base sm:text-lg font-black text-emerald-400">
          Thank you for your feedback, {name || 'Avegan'}!
        </h3>
        <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
          Your input has been recorded and helps us make future Avega company events even better. Enjoy the rest of the celebration!
        </p>
        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="mt-4 px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
        >
          Review or Change Responses ↺
        </button>
      </div>
    );
  }

  const activeMeta = STEPS[currentStep];
  const currentVal = activeMeta ? ratings[activeMeta.key] : null;

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-xl text-white">
      {/* Header with Step Indicator & Auto-Save Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">⭐</span>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Event Feedback
          </span>
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
            {currentStep + 1} of {totalSteps}
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
            <span className="text-slate-400 text-[10px]">⚡ Auto-saves</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* STEP: Rating Question */}
      {!isCommentStep ? (
        <div className="py-2 text-center animate-in fade-in slide-in-from-right-4 duration-200" key={activeMeta.key}>
          <div className="text-3xl mb-1.5">{activeMeta.icon}</div>
          <h4 className="text-sm sm:text-base font-extrabold text-white">
            {activeMeta.title}
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 mb-4">
            {activeMeta.subtitle}
          </p>

          {/* 5 Big Comfortable Star Buttons (Hollow until tapped) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = currentVal !== null && currentVal >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRate(star)}
                  className="p-1 sm:p-2 transition-transform hover:scale-125 active:scale-90 cursor-pointer leading-none"
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <span
                    className={`text-3xl sm:text-4xl leading-none transition-colors duration-150 ${
                      isSelected
                        ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'text-slate-600 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-amber-400/80 font-medium mt-1">
            Tap a star to rate & auto-advance
          </div>

          {/* Nav Controls: Back / Skip */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/5 text-xs">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-slate-400 hover:text-white font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                ← Back
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleSkip}
              className="text-slate-400 hover:text-amber-400 font-semibold transition cursor-pointer"
            >
              Skip →
            </button>
          </div>
        </div>
      ) : (
        /* STEP: Optional Suggestions / Shoutouts */
        <div className="py-2 text-center animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="text-3xl mb-1.5">💬</div>
          <h4 className="text-sm sm:text-base font-extrabold text-white">
            Shoutouts & Suggestions (Optional)
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 mb-3">
            Want to thank the organizers or suggest ideas for next year?
          </p>

          <textarea
            rows={3}
            placeholder="Write your note here... (automatically saves)"
            value={comment}
            onChange={handleCommentChange}
            className="w-full text-xs p-3 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />

          <div className="flex items-center justify-between mt-4 text-xs">
            <button
              type="button"
              onClick={handleBack}
              className="text-slate-400 hover:text-white font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer"
            >
              Finish Review ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
