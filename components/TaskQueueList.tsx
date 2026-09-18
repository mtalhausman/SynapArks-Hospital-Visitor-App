"use client";

import React from "react";
import Link from "next/link";
import { HumanTask } from "@/lib/types/case";
import { ArrowRight, UserCheck, Calendar, Users, RefreshCw, Inbox } from "lucide-react";

export interface TaskQueueListProps {
  tasks: HumanTask[];
  stage: "l1" | "l2";
  isLoading?: boolean;
  onRefresh: () => void;
}

export const TaskQueueList: React.FC<TaskQueueListProps> = ({
  tasks,
  stage,
  isLoading = false,
  onRefresh,
}) => {
  const stageLabel = stage === "l1" ? "L1 Agent Review" : "L2 Senior Approval";
  const badgeColor = stage === "l1" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{stageLabel} Queue</h2>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeColor}`}>
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Filtered strictly by formKey: <span className="font-mono font-medium">{stage}-form</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          id={`refresh-${stage}-queue-btn`}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Task List or Empty State */}
      {isLoading && tasks.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600">Loading {stageLabel} queue...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No pending tasks</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            {stage === "l1"
              ? "No visitor check-ins currently require L1 review. New submissions from the visitor kiosk will appear here."
              : "No tasks are awaiting L2 approval. Tasks will arrive here once an L1 agent approves a visitor request."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Visitor Name</th>
                <th className="py-3.5 px-5">Patient Name</th>
                <th className="py-3.5 px-5">Visit Date</th>
                <th className="py-3.5 px-5">Visitors</th>
                <th className="py-3.5 px-5">Submitted</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const vars = (task.caseInstance?.variables || task.formData || {}) as Record<
                  string,
                  unknown
                >;
                const visitorName = String(vars.visitor_name || "Unknown Visitor");
                const patientName = String(vars.patient_name || "N/A");
                const visitDate = String(vars.visit_date || "Not specified");
                const numVisitors = String(vars.number_of_visitors || 1);
                const submittedTime = task.createdAt
                  ? new Date(task.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recently";

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50/75 transition-colors group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {visitorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{visitorName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            Task: {task.id.slice(0, 12)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-medium text-gray-700">
                      {patientName}
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{visitDate}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{numVisitors}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-gray-500">
                      {submittedTime}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/admin/${stage}/${task.id}`}
                        id={`review-task-${task.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
