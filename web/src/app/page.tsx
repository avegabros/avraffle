import React from 'react';
import Link from 'next/link';
import { 
  Download, 
  Smartphone, 
  Award, 
  Sparkles, 
  QrCode, 
  ShieldCheck, 
  Camera, 
  Tv, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  ExternalLink
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_VERSION.package}`;

export const metadata = {
  title: `AV-Raffle ${APP_VERSION.tag} | Official Avega Enterprise Event & Raffle System`,
  description: 'Download the official AV-Raffle Android app for Emcee remote control, Registration Desk mugshot check-in, and Prize Management.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-red-800/15 rounded-full blur-[140px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-lg shadow-red-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-white text-lg tracking-wider">
                <span className="text-red-500">A</span><span className="text-amber-400">V</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-black tracking-wider text-white">
                AV-RAFFLE <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">{APP_VERSION.tag}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tracking-widest uppercase">
                Avega Bros Integrated Logistics
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/stage"
              className="hidden sm:flex px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-white/10 transition items-center gap-1.5"
            >
              <Tv className="w-4 h-4 text-amber-400" /> Wheel Stage
            </Link>
            <Link
              href="/admin"
              className="hidden md:flex px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-white/10 transition"
            >
              Admin Portal
            </Link>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-800 hover:bg-slate-700 border border-white/20 transition flex items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" /> Google Play
            </a>
            <a
              href="/downloads/avraffle-latest.apk"
              download={`AV-Raffle-${APP_VERSION.tag}.apk`}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> APK
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide mb-8 shadow-xl">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Official Android Companion for Avega Year-End Raffle ({APP_VERSION.tag})</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight max-w-4xl leading-[1.1]">
          The Complete Live <br />
          <span className="bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Enterprise Raffle Experience
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Real-time wheel synchronization for projectors, emcee mobile remote with claim locking, mugshot attendance check-in, and instant winner celebrations.
        </p>

        {/* Primary Download & Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {/* Button 1: Google Play Store Link */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-base shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a2.38 2.38 0 0 1-.61-.758V2.572c.18-.3.39-.56.61-.758zm11.233 11.234l2.457 2.457-11.45 6.467 8.993-8.924zm0-2.096L5.85 2.029l11.45 6.467-2.458 2.456zm3.568 2.05l2.748-1.55a1.77 1.77 0 0 0 0-3.084l-2.748-1.55-2.029 2.092 2.029 2.092z"/>
            </svg>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-wider leading-none text-slate-900">Get it on</div>
              <div className="text-sm font-black leading-tight">Google Play</div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-950/70 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* Button 2: Direct APK Download */}
          <a
            href="/downloads/avraffle-latest.apk"
            download={`AV-Raffle-${APP_VERSION.tag}.apk`}
            className="group px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-white font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Download className="w-5 h-5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold tracking-wider leading-none text-slate-400">Direct Install</div>
              <div className="text-sm font-black leading-tight">Download APK ({APP_VERSION.tag})</div>
            </div>
          </a>
        </div>

        <p className="mt-5 text-xs font-mono text-slate-500">
          Package ID: <code className="text-slate-400">{APP_VERSION.package}</code> • Version: <code className="text-amber-400">{APP_VERSION.full}</code> • Android 8.0+
        </p>
      </section>

      {/* Feature Grid / Modes */}
      <section className="relative z-10 py-16 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2 font-bold">
            Companion System Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white">
            Built for High-Stakes Live Events
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Emcee Remote */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-3xl border border-white/10 hover:border-amber-500/40 transition group shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-2xl font-black text-white mb-3">1. Emcee Remote</h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Spin the stage wheel from the palm of your hand. When a winner lands, the giant spin button safely locks to await winner attendance confirmation.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Live stage wheel spin trigger</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Safety lock prevents accidental double-spins</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>One-tap Absent (Respin) or Confirm & Claim</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Registration Desk */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-3xl border border-white/10 hover:border-red-500/40 transition group shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="text-2xl font-black text-white mb-3">2. Mugshot Check-In</h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Scan employee QR codes or search attendance lists. Snap attendee mugshots at check-in that automatically become their glowing winner portrait on screen!
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rapid QR code ticket scanner</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sharp WebP compressed mugshot storage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time wheel eligibility enrollment</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Prizes Team */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 rounded-3xl border border-white/10 hover:border-emerald-500/40 transition group shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Award className="w-7 h-7" />
            </div>
            <h4 className="text-2xl font-black text-white mb-3">3. Prizes Management</h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Catalog prizes on the fly with camera snapshots, manage quantities, toggle grand prizes, edit details, and target prizes to Tayud or Makati offices.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct mobile photo uploads for catalog</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-location scoping (Tayud / Makati / All)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tap-to-edit existing prize entries & photos</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Web Portals Section */}
      <section className="relative z-10 py-16 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left max-w-xl">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Projector & Stage Displays
            </div>
            <h3 className="text-3xl font-black text-white">
              Running the Projector or Checking Winning Tickets?
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Launch the 4K Canvas Wheel Stage on your big screen projector, check employee status, or browse past winners in the slideshow hall.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/stage"
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/30 transition flex items-center gap-2"
            >
              <span>Launch 4K Stage</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/slideshow"
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-white/10 transition"
            >
              Winners & Prizes Slideshow
            </Link>
            <Link
              href="/check"
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-white/10 transition"
            >
              Attendee Ticket Check
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6 bg-slate-950 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 <strong className="text-slate-400">Avega Bros Integrated Logistics, Inc.</strong> • Build {APP_VERSION.full}
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>Domain: https://avraffle.abas.ph</span>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google Play</a>
            <Link href="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-amber-400 transition">Terms of Service</Link>
            <Link href="/admin" className="hover:text-amber-400 transition">Admin Portal</Link>
            <Link href="/history" className="hover:text-amber-400 transition">Winners History</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
