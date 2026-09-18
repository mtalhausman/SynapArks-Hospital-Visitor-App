"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Server,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Workflow,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const [engineStatus, setEngineStatus] = useState<{
    connected: boolean;
    baseUrl?: string;
    entryPointId?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/synapark/status")
      .then((r) => r.json())
      .then((data) => setEngineStatus(data))
      .catch(() => setEngineStatus({ connected: false }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/20 text-gray-900">
      {/* Top Bar */}
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Workflow className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-gray-900">
              SynapArk Case Portal
            </span>
          </div>

          <div className="flex items-center gap-2">
            {engineStatus && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  engineStatus.connected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    engineStatus.connected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>
                  {engineStatus.connected ? "SynapArk Engine Live" : "Offline Simulator"}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>CMMN 2.0 Workflow Demonstration Harness</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Patient Visitor Case Portal
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Test and exercise the custom SynapArk CMMN workflow engine end-to-end:
            from receptionist case initiation, through two-stage human review (L1 & L2),
            to sentry-driven milestone completion.
          </p>
        </div>

        {/* Dual Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
          {/* Portal 1: Receptionist Kiosk */}
          <div className="bg-white border-2 border-indigo-100 hover:border-indigo-300 rounded-2xl p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  Receptionist Portal
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                  /visitor
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Hospital front-desk kiosk layout. Dynamically renders the live Start Form (<code>visitor-form</code>) directly from the SynapArk entry point, generates idempotency tokens, and live-polls case resolution status.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-gray-100">
              <Link
                href="/visitor"
                id="launch-visitor-kiosk-btn"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all"
              >
                <span>Launch Receptionist Kiosk</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Portal 2: L1 / L2 Admin Approvals */}
          <div className="bg-white border-2 border-slate-200 hover:border-slate-400 rounded-2xl p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  L1 & L2 Review Portal
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                  /admin
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Staff operational dashboard layout. Filter tasks strictly by <code>formKey</code> (<code>l1-form</code> vs <code>l2-form</code>), inspect read-only visitor submissions, and complete review decisions with sentry routing.
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
              <Link
                href="/admin/l1"
                id="launch-l1-queue-btn"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all text-center"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Open L1 Queue</span>
              </Link>
              <Link
                href="/admin/l2"
                id="launch-l2-queue-btn"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all text-center"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open L2 Queue</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Engine Diagnostics Card */}
        <div className="mt-12 max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">
              SynapArk Engine Connection Diagnostics
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block mb-1">Base REST API</span>
              <span className="font-mono font-medium text-gray-800 break-all">
                https://app.synapark.com
              </span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block mb-1">Entry Point UUID</span>
              <span className="font-mono font-medium text-gray-800 break-all">
                d33bb9b8-5021-4692-b40d-1f7cae10ebee
              </span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block mb-1">CMMN Process Key</span>
              <span className="font-mono font-medium text-gray-800">
                visitor-case-process-2-0
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
