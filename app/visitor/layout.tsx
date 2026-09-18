"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight, HeartHandshake, Clock } from "lucide-react";

export default function VisitorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/20 text-gray-900 flex flex-col">
      {/* Receptionist Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                  Hospital Visitor Check-In
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Reception Kiosk
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Powered by SynapArk CMMN Workflow Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {time && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{time}</span>
              </div>
            )}

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            <Link
              href="/admin/l1"
              id="switch-to-admin-link"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <span>Admin Queues</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Kiosk Footer */}
      <footer className="border-t border-gray-200/60 bg-white/50 text-center py-4 text-xs text-gray-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kiosk ID: RECEPTION-DESK-01 &bull; Hospital Main Lobby</span>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Workflow Engine Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
