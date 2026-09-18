"use client";

import React from "react";
import { ResolvedCaseStatus } from "@/lib/types/case";
import { CheckCircle2, XCircle, Clock, ArrowRight, RotateCcw, AlertTriangle } from "lucide-react";

export interface StatusBannerProps {
  status: ResolvedCaseStatus;
  caseId?: string;
  onReset: () => void;
  pollingTimeSec?: number;
  l1Decision?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  caseId,
  onReset,
  pollingTimeSec = 0,
  l1Decision,
}) => {
  if (status === "approved") {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
              Decision: Approved
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Visitor Pass Approved!
            </h3>
            <p className="mt-1 text-sm text-gray-600 max-w-xl">
              Both L1 preliminary review and L2 senior supervisor approval have completed successfully.
              Please print or take this visitor pass to the reception turnstile.
            </p>
            {caseId && (
              <p className="mt-3 text-xs text-gray-400 font-mono">
                Case ID: {caseId}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={onReset}
                id="new-visitor-btn-approved"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Register Next Visitor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-red-50 border-2 border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 ring-8 ring-red-50">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 mb-2">
              Decision: Not Approved
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Visitor Request Declined
            </h3>
            <p className="mt-1 text-sm text-gray-600 max-w-xl">
              This visitor request could not be approved at this time based on hospital policy or ward capacity.
              Please consult front desk personnel for additional guidance.
            </p>
            {caseId && (
              <p className="mt-3 text-xs text-gray-400 font-mono">
                Case ID: {caseId}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={onReset}
                id="new-visitor-btn-rejected"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New Check-In</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending states: pending_l1 or pending_l2
  const isL2 = status === "pending_l2";
  const isL1Approved = l1Decision === "approve";

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <div className="relative w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 ring-8 ring-indigo-50/50">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            <span>Workflow In Progress &bull; Polling live ({pollingTimeSec}s)</span>
          </div>

          <h3 className="text-xl font-bold text-gray-900">
            {isL2 ? "Awaiting L2 Final Authorization" : "Awaiting L1 Review"}
          </h3>
          <p className="mt-1 text-sm text-gray-600 max-w-xl">
            {isL2
              ? "L1 Agent has approved your request! It is now with the L2 Senior Supervisor for final sign-off."
              : "Your registration has been sent to the hospital review queue. An L1 agent is reviewing the details."}
          </p>

          {/* Workflow Stage Stepper */}
          <div className="mt-6 max-w-md">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              {/* Step 1: Reception Desk */}
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300" />

              {/* Step 2: L1 Review */}
              <div
                className={`flex items-center gap-1.5 ${
                  isL1Approved
                    ? "text-emerald-600 font-semibold"
                    : "text-indigo-600 font-bold animate-pulse"
                }`}
              >
                {isL1Approved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-indigo-600 flex items-center justify-center text-[10px]">
                    1
                  </span>
                )}
                <span>L1 Review</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300" />

              {/* Step 3: L2 Approval */}
              <div
                className={`flex items-center gap-1.5 ${
                  isL2 ? "text-purple-600 font-bold animate-pulse" : "text-gray-400"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
                    isL2 ? "border-purple-600 text-purple-600" : "border-gray-300"
                  }`}
                >
                  2
                </span>
                <span>L2 Approval</span>
              </div>
            </div>
          </div>

          {caseId && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="font-mono">Case ID: {caseId}</span>
              <button
                type="button"
                onClick={onReset}
                className="text-gray-500 hover:text-gray-700 underline text-xs"
              >
                Cancel & Start Over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
