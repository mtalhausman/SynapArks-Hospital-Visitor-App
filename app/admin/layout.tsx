"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  CheckCircle,
  Clock,
  ArrowUpRight,
  User,
  LogOut,
  Hospital,
} from "lucide-react";

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [l1Count, setL1Count] = useState<number>(0);
  const [l2Count, setL2Count] = useState<number>(0);

  // Poll pending task counts periodically for admin awareness
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/synapark/tasks?stage=l1").then((r) => r.json()),
          fetch("/api/synapark/tasks?stage=l2").then((r) => r.json()),
        ]);
        if (isMounted) {
          if (r1.success && Array.isArray(r1.data)) setL1Count(r1.data.length);
          if (r2.success && Array.isArray(r2.data)) setL2Count(r2.data.length);
        }
      } catch {
        // Ignore background count errors
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const isL1Active = pathname.startsWith("/admin/l1");
  const isL2Active = pathname.startsWith("/admin/l2");

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      {/* Admin Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo & Portal Identity */}
            <div className="flex items-center gap-6">
              <Link href="/admin/l1" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight text-gray-900">
                      SynapArk Admin Portal
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                      Staff Hub
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    CMMN Task Routing & Approvals
                  </p>
                </div>
              </Link>

              {/* Stage Queue Tabs */}
              <nav className="hidden md:flex items-center gap-1.5 ml-4">
                <Link
                  href="/admin/l1"
                  id="nav-l1-queue"
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isL1Active
                      ? "bg-indigo-50 text-indigo-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>L1 Queue</span>
                  {l1Count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                      {l1Count}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/l2"
                  id="nav-l2-queue"
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isL2Active
                      ? "bg-purple-50 text-purple-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>L2 Queue</span>
                  {l2Count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                      {l2Count}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            {/* Right utilities: Switch to Kiosk & Agent Profile */}
            <div className="flex items-center gap-3">
              <Link
                href="/visitor"
                id="kiosk-view-link"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <span>Open Visitor Kiosk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <div className="h-4 w-px bg-gray-200" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-800 leading-tight">
                    Admin Agent
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    L1 / L2 Reviewer
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden border-t border-gray-100 px-4 py-2 flex items-center gap-2 bg-gray-50/50">
          <Link
            href="/admin/l1"
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg ${
              isL1Active
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            L1 Queue ({l1Count})
          </Link>
          <Link
            href="/admin/l2"
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg ${
              isL2Active
                ? "bg-purple-50 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            L2 Queue ({l2Count})
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
