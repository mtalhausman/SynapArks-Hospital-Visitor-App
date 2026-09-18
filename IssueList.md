# SynapArk CMMN Visitor Case Portal - QA Defect Audit Report (`IssueList.md`)

**Audit Date**: September 17, 2026  
**Auditor**: Senior QA Automation & Systems Engineer  
**Target Systems**: `lib/case-status.ts`, `lib/synapark-client.ts`, `components/StatusBanner.tsx`, `app/visitor/page.tsx`  
**CMMN Process**: `visitor-case-process-2-0.cmmn` (Entry Point: `d33bb9b8-5021-4692-b40d-1f7cae10ebee`)

---

## 1. Executive Summary

A comprehensive quality assurance and state-machine integrity audit of the SynapArk Patient & Visitor Management Portal revealed **two critical state-inversion defects** and **two high-severity workflow bugs** that compromise the hospital's security and visitor adjudication pipeline:

1. **State Inversion on L2 Rejection (DEF-001 / DEF-003)**: When an L2 Senior Supervisor explicitly rejects a visitor request (`l2_decision: "reject"`), the Receptionist Kiosk UI displays a green **"Visitor Pass Approved!"** banner with authorization instructions instead of terminating and displaying a decline notice. This occurs because the submission of the L2 Human Task (`PlanItem_0eptewu`) marks the task itself as `state: "completed"`. Both `lib/synapark-client.ts` and `lib/case-status.ts` equate task completion with case approval, and evaluate approval before rejection.
2. **Premature L2 State Promotion (DEF-002)**: Immediately after visitor registration and before any L1 agent has reviewed the request, the Receptionist Kiosk advances to **"Awaiting L2 Final Approval"**, and the UI Stepper displays **Step 1 (L1 Review)** with a green checkmark. This occurs because CMMN plan item declaration events (`ev.state === "created"` or `ev.state === "available"`) for `PlanItem_0eptewu` satisfy `hasL2ActiveEvent` via an un-guarded `||` branch in `lib/case-status.ts`, bypassing the required precondition `l1_decision === "approve"`.
3. **Misleading Stepper Progress (DEF-004)**: Visual progress indicators in `components/StatusBanner.tsx` reflect premature state jumps without validating whether preceding stage outputs exist in the case instance variables.

The table below outlines the defect catalog, followed by full technical breakdowns and remediation diffs.

---

## 2. Defect Catalog

### DEF-001: L2 Supervisor Rejection Inverted to "Visitor Pass Approved"

| Field | Detail |
| :--- | :--- |
| **Defect ID** | **DEF-001** |
| **Severity** | **Critical (P0 - Security / Integrity Violation)** |
| **Component** | `lib/case-status.ts` -> `interpretCaseStatus()` |
| **Lines** | Lines 76–86, 110–125 |
| **Preconditions** | Visitor case is active. L1 agent has approved (`l1_decision: "approve"`). Case is in L2 queue. |

#### A. Expected vs. Actual Behavior
- **Expected Behavior**: When L2 submits `l2_decision: "reject"`, CMMN Sentry `Sentry_0a348c3` triggers `ExitCriterion_1rx48w6`. The case transitions to `status: "terminated"`. The Receptionist UI resolves status to `"rejected"`, halts polling (`isTerminal: true`), and presents the red "Visitor Request Declined" alert.
- **Actual Behavior**: The Receptionist UI displays the green **"Visitor Pass Approved!"** screen with `"Decision: Approved"` and advises the visitor to proceed to the ward.

#### B. Root Cause Analysis
In `lib/case-status.ts`, `hasCaseCompletedEvent` treats `PlanItem_0eptewu` (the L2 task) reaching `state: "completed"` as proof that the *entire case* was approved:

```typescript
// lib/case-status.ts:79-85
const isL2ItemCompleted =
  (ev.planItemId === "PlanItem_0eptewu" || ev.taskDefinitionKey === "PlanItem_0eptewu") &&
  (ev.state === "completed" || ev.status === "completed");
return isCompletedType || isL2ItemCompleted || isMilestoneCompleted;
```

In task-oriented workflow engines like SynapArk, completing a human task merely indicates the user submitted the form—regardless of whether they chose "approve" or "reject". Furthermore, the check for `COMPLETED` (lines 110–125) executes **before** the check for `TERMINATED` (lines 127–145):

```typescript
// lib/case-status.ts:110-116
// 1. Check for COMPLETED (approved) - Top level status takes immediate effect
if (
  rawStatus === "completed" ||
  rawStatus === "closed" ||
  hasCaseCompletedEvent || // <--- TRUE because L2 submitted the task!
  (l1Decision === "approve" && l2Decision === "approve")
) {
  return {
    resolvedStatus: "approved",
    isTerminal: true,
    ...
  };
}
```

Because `hasCaseCompletedEvent` evaluates to `true`, the function exits immediately with `resolvedStatus: "approved"`, never evaluating `l2Decision === "reject"` or `rawStatus === "terminated"`.

---

### DEF-002: Premature Promotion to "Awaiting L2" Before L1 Decision

| Field | Detail |
| :--- | :--- |
| **Defect ID** | **DEF-002** |
| **Severity** | **High (P1 - Workflow Sequence Violation)** |
| **Component** | `lib/case-status.ts` -> `interpretCaseStatus()` |
| **Lines** | Lines 88–108, 148–157 |
| **Preconditions** | Visitor check-in form submitted. Case created with status `"active"`. L1 agent has NOT submitted any decision (`l1_decision` is `null`/undefined). |

#### A. Expected vs. Actual Behavior
- **Expected Behavior**: Case remains in `pending_l1` ("Awaiting L1 Review") until an L1 triage agent submits `l1_decision: "approve"`.
- **Actual Behavior**: The Receptionist Kiosk immediately switches to `pending_l2` ("Awaiting L2 Final Approval"), and the stepper marks L1 review as already completed.

#### B. Root Cause Analysis
In `lib/case-status.ts`:
```typescript
// lib/case-status.ts:98-108
const hasL2ActiveEvent = eventsList.some((ev) => {
  if (!ev || typeof ev !== "object") return false;
  const isL2 = ev.planItemId === "PlanItem_0eptewu" || ev.taskDefinitionKey === "PlanItem_0eptewu";
  const isActive =
    ev.state === "active" ||
    ev.state === "assigned" ||
    ev.state === "created" ||     // <--- TRIGGERED on initial plan item creation
    ev.state === "available" ||   // <--- TRIGGERED when stage is instantiated
    ev.eventType === "plan_item_created";
  return isL2 && isActive;
});
```

And in the stage routing check:
```typescript
// lib/case-status.ts:148-149
// 3. Still ACTIVE: determine if awaiting L2 Final Approval
if ((l1Decision === "approve" && !l2Decision) || hasL2ActiveEvent) {
  return {
    resolvedStatus: "pending_l2",
...
```

When SynapArk instantiates a CMMN case definition, it logs plan item initialization events or sets plan item states to `"created"` or `"available"` (waiting for their entry sentries). Because `hasL2ActiveEvent` matches on `"created"` or `"available"`, and because the condition uses `|| hasL2ActiveEvent` without requiring `l1Decision === "approve"`, any initial event for `PlanItem_0eptewu` immediately forces the case into `pending_l2`.

---

### DEF-003: Task Completion Overwrites Case Instance Status in `SynapArkClient`

| Field | Detail |
| :--- | :--- |
| **Defect ID** | **DEF-003** |
| **Severity** | **Critical (P0 - Data Corruption / State Masquerading)** |
| **Component** | `lib/synapark-client.ts` -> `getCaseInstance()` |
| **Lines** | Lines 313–322 |
| **Preconditions** | Polling `GET /api/synapark/cases/[id]` after L2 task submission. |

#### A. Expected vs. Actual Behavior
- **Expected Behavior**: `getCaseInstance` unrolls the case object and preserves the actual case instance execution status (`active`, `terminated`, or `completed`).
- **Actual Behavior**: `caseObj.status` is forcefully mutated to `"completed"` whenever any event references `PlanItem_0eptewu` in a completed state.

#### B. Root Cause Analysis
In `lib/synapark-client.ts`:
```typescript
// lib/synapark-client.ts:313-322
if (
  ev.eventType === "case_completed" ||
  ev.eventType === "milestone_reached" ||
  (ev.planItemId === "PlanItem_0eptewu" && (ev.state === "completed" || ev.status === "completed")) ||
  (ev.taskDefinitionKey === "PlanItem_0eptewu" && (ev.state === "completed" || ev.status === "completed"))
) {
  caseObj.status = "completed"; // <--- OVERWRITES "terminated" with "completed"
} else if (ev.eventType === "case_terminated" || ev.state === "terminated") {
  caseObj.status = "terminated";
}
```

If an event for task `PlanItem_0eptewu` completing is evaluated in this loop, `caseObj.status` is set to `"completed"`, overriding any previous status and corrupting the payload sent to the client.

---

### DEF-004: Stepper UI False-Positive Progress Indication

| Field | Detail |
| :--- | :--- |
| **Defect ID** | **DEF-004** |
| **Severity** | **Medium (P2 - UX Desynchronization)** |
| **Component** | `components/StatusBanner.tsx` |
| **Lines** | Lines 137–171 |
| **Preconditions** | Any premature `status === "pending_l2"` emission. |

#### A. Expected vs. Actual Behavior
- **Expected Behavior**: Step 1 (L1 Review) should only show a green `CheckCircle2` if L1 has explicitly approved.
- **Actual Behavior**: The stepper relies solely on `const isL2 = status === "pending_l2"`. When `pending_l2` is triggered prematurely, the stepper renders Step 1 with a green checkmark and "L1 Review", misleading users that an agent has already inspected the submission.

---

## 3. CMMN State Machine Verification Matrix

The table below defines the invariant state mapping that `interpretCaseStatus()` and `SynapArkClient` must strictly uphold:

| Scenario | `rawStatus` | `l1_decision` | `l2_decision` | Significant Engine Events | `resolvedStatus` | `isTerminal` | Receptionist UI View |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Initial Check-in** | `active` | *null / unset* | *null / unset* | `PlanItem_1jjsmp4` active | `pending_l1` | `false` | Awaiting L1 Review (Step 1 active) |
| **L1 Early Rejection** | `terminated` / `active` | `"reject"` | *null / unset* | `Sentry_0a348c3` triggered | `rejected` | `true` | Request Declined (Decline banner, stop poll) |
| **L1 Approval** | `active` | `"approve"` | *null / unset* | `PlanItem_0eptewu` active | `pending_l2` | `false` | Awaiting L2 Review (Step 1 check, Step 2 active) |
| **L2 Late Rejection** | `terminated` / `active` | `"approve"` | `"reject"` | `Sentry_0a348c3` triggered, L2 task completed | `rejected` | `true` | Request Declined (Decline banner, stop poll) |
| **Double Approval** | `completed` / `closed` | `"approve"` | `"approve"` | `Sentry_1w9pyhb` (Milestone reached) | `approved` | `true` | Pass Approved (Badge issued, stop poll) |
| **Ambiguous / Error** | `terminated` / `cancelled` | *any* | *any* | `case_terminated` event | `rejected` | `true` | Request Declined |

### Mandatory Logic Invariants:
1. **Rejection Precedence**: If `l1_decision === "reject"` OR `l2_decision === "reject"` OR `rawStatus === "terminated"` OR `hasCaseTerminatedEvent`, the status is **ALWAYS** `rejected` (`isTerminal: true`). No completion event or status may override rejection.
2. **Strict L2 Gating**: `pending_l2` can **ONLY** be entered if `l1_decision === "approve"` AND `l2_decision !== "reject"`.
3. **Human Task $\ne$ Case Instance**: Completion of `PlanItem_0eptewu` does NOT mean the case is approved. Only the Milestone (`PlanItem_1638h51` / `Sentry_1w9pyhb`) or `l2_decision === "approve"` confirms approval.

---

## 4. Remediation Plan

### Remediation 1: Refactor `lib/case-status.ts`
1. Re-order evaluation checks so **Rejection / Termination has absolute top priority**.
2. Require `l1Decision === "approve"` for any transition to `pending_l2`.
3. Strip `isL2ItemCompleted` from `hasCaseCompletedEvent`. Only the actual milestone `PlanItem_1638h51` or `case_completed` event with approval variables may satisfy case completion.

### Remediation 2: Remove Heuristic in `lib/synapark-client.ts`
1. In `getCaseInstance()`, remove lines 316–317 which set `caseObj.status = "completed"` solely on `PlanItem_0eptewu` completion.
2. Ensure that when `l1_decision === "reject"` or `l2_decision === "reject"`, `caseObj.status` is reliably marked as `"terminated"`.
