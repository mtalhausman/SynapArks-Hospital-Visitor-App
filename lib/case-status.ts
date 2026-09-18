import { CaseInstance, ResolvedCaseStatus } from "./types/case";

export interface StatusEvaluation {
  resolvedStatus: ResolvedCaseStatus;
  isTerminal: boolean;
  title: string;
  description: string;
  message?: string;
  badgeColor: string;
  badgeVariant?: string;
  currentStage: "L1" | "L2" | "Final" | "Unknown";
}

/**
 * Single source of truth for interpreting SynapArk CMMN case instance status.
 *
 * CMMN Model Rules (visitor-case-process-2-0.cmmn):
 * 1. Independent Exit Criteria:
 *    - Exit Criterion 1: Triggered when L1 completes with ${l1_decision == "reject"}
 *    - Exit Criterion 2: Triggered when L2 completes with ${l2_decision == "reject"}
 *    -> Any exit criterion moves the case to TERMINATED state.
 * 2. Milestone "Visitor Request Approved" (Sentry_1w9pyhb) fires on:
 *    l2_decision == "approve" (which requires l1_decision == "approve" to even activate L2)
 *    -> Since autoComplete="true", hitting this milestone completes the case to COMPLETED.
 * 3. While ACTIVE:
 *    - neither decision set -> Awaiting L1 Review.
 *    - l1_decision == "approve" & l2_decision unset -> Awaiting L2 Review.
 */
export function interpretCaseStatus(instance: CaseInstance | Record<string, any> | null | undefined): StatusEvaluation {
  if (!instance) {
    return {
      resolvedStatus: "unknown",
      isTerminal: false,
      title: "Unknown Status",
      description: "Unable to retrieve case status.",
      message: "Unable to retrieve case status.",
      badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
      badgeVariant: "secondary",
      currentStage: "Unknown",
    };
  }

  // 1. Unwrap document if nested under { instance: ... } or { data: ... }
  const doc: Record<string, any> = (instance as any).instance || (instance as any).data || instance;
  const rawStatus = String(doc.status || (instance as any).status || doc.state || (instance as any).state || "").toLowerCase().trim();

  // Extract variables
  const vars: Record<string, unknown> = {
    ...((instance as any).variables || {}),
    ...(doc.variables || {}),
  };

  // Inspect events, history, planItems, or tasks
  const eventsList: any[] = [
    ...(Array.isArray(doc.events) ? doc.events : []),
    ...(Array.isArray(doc.history) ? doc.history : []),
    ...(Array.isArray(doc.planItems) ? doc.planItems : []),
    ...(Array.isArray(doc.tasks) ? doc.tasks : []),
    ...(Array.isArray((instance as any).events) ? (instance as any).events : []),
    ...(Array.isArray((instance as any).history) ? (instance as any).history : []),
    ...(Array.isArray((instance as any).planItems) ? (instance as any).planItems : []),
    ...(Array.isArray(instance) ? instance : []),
  ];

  // Merge any variables or form data embedded in events
  for (const ev of eventsList) {
    if (ev && typeof ev === "object") {
      if (ev.variables && typeof ev.variables === "object") {
        Object.assign(vars, ev.variables);
      }
      if (ev.formData && typeof ev.formData === "object") {
        Object.assign(vars, ev.formData);
      }
    }
  }

  const l1Decision = String(vars.l1_decision || "").toLowerCase().trim();
  const l2Decision = String(vars.l2_decision || "").toLowerCase().trim();

  // Check event-level indicators generically across both exit criteria
  const hasCaseTerminatedEvent = eventsList.some((ev) => {
    if (!ev || typeof ev !== "object") return false;
    const isTerminatedState = ev.state === "terminated" || ev.status === "terminated";
    const isTerminatedEvent = ev.eventType === "case_terminated" || ev.eventType === "exit_criterion_triggered";
    const isExitCriterion =
      Boolean(ev.criterionId && String(ev.criterionId).toLowerCase().includes("exit")) ||
      Boolean(ev.sentryId && String(ev.sentryId).toLowerCase().includes("exit")) ||
      ev.criterionType === "exit" ||
      ev.sentryId === "Sentry_0a348c3" ||
      ev.criterionId === "ExitCriterion_1rx48w6";

    return isTerminatedState || isTerminatedEvent || isExitCriterion;
  });

  // STEP 1 (Absolute Top-Priority Rejection Invariant):
  // Evaluated at the very top before checking for completion, milestones, or active stages.
  const isExplicitlyRejected = l1Decision === "reject" || l2Decision === "reject";
  const isEngineTerminated = rawStatus === "terminated" || rawStatus === "cancelled" || rawStatus === "rejected";

  if (isExplicitlyRejected || isEngineTerminated || hasCaseTerminatedEvent) {
    const message =
      l1Decision === "reject"
        ? "The request was declined during initial triage (L1)."
        : l2Decision === "reject"
        ? "The request was declined by senior administration (L2)."
        : "The request was declined by hospital review. Please check with reception desk.";

    return {
      resolvedStatus: "rejected",
      isTerminal: true,
      title: "Visitor Request Declined",
      description: message,
      message,
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      badgeVariant: "destructive",
      currentStage: "Final",
    };
  }

  // STEP 2 (Approval):
  // Evaluated ONLY if the case was not rejected above.
  const hasMilestoneCompleted = eventsList.some((ev) => {
    if (!ev || typeof ev !== "object") return false;
    const isApprovalMilestone =
      ev.planItemId === "PlanItem_1638h51" ||
      ev.taskDefinitionKey === "PlanItem_1638h51" ||
      ev.sentryId === "Sentry_1w9pyhb" ||
      ev.criterionId === "EntryCriterion_1nz2zgq" ||
      (typeof ev.name === "string" && ev.name.toLowerCase().includes("visitor request approved"));

    return (
      isApprovalMilestone &&
      (ev.state === "completed" || ev.status === "completed" || ev.eventType === "milestone_reached")
    );
  });

  // If NOT rejected, and (rawStatus === "completed" OR milestone "Visitor Request Approved" / Sentry_1w9pyhb is reached OR both l1_decision === "approve" and l2_decision === "approve")
  const isApproved =
    (l1Decision === "approve" && l2Decision === "approve") ||
    rawStatus === "completed" ||
    rawStatus === "closed" ||
    hasMilestoneCompleted;

  if (isApproved) {
    return {
      resolvedStatus: "approved",
      isTerminal: true,
      title: "Visitor Request Approved",
      description: "All approval stages passed! The visitor badge is authorized. Please proceed to the ward.",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      currentStage: "Final",
    };
  }

  // STEP 3 (L2 Stage Gating):
  // A case is ONLY pending_l2 if l1_decision === "approve" AND !l2_decision.
  // No loose plan item creation/availability events may trigger premature promotion.
  if (l1Decision === "approve" && !l2Decision) {
    return {
      resolvedStatus: "pending_l2",
      isTerminal: false,
      title: "Awaiting L2 Final Approval",
      description: "L1 preliminary review approved. Awaiting second-level supervisor sign-off.",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      currentStage: "L2",
    };
  }

  // STEP 4 (Default Active):
  // If active and !l1_decision, return pending_l1.
  return {
    resolvedStatus: "pending_l1",
    isTerminal: false,
    title: "Awaiting L1 Review",
    description: "Request submitted. Waiting for initial review by L1 Agent.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    currentStage: "L1",
  };
}
