import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Scale } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | AV-Raffle',
  description: 'Terms and Conditions of Use for the AV-Raffle application and event management platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="text-xs font-mono text-amber-400 tracking-wider">
            LEGAL AGREEMENT
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4">
            <Scale className="w-4 h-4" />
            <span>Corporate Event Platform Guidelines</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-400 font-mono">
            Effective Date: November 5, 2026 • Avega Bros Integrated Logistics, Inc.
          </p>
        </div>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed border-t border-white/10 pt-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> 1. Acceptance of Terms
            </h2>
            <p>
              By installing, downloading, accessing, or operating the <strong>AV-Raffle</strong> mobile application or web portal (<code className="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded">https://avraffle.abas.ph</code>), you agree to abide by these Terms of Service and all applicable corporate policies established by <strong>Avega Bros Integrated Logistics, Inc.</strong>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> 2. Eligibility & Participation Rules
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li>
                <strong>Authorized Personnel:</strong> The application is designed for employees, contractors, and invited participants of Avega corporate functions.
              </li>
              <li>
                <strong>Physical Attendance / On-Site Registration:</strong> In accordance with event mechanics, eligibility for raffle wheel draws requires completion of on-site registration.
              </li>
              <li>
                <strong>One Active Prize Rule:</strong> Unless specified otherwise for grand prize draws by event committee rules, each attendee may claim one major prize per raffle cycle.
              </li>
              <li>
                <strong>Claim Verification:</strong> Winners announced on screen must have their claim verified by the Emcee or Event Committee. Unclaimed prizes or absent participants are subject to redraw at the discretion of event administrators.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" /> 3. Role-Based Access & Security
            </h2>
            <p>
              Access to administrative, emcee, registration desk, and prize catalog functions requires PIN authorization or administrator credentials. Users granted administrative access agree not to disclose PINs to unauthorized parties and to operate the application solely within their assigned event duties.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> 4. System Integrity & Fair Play
            </h2>
            <p>
              The raffle wheel employs a cryptographic pseudorandom physics simulation to guarantee random, unbiased outcomes. Any attempt to tamper with client requests, intercept WebSocket communications, reverse-engineer the APK, or manipulate database records is strictly prohibited and constitutes a violation of company IT security regulations.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" /> 5. Committee Discretion & Modifications
            </h2>
            <p>
              The Avega Event Management Committee and authorized system administrators reserve the right to interpret raffle rules, resolve disputed draws, adjust prize quantities, or rectify mechanical errors in real time. We may update these Terms periodically to reflect event policy changes.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xl font-bold text-white">6. Inquiries</h2>
            <p>
              For questions concerning these terms or event guidelines, please reach out to the Avega Event Committee or IT Department at{' '}
              <a href="mailto:it@avegabros.com" className="text-amber-400 hover:underline">it@avegabros.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
