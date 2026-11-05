'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  badgeTitle?: string;
}

export const AdminNav: React.FC<AdminNavProps> = ({ badgeTitle }) => {
  const pathname = usePathname();

  const navLinks = [
    { label: '📊 Overview', href: '/admin' },
    { label: '👥 Attendees', href: '/admin/guests' },
    { label: '🎁 Prizes', href: '/admin/prizes' },
    { label: '🔐 Users', href: '/admin/users' },
    { label: '🏆 Live & History', href: '/history' },
    { label: '📽️ Slideshow', href: '/slideshow' },
    { label: '📦 Archive & ABAS', href: '/admin/archive' },
  ];

  return (
    <header className="px-6 lg:px-8 py-3.5 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-xl font-black text-amber-500 hover:opacity-90 flex items-center gap-1.5">
          <span>🎡</span> AV-RAFFLE
        </Link>
        {badgeTitle && (
          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {badgeTitle}
          </span>
        )}
      </div>

      <nav className="flex items-center gap-1.5 lg:gap-2 flex-wrap text-xs font-bold">
        {navLinks.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-xl transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="h-4 w-[1px] bg-white/20 mx-1 hidden sm:block" />

        <Link
          href="/stage"
          target="_blank"
          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center gap-1"
        >
          <span>📺 Stage</span>
          <span className="text-[10px]">↗</span>
        </Link>

        <Link
          href="/check"
          target="_blank"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition hidden md:inline-block"
          title="Attendee Self-Check Portal"
        >
          🎟️ Check Portal
        </Link>
      </nav>
    </header>
  );
};
