'use client';

import React, { useState, useEffect } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';

interface FeedbackItem {
  id: number;
  rating: number;
  employeeId: string | null;
  name: string | null;
  location: string;
  foodRating: number | null;
  drinksRating: number | null;
  programRating: number | null;
  venueRating: number | null;
  raffleRating: number | null;
  decorRating: number | null;
  gamesRating: number | null;
  presentationsRating: number | null;
  comment: string | null;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [avgOverall, setAvgOverall] = useState<number>(0);
  const [catStats, setCatStats] = useState<Record<string, { total: number; count: number; avg: number }>>({});
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success) {
        setTotalCount(data.totalCount);
        setAvgOverall(data.avgOverall);
        setCatStats(data.catStats || {});
        setFeedbackList(data.feedback || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const categories = [
    { key: 'food', label: 'Food', icon: '🍲' },
    { key: 'drinks', label: 'Drinks', icon: '🍹' },
    { key: 'program', label: 'Program', icon: '🎤' },
    { key: 'venue', label: 'Venue', icon: '🏛️' },
    { key: 'raffle', label: 'Raffle', icon: '🎡' },
    { key: 'decor', label: 'Decor', icon: '✨' },
    { key: 'games', label: 'Games', icon: '🎯' },
    { key: 'presentations', label: 'Presentations', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      <AdminNav badgeTitle="Feedback & Ratings" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-amber-400 tracking-tight flex items-center gap-2">
              <span>⭐</span> Event Ratings & Feedback
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live satisfaction scores and category reviews collected from attendees.
            </p>
          </div>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-white/10 transition self-start md:self-auto cursor-pointer"
          >
            🔄 Refresh Live Stats
          </button>
        </div>

        {/* Hero Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Average Overall Rating</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl lg:text-5xl font-black text-white">{avgOverall || '0.0'}</span>
              <span className="text-amber-400 text-2xl font-bold">/ 5.0</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
              {'⭐'.repeat(Math.round(avgOverall || 0))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Reviews Submitted</span>
            <div className="text-4xl lg:text-5xl font-black text-white mt-2">{totalCount}</div>
            <div className="mt-2 text-xs text-emerald-400 font-semibold">Active attendee responses</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Turnover Performance</span>
            <div className="text-4xl lg:text-5xl font-black text-emerald-400 mt-2">
              {totalCount > 0 ? 'High' : 'Awaiting'}
            </div>
            <div className="mt-2 text-xs text-slate-400">Embedded in attendee check & stage</div>
          </div>
        </div>

        {/* Category Breakdown Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span>📊</span> Category Performance (8 Core Categories)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map(({ key, label, icon }) => {
              const stat = catStats[key];
              const score = stat?.avg || 0;
              return (
                <div key={key} className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs font-bold text-amber-400">{score ? `${score} ★` : '---'}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{label}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {stat?.count ?? 0} rated
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback List & Comments */}
        <div>
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span>💬</span> Recent Feedback & Comments
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading reviews...</div>
          ) : feedbackList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-white/5">
              No feedback submitted yet. Attendees will see the review card when checking status or upon claiming prizes.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-amber-400 font-bold text-sm">{'⭐'.repeat(item.rating)}</span>
                      <strong className="text-white text-sm">{item.name || item.employeeId || 'Anonymous Attendee'}</strong>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">
                        {item.location}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        &quot;{item.comment}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
