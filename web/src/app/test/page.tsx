'use client';

import React, { useState, useRef } from 'react';
import { Play, Square, Activity, Users, Clock, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface StageResult {
  viewers: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  throughput: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  statusCodes: Record<string, number>;
}

export default function LoadTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTier, setCurrentTier] = useState<number | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<number[]>([50, 100, 200, 300]);
  const [tierDuration, setTierDuration] = useState<number>(10);
  const [liveStats, setLiveStats] = useState({ requests: 0, successes: 0, errors: 0, currentRps: 0 });
  const [results, setResults] = useState<StageResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleTier = (t: number) => {
    if (selectedTiers.includes(t)) {
      if (selectedTiers.length > 1) setSelectedTiers(selectedTiers.filter((x) => x !== t));
    } else {
      setSelectedTiers([...selectedTiers, t].sort((a, b) => a - b));
    }
  };

  const runViewerSimulation = async (
    viewerId: number,
    stopTime: number,
    signal: AbortSignal,
    counters: { reqs: number; succ: number; errs: number; latencies: number[]; statusCodes: Record<string, number> }
  ) => {
    const doReq = async (url: string) => {
      if (signal.aborted) return;
      const start = performance.now();
      try {
        const res = await fetch(url, { signal, cache: 'no-store' });
        const latency = performance.now() - start;
        counters.reqs++;
        counters.latencies.push(latency);
        counters.statusCodes[res.status] = (counters.statusCodes[res.status] || 0) + 1;
        if (res.ok) {
          counters.succ++;
        } else {
          counters.errs++;
        }
      } catch (err: unknown) {
        if (signal.aborted) return;
        counters.reqs++;
        counters.errs++;
        const code = (err as { name?: string }).name === 'AbortError' ? 'ABORT' : 'FETCH_ERR';
        counters.statusCodes[code] = (counters.statusCodes[code] || 0) + 1;
      }
    };

    // Initial load fetch
    await doReq('/api/wheel?location=ALL&year=2026');

    // Continuous polling loop
    while (Date.now() < stopTime && !signal.aborted) {
      await doReq('/api/wheel/state');
      const jitter = 1100 + Math.random() * 200;
      await new Promise((r) => setTimeout(r, jitter));
    }
  };

  const handleStartTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResults([]);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (const tier of selectedTiers) {
      if (signal.aborted) break;
      setCurrentTier(tier);

      const counters = {
        reqs: 0,
        succ: 0,
        errs: 0,
        latencies: [] as number[],
        statusCodes: {} as Record<string, number>,
      };

      const startTime = Date.now();
      const stopTime = startTime + tierDuration * 1000;

      // Realtime live stats updater
      const liveInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setLiveStats({
          requests: counters.reqs,
          successes: counters.succ,
          errors: counters.errs,
          currentRps: elapsed > 0 ? parseFloat((counters.reqs / elapsed).toFixed(1)) : 0,
        });
      }, 300);

      const viewerPromises: Promise<void>[] = [];
      for (let i = 0; i < tier; i++) {
        const joinDelay = Math.random() * 1000;
        viewerPromises.push(
          new Promise((resolve) => setTimeout(resolve, joinDelay)).then(() =>
            runViewerSimulation(i, stopTime, signal, counters)
          )
        );
      }

      await Promise.all(viewerPromises);
      clearInterval(liveInterval);

      if (signal.aborted) break;

      const totalTimeSec = (Date.now() - startTime) / 1000;
      counters.latencies.sort((a, b) => a - b);
      const p50 = counters.latencies[Math.floor(counters.latencies.length * 0.5)] || 0;
      const p95 = counters.latencies[Math.floor(counters.latencies.length * 0.95)] || 0;
      const p99 = counters.latencies[Math.floor(counters.latencies.length * 0.99)] || 0;
      const avg = counters.latencies.length
        ? counters.latencies.reduce((a, b) => a + b, 0) / counters.latencies.length
        : 0;

      const stageRes: StageResult = {
        viewers: tier,
        totalRequests: counters.reqs,
        successRequests: counters.succ,
        failedRequests: counters.errs,
        throughput: parseFloat((counters.reqs / totalTimeSec).toFixed(1)),
        avgLatency: parseFloat(avg.toFixed(1)),
        p50: parseFloat(p50.toFixed(1)),
        p95: parseFloat(p95.toFixed(1)),
        p99: parseFloat(p99.toFixed(1)),
        statusCodes: counters.statusCodes,
      };

      setResults((prev) => [...prev, stageRes]);

      // Brief cool down between tiers
      await new Promise((r) => setTimeout(r, 1500));
    }

    setIsRunning(false);
    setCurrentTier(null);
  };

  const handleStopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setCurrentTier(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚡</span>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Live Load & Stress Tester
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Simulates real-world attendee mobile devices connecting, fetching wheel segments, and polling live state.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={handleStopTest}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold transition shadow-lg"
              >
                <Square className="w-4 h-4 fill-white" /> Stop Test
              </button>
            ) : (
              <button
                onClick={handleStartTest}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 active:scale-95 text-white font-black tracking-wide transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <Play className="w-4 h-4 fill-white" /> Start Benchmark
              </button>
            )}
          </div>
        </header>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Concurrent Viewer Tiers
            </label>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 150, 200, 300, 400].map((t) => (
                <button
                  key={t}
                  disabled={isRunning}
                  onClick={() => toggleTier(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                    selectedTiers.includes(t)
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t} Viewers
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> Duration Per Stage
            </label>
            <div className="flex items-center gap-3">
              {[5, 10, 15, 20].map((sec) => (
                <button
                  key={sec}
                  disabled={isRunning}
                  onClick={() => setTierDuration(sec)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                    tierDuration === sec
                      ? 'bg-blue-500 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Total estimated duration: {selectedTiers.length * tierDuration} seconds.
            </p>
          </div>
        </div>

        {/* Live Active Test Status */}
        {isRunning && (
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="font-black text-lg text-indigo-300">
                  Testing Stage: {currentTier} Active Simulated Viewers
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                RUNNING
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-black/40 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Total Requests</div>
                <div className="text-xl font-bold text-white">{liveStats.requests}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Successful (2xx)</div>
                <div className="text-xl font-bold text-emerald-400">{liveStats.successes}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Errors / Timeouts</div>
                <div className="text-xl font-bold text-red-400">{liveStats.errors}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Current RPS</div>
                <div className="text-xl font-bold text-amber-400">{liveStats.currentRps} req/s</div>
              </div>
            </div>
          </div>
        )}

        {/* Benchmark Results Table */}
        {results.length > 0 && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Benchmark Results
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Viewers</th>
                    <th className="py-2.5 px-3">Total Reqs</th>
                    <th className="py-2.5 px-3">Success Rate</th>
                    <th className="py-2.5 px-3">Throughput</th>
                    <th className="py-2.5 px-3">Avg Latency</th>
                    <th className="py-2.5 px-3">P50</th>
                    <th className="py-2.5 px-3">P95</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {results.map((r) => {
                    const successPct = ((r.successRequests / r.totalRequests) * 100).toFixed(1);
                    const isHealthy = r.failedRequests === 0 && r.p95 < 1500;
                    return (
                      <tr key={r.viewers} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-amber-400" /> {r.viewers}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{r.totalRequests}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              parseFloat(successPct) >= 99
                                ? 'text-emerald-400'
                                : parseFloat(successPct) >= 80
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {successPct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{r.throughput} req/s</td>
                        <td className="py-3 px-3 text-slate-300">{r.avgLatency}ms</td>
                        <td className="py-3 px-3 text-slate-300">{r.p50}ms</td>
                        <td className="py-3 px-3 text-slate-300">{r.p95}ms</td>
                        <td className="py-3 px-3">
                          {isHealthy ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-sans">
                              <CheckCircle className="w-3.5 h-3.5" /> Stable
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-400 font-semibold font-sans">
                              <AlertTriangle className="w-3.5 h-3.5" /> Degraded
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Safety & Info Notice */}
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 text-xs text-slate-400 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-300">Safe In-Browser Execution</p>
            <p className="mt-0.5">
              This benchmark runs client-side requests from this browser tab directly hitting the live server APIs (
              <code className="text-amber-400 font-mono">/api/wheel/state</code> and{' '}
              <code className="text-amber-400 font-mono">/api/wheel</code>). It does not write or modify database data,
              making it completely safe to test on production anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
