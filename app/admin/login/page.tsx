"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogIn, ArrowRight, Loader2, AlertCircle } from "lucide-react";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<"l1" | "l2">("l1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-focus role based on callbackUrl if provided
  useEffect(() => {
    if (callbackUrl) {
      if (callbackUrl.includes("/admin/l2")) {
        setRole("l2");
        setEmail((prev) => (!prev || prev.includes("l1") ? "supervisor.l2@hospital.org" : prev));
      } else if (callbackUrl.includes("/admin/l1")) {
        setRole("l1");
        setEmail((prev) => (!prev || prev.includes("l2") ? "agent.l1@hospital.org" : prev));
      }
    }
  }, [callbackUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/synapark/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setSuccessMsg("Authenticated successfully. Redirecting...");

        // Determine destination: honor callbackUrl if valid admin path, otherwise role queue
        const targetUrl =
          callbackUrl && callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("/admin/login")
            ? callbackUrl
            : role === "l2"
            ? "/admin/l2"
            : "/admin/l1";

        setTimeout(() => {
          router.push(targetUrl);
        }, 800);
      } else {
        const msg = json.error?.message || `Authentication failed (HTTP ${res.status})`;
        setError(msg);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white border border-gray-200/80 rounded-2xl p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-sm shadow-indigo-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Staff Portal Login
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Access L1 & L2 CMMN approval queues
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              SynapArk Staff Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. agent@synapark.com"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Queue Role Focus
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole("l1");
                  setEmail("agent.l1@hospital.org");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  role === "l1"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                L1 Triage Agent
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("l2");
                  setEmail("supervisor.l2@hospital.org");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  role === "l2"
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                L2 Supervisor
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>Sign In to {role === "l1" ? "L1" : "L2"} Queue</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link
            href="/visitor"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <span>Return to Visitor Reception Kiosk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading staff login...</p>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}

