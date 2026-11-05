import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Eye, Server, RefreshCw, Mail } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | AV-Raffle',
  description: 'Privacy Notice and Data Protection Policy for the AV-Raffle application and Avega Bros Integrated Logistics, Inc.',
};

export default function PrivacyPolicyPage() {
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
            LEGAL COMPLIANCE
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Republic Act No. 10173 (Data Privacy Act of 2012)</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-400 font-mono">
            Last Updated: November 5, 2026 • Avega Bros Integrated Logistics, Inc.
          </p>
        </div>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed border-t border-white/10 pt-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" /> 1. Overview & Scope
            </h2>
            <p>
              This Privacy Policy describes how <strong>Avega Bros Integrated Logistics, Inc.</strong> (&ldquo;Avega&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) collects, uses, protects, and discloses personal information obtained through the <strong>AV-Raffle</strong> system, including the mobile application (package: <code className="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded">ph.avegabros.avraffle</code>) and the web portals hosted under <code className="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded">https://avraffle.abas.ph</code>.
            </p>
            <p>
              This system is deployed exclusively for company corporate events, internal raffles, employee attendance verification, and prize distribution.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" /> 2. Information We Collect
            </h2>
            <p>To facilitate fair, transparent raffle draws and identity verification, the application may process the following data:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li><strong>Employee Identification:</strong> Full Name, Employee ID number, Department, Position, and Office Location (e.g., Tayud, Makati).</li>
              <li><strong>Camera & Mugshot Attendance:</strong> When checking in at the registration desk, an on-site photo or portrait is captured via the device camera with attendee consent to serve as the visual winner announcement graphic on screen.</li>
              <li><strong>Event Participation Data:</strong> Registration timestamp, eligibility status, wheel rotation history, winning prize records, and claim confirmation status.</li>
              <li><strong>Camera & Storage Permissions:</strong> The Android app requests access to the Camera and Storage exclusively for scanning attendee ticket QR codes, capturing attendance mugshots, and uploading prize showcase photos.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" /> 3. Purpose of Processing
            </h2>
            <p>We use the collected information strictly for legitimate organizational event purposes:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Validating attendee identity and eligibility for raffle entries.</li>
              <li>Displaying winner names, departments, and captured portraits on stage projector screens.</li>
              <li>Preventing unauthorized entries or duplicate claims.</li>
              <li>Maintaining an accurate digital audit trail and historical prize archive for corporate accountability.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" /> 4. Data Sharing & Third Parties
            </h2>
            <p>
              <strong>We do not sell, rent, monetize, or trade any personal information</strong> to third-party advertisers or external marketing networks.
            </p>
            <p>
              Information is stored on internal or secured corporate servers managed by Avega Bros Integrated Logistics, Inc. Data access is restricted to authorized HR, IT, and event committee administrators.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> 5. Data Security & Retention
            </h2>
            <p>
              We enforce appropriate technical and organizational safeguards including encrypted data transit (TLS/HTTPS), role-based PIN authorization on mobile remote modes, and restricted database access.
            </p>
            <p>
              Event logs and mugshot records are retained for corporate event auditing and year-end historical presentation. Attendees may request data rectification or removal through the authorized corporate HR department.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" /> 6. Contact Information & Data Protection Officer
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Notice or your rights under the Data Privacy Act, please contact:
            </p>
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs font-mono space-y-1 text-slate-300">
              <p className="font-bold text-white text-sm">Avega Bros Integrated Logistics, Inc. - IT Department</p>
              <p>Email: <a href="mailto:it@avegabros.com" className="text-amber-400 hover:underline">it@avegabros.com</a></p>
              <p>Website: <a href="https://avraffle.abas.ph" className="text-amber-400 hover:underline">https://avraffle.abas.ph</a></p>
              <p>Offices: Tayud, Consolacion, Cebu / Makati City, Metro Manila, Philippines</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
