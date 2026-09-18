"use client";

import React, { useState, useEffect } from "react";
import { HumanTask } from "@/lib/types/case";
import { TaskQueueList } from "@/components/TaskQueueList";
import { ShieldAlert, Info } from "lucide-react";

export default function L1QueuePage() {
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/synapark/tasks?stage=l1");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error("Error fetching L1 tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tier 1 Security & Triage</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            L1 Visitor Review Queue
          </h1>
          <p className="mt-1 text-sm text-indigo-200 max-w-xl">
            Initial triage stage for hospital visitor access requests. Verify visitor identity,
            relation to patient, and patient visiting capacity.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[140px]">
          <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">
            Pending Tasks
          </span>
          <div className="text-3xl font-extrabold mt-0.5 text-white">
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Info notice about CMMN routing */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">CMMN Sentry Rule:</span> Approving an L1 review triggers{" "}
          <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-800">
            Sentry_1hjmeh9 (l1_decision == 'approve')
          </code>
          , activating the L2 supervisor task. Rejecting triggers the case exit criterion, terminating the case.
        </div>
      </div>

      {/* Task Queue Table */}
      <TaskQueueList
        tasks={tasks}
        stage="l1"
        isLoading={isLoading}
        onRefresh={fetchTasks}
      />
    </div>
  );
}
