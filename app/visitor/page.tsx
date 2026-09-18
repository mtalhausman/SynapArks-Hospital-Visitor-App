"use client";

import React, { useState, useEffect, useRef } from "react";
import { UiSchema } from "@/lib/types/form-schema";
import { CaseInstance, ResolvedCaseStatus } from "@/lib/types/case";
import { interpretCaseStatus } from "@/lib/case-status";
import { DynamicForm } from "@/components/dynamic-form";
import { StatusBanner } from "@/components/StatusBanner";
import { Loader2, AlertCircle, Sparkles, Building2, UserPlus } from "lucide-react";

export default function VisitorReceptionPage() {
  const [schema, setSchema] = useState<UiSchema | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Active visitor case tracking
  const [caseInstance, setCaseInstance] = useState<CaseInstance | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Polling state
  const [resolvedStatus, setResolvedStatus] = useState<ResolvedCaseStatus>("unknown");
  const [pollingSeconds, setPollingSeconds] = useState<number>(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live Start Form on page mount
  const loadStartForm = async () => {
    setIsLoadingSchema(true);
    setSchemaError(null);
    try {
      const res = await fetch("/api/synapark/entry-point");
      const json = await res.json();

      if (json.success && json.data?.startForm?.uiSchema) {
        setSchema(json.data.startForm.uiSchema);
      } else if (json.error?.message) {
        setSchemaError(json.error.message);
      } else {
        setSchemaError("Start Form not found in entry point response.");
      }
    } catch (err: any) {
      setSchemaError(err.message || "Failed to load visitor start form.");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  useEffect(() => {
    loadStartForm();

    // Check URL search parameters for ongoing case tracking on browser reload
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlCaseId = params.get("caseId");
      if (urlCaseId) {
        setActiveCaseId(urlCaseId);
        fetch(`/api/synapark/cases/${urlCaseId}`)
          .then((r) => r.json())
          .then((result) => {
            if (result.success && result.data) {
              const current = typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
              current.id = urlCaseId;
              setCaseInstance(current);
              const evalState = interpretCaseStatus(result.data);
              setResolvedStatus(evalState.resolvedStatus);
            }
          })
          .catch((err) => {
            console.error("Failed to restore case from URL parameter:", err);
          });
      }
    }
  }, []);

  // Continuous Polling Loop: Driven by activeCaseId
  useEffect(() => {
    if (!activeCaseId) return;

    let isTerminal = false;
    setPollingSeconds(0);

    // 1-second interval counter
    if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    secondsTimerRef.current = setInterval(() => {
      setPollingSeconds((prev) => prev + 1);
    }, 1000);

    const pollCase = async () => {
      if (isTerminal) return;
      try {
        const res = await fetch(`/api/synapark/cases/${activeCaseId}`);
        if (!res.ok) {
          console.warn(`[Visitor Polling] Poll returned HTTP ${res.status}`);
          return;
        }
        const result = await res.json();
        if (result.success && result.data) {
          const caseData = result.data;
          const evaluation = interpretCaseStatus(caseData);
          setResolvedStatus(evaluation.resolvedStatus);

          const updatedDoc = typeof caseData === "object" && !Array.isArray(caseData) ? caseData : {};
          updatedDoc.id = activeCaseId;
          setCaseInstance((prev) => ({ ...(prev || {}), ...updatedDoc }));

          // If reached terminal state (approved or rejected), halt polling!
          if (evaluation.isTerminal) {
            isTerminal = true;
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
          }
        }
      } catch (err) {
        console.error("[Visitor Polling] Error during status poll:", err);
      }
    };

    // Immediate initial poll
    pollCase();

    // Poll every 3 seconds continuously
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(pollCase, 3000);

    return () => {
      isTerminal = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    };
  }, [activeCaseId]);

  // Handle form submission
  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/synapark/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variables: values,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.error?.message || "Failed to start visitor registration.");
        setIsSubmitting(false);
        return;
      }

      // Case created successfully
      const createdCase: CaseInstance = data.data;
      setCaseInstance(createdCase);
      setActiveCaseId(createdCase.id);
      const evalState = interpretCaseStatus(createdCase);
      setResolvedStatus(evalState.resolvedStatus);

      // Sync caseId into URL search parameter so page reload preserves status tracking
      if (typeof window !== "undefined" && createdCase.id) {
        const url = new URL(window.location.href);
        url.searchParams.set("caseId", createdCase.id);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for next visitor
  const handleReset = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    setActiveCaseId(null);
    setCaseInstance(null);
    setResolvedStatus("unknown");
    setSubmitError(null);
    setPollingSeconds(0);

    // Clear caseId from URL parameter
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("caseId");
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Visitor Check-In Registration
            </h2>
            <p className="text-sm text-gray-500">
              Submit visitor details for fast-track L1 & L2 security verification.
            </p>
          </div>
        </div>

        {(activeCaseId || caseInstance) && (
          <button
            type="button"
            onClick={handleReset}
            id="visitor-new-checkin-btn"
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all shadow-xs"
          >
            New Visitor / Reset
          </button>
        )}
      </div>

      {/* Error alert if submission failed */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Submission Error</p>
            <p className="text-xs text-red-700 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* VIEW A: Active Case Status Watcher (after submission) */}
      {activeCaseId || caseInstance ? (
        <StatusBanner
          status={resolvedStatus}
          caseId={activeCaseId || caseInstance?.id}
          onReset={handleReset}
          pollingTimeSec={pollingSeconds}
          l1Decision={caseInstance?.variables?.l1_decision as string | undefined}
        />
      ) : (
        /* VIEW B: Dynamic Visitor Start Form */
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-base">Visitor Details</h3>
            </div>
            <span className="text-xs font-medium text-gray-400">
              Form Key: <span className="font-mono text-gray-600">visitor-form</span>
            </span>
          </div>

          {isLoadingSchema ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Fetching Live Start Form Contract...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Querying SynapArk entry point: d33bb9b8-5021-4692-b40d-1f7cae10ebee
              </p>
            </div>
          ) : schemaError ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h4 className="font-bold text-red-900 text-sm">Failed to Load Start Form</h4>
              <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{schemaError}</p>
              <button
                type="button"
                onClick={loadStartForm}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Retry Form Discovery
              </button>
            </div>
          ) : schema ? (
            <DynamicForm
              schema={schema}
              submitLabel="Submit Visitor Request"
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
