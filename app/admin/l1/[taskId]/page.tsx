"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UiSchema } from "@/lib/types/form-schema";
import { HumanTask } from "@/lib/types/case";
import { DynamicForm } from "@/components/dynamic-form";
import { ArrowLeft, ShieldAlert, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function L1TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<HumanTask | null>(null);
  const [schema, setSchema] = useState<UiSchema | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedSuccess, setCompletedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!taskId) return;

    const loadTaskDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/synapark/tasks/${taskId}`);
        const json = await res.json();

        if (json.success && json.data) {
          setTask(json.data.task);
          setSchema(json.data.schema);
          setInitialValues(json.data.initialValues || {});
        } else {
          setError(json.error?.message || "Failed to load task details.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load task.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskDetail();
  }, [taskId]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    // Section 5.2: In L1 submission, strictly scope to mutable decision variable(s)
    const variables: Record<string, unknown> = {
      l1_decision: String(values.l1_decision || "").toLowerCase().trim(),
    };
    if (values.l1_comment && typeof values.l1_comment === "string" && values.l1_comment.trim()) {
      variables.l1_comment = values.l1_comment.trim();
    }

    try {
      const res = await fetch(`/api/synapark/tasks/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          variables,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        const errorMsg = json.error?.message || "Failed to submit review decision.";
        const errorCode = json.error?.code ? ` (${json.error.code})` : "";
        setError(`${errorMsg}${errorCode}`);
        setIsSubmitting(false);
        return;
      }

      setCompletedSuccess(true);
      setTimeout(() => {
        router.push("/admin/l1");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Submission error.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/l1"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to L1 Queue</span>
        </Link>
      </div>

      {/* Task Header */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Stage: L1 Review
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Task ID: {taskId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Review Visitor Request
          </h1>
          <p className="text-xs text-gray-500">
            Form Contract: <span className="font-mono">l1-form</span> &bull; HumanTask: PlanItem_1jjsmp4
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {completedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">L1 Decision Submitted Successfully!</p>
            <p className="text-xs text-emerald-700">
              CMMN engine updated. Redirecting to L1 queue...
            </p>
          </div>
        </div>
      )}

      {/* Main Dynamic Form Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-700">Loading task schema and visitor data...</p>
          </div>
        ) : schema ? (
          <DynamicForm
            schema={schema}
            initialValues={initialValues}
            submitLabel="Submit L1 Review Decision"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={completedSuccess}
          />
        ) : null}
      </div>
    </div>
  );
}
