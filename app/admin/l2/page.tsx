"use client";

import React, { useState, useEffect } from "react";
import { HumanTask } from "@/lib/types/case";
import { TaskQueueList } from "@/components/TaskQueueList";
import { ShieldCheck, Info } from "lucide-react";

export default function L2QueuePage() {
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/synapark/tasks?stage=l2");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error("Error fetching L2 tasks:", err);
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
      <div className="bg-gradient-to-r from-purple-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Tier 2 Senior Supervision</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            L2 Senior Approval Queue
          </h1>
          <p className="mt-1 text-sm text-purple-200 max-w-xl">
            Second-level authorization stage. Requests only arrive here once approved by an L1 agent.
            Final approval completes the case and issues the visitor badge.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[140px]">
          <span className="text-xs text-purple-200 uppercase font-bold tracking-wider">
            Pending Tasks
          </span>
          <div className="text-3xl font-extrabold mt-0.5 text-white">
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Info notice about CMMN routing */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-purple-900">
        <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">CMMN Milestone & Sentry:</span> Approving at L2 satisfies{" "}
          <code className="font-mono bg-purple-100/80 px-1 py-0.5 rounded text-purple-800">
            Sentry_1w9pyhb (l2_decision == 'approve')
          </code>
          , reaching the <em>&quot;Visitor Request Approved&quot;</em> milestone. With autoComplete enabled, the case
          completes. Rejecting satisfies the exit criterion and terminates the case.
        </div>
      </div>

      {/* Task Queue Table */}
      <TaskQueueList
        tasks={tasks}
        stage="l2"
        isLoading={isLoading}
        onRefresh={fetchTasks}
      />
    </div>
  );
}
