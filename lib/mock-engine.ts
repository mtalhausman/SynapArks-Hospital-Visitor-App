/**
 * SynapArk CMMN Engine In-Memory Simulator / Fallback
 *
 * Implements the exact CMMN lifecycle from visitor-case-process-2-0.cmmn:
 * 1. Visitor starts case with visitor-form data.
 * 2. Case enters ACTIVE state and spawns L1 Human Task (PlanItem_1jjsmp4, formKey: "l1-form").
 * 3. L1 Agent submits l1_decision:
 *    - "reject" -> ExitCriterion_1rx48w6 / Sentry_0a348c3 fires -> Case TERMINATED.
 *    - "approve" -> EntryCriterion_1hjmeh9 / Sentry_1hjmeh9 fires -> Spawns L2 Human Task (PlanItem_0eptewu, formKey: "l2-form").
 * 4. L2 Agent submits l2_decision:
 *    - "reject" -> Sentry_0a348c3 fires -> Case TERMINATED.
 *    - "approve" -> EntryCriterion_1nz2zgq / Sentry_1w9pyhb fires -> Milestone "Visitor Request Approved" reached.
 *      Since autoComplete="true", Case auto-completes to COMPLETED.
 */

import { CaseInstance, HumanTask } from "./types/case";
import { UiSchema } from "./types/form-schema";

// Form schemas
export const VISITOR_UI_SCHEMA: UiSchema = {
  version: 1,
  layout: "two-column",
  submitLabel: "Submit Visitor Registration",
  fields: [
    {
      id: "87d8ae24-d569-4a2d-bfbc-c41506c8e3fc",
      key: "visitor_name",
      type: "shortText",
      label: "Visitor Name",
      width: "full",
      readOnly: false,
      required: false,
    },
    {
      id: "f217cdab-368d-4601-9a98-66acd1bf6c72",
      key: "visitor_phone_number",
      type: "number",
      label: "Visitor Phone Number",
      width: "full",
      readOnly: false,
      required: false,
    },
    {
      id: "1920dc0f-de02-4825-b734-5d7984480f51",
      key: "patient_name",
      type: "shortText",
      label: "Patient Name",
      width: "full",
      readOnly: false,
      required: false,
    },
    {
      id: "199d572e-b868-4605-b63b-5239f94a1945",
      key: "relation",
      type: "select",
      label: "Relation",
      width: "full",
      options: [
        { label: "Family", value: "family" },
        { label: "Friend", value: "friend" },
      ],
      readOnly: false,
      required: false,
    },
    {
      id: "476a8f9c-d09d-4594-a1e4-d366b8fd50c4",
      key: "visit_date",
      type: "date",
      label: "Visit Date",
      width: "full",
      readOnly: false,
      required: false,
    },
    {
      id: "894af63e-9027-4757-b6eb-f18519f8390b",
      key: "number_of_visitors",
      type: "number",
      label: "Number of Visitors",
      width: "full",
      readOnly: false,
      required: false,
    },
  ],
};

export const MOCK_VISITOR_ENTRY_POINT = {
  id: "d33bb9b8-5021-4692-b40d-1f7cae10ebee",
  resourceType: "cmmn",
  resourceKey: "visitor-case-process-2-0",
  startEventId: null,
  requiresStartForm: true,
  application: {
    id: "4cb06f78-f1b3-4597-973c-514ecdd9903c",
    key: "visitor-case-application-2-0",
    name: "Visitor Case Application 2.0",
    version: "1.0.2",
  },
  deploymentId: "a6e5660d-91c3-4f5f-a2c8-0ee1777c91fb",
  environment: {
    id: "f03aa13d-2ab8-4d1b-80e9-7935f3804dc1",
    name: "Development",
    stage: "development",
  },
  startForm: {
    key: "visitor-form",
    name: "Visitor Form",
    version: 2,
    uiSchema: VISITOR_UI_SCHEMA,
  },
};

export const L1_UI_SCHEMA: UiSchema = {
  version: 1,
  layout: "two-column",
  submitLabel: "Submit L1 Review",
  fields: [
    {
      id: "h-visitor-info",
      key: "h_visitor_info",
      type: "heading",
      label: "Visitor Submission Details",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-visitor-name",
      key: "visitor_name",
      type: "shortText",
      label: "Visitor Name",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-phone",
      key: "visitor_phone_number",
      type: "number",
      label: "Visitor Phone Number",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-patient-name",
      key: "patient_name",
      type: "shortText",
      label: "Patient Name",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-relation",
      key: "relation",
      type: "select",
      label: "Relation",
      options: [
        { label: "Family", value: "family" },
        { label: "Friend", value: "friend" },
      ],
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-visit-date",
      key: "visit_date",
      type: "date",
      label: "Visit Date",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-num-visitors",
      key: "number_of_visitors",
      type: "number",
      label: "Number of Visitors",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "h-l1-decision",
      key: "h_l1_decision",
      type: "heading",
      label: "L1 Review Decision",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-l1-decision",
      key: "l1_decision",
      type: "radio",
      label: "Approval Decision",
      required: true,
      readOnly: false,
      width: "full",
      options: [
        { label: "Approve Request (Forward to L2)", value: "approve" },
        { label: "Reject Request", value: "reject" },
      ],
    },
  ],
};

export const L2_UI_SCHEMA: UiSchema = {
  version: 1,
  layout: "two-column",
  submitLabel: "Submit Final L2 Decision",
  fields: [
    {
      id: "h-visitor-info-l2",
      key: "h_visitor_info",
      type: "heading",
      label: "Visitor Submission Details",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-visitor-name-l2",
      key: "visitor_name",
      type: "shortText",
      label: "Visitor Name",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-phone-l2",
      key: "visitor_phone_number",
      type: "number",
      label: "Visitor Phone Number",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-patient-name-l2",
      key: "patient_name",
      type: "shortText",
      label: "Patient Name",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-relation-l2",
      key: "relation",
      type: "select",
      label: "Relation",
      options: [
        { label: "Family", value: "family" },
        { label: "Friend", value: "friend" },
      ],
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-visit-date-l2",
      key: "visit_date",
      type: "date",
      label: "Visit Date",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-num-visitors-l2",
      key: "number_of_visitors",
      type: "number",
      label: "Number of Visitors",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "h-l1-audit",
      key: "h_l1_audit",
      type: "heading",
      label: "L1 Review Outcome",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-l1-decision-ro",
      key: "l1_decision",
      type: "shortText",
      label: "L1 Reviewer Decision",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "h-l2-decision",
      key: "h_l2_decision",
      type: "heading",
      label: "L2 Supervisor Final Decision",
      required: false,
      readOnly: true,
      width: "full",
    },
    {
      id: "f-l2-decision",
      key: "l2_decision",
      type: "radio",
      label: "Final Case Outcome",
      required: true,
      readOnly: false,
      width: "full",
      options: [
        { label: "Final Approval (Authorize Visitor Badge)", value: "approve" },
        { label: "Reject Request", value: "reject" },
      ],
    },
  ],
};

// In-memory simulator state store
class MockEngineStore {
  private cases: Map<string, CaseInstance> = new Map();
  private tasks: Map<string, HumanTask> = new Map();

  constructor() {
    // Start with clean state
  }

  public registerCase(instance: CaseInstance): CaseInstance {
    this.cases.set(instance.id, { ...instance });

    // Automatically create initial L1 task as per CMMN specification
    const taskId = `task-l1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const l1Task: HumanTask = {
      id: taskId,
      caseInstanceId: instance.id,
      taskDefinitionKey: "PlanItem_1jjsmp4",
      name: "L1 Review",
      status: "assigned",
      formKey: "l1-form",
      formData: { ...instance.variables },
      variables: {},
      createdAt: new Date().toISOString(),
      caseInstance: {
        id: instance.id,
        name: instance.name,
        businessKey: instance.businessKey,
        variables: instance.variables,
        status: instance.status,
        createdAt: instance.createdAt,
      },
    };
    this.tasks.set(taskId, l1Task);

    return instance;
  }

  public getCase(id: string): CaseInstance | null {
    return this.cases.get(id) || null;
  }

  public listActiveCases(): CaseInstance[] {
    return Array.from(this.cases.values()).filter(
      (c) => c.status === "active" || c.status === "ACTIVE"
    );
  }

  public listTasksByFormKey(formKey: string): HumanTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.formKey === formKey && (t.status === "assigned" || t.status === "created")
    );
  }

  public getTask(taskId: string): HumanTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // Attach current case instance data if available
    if (task.caseInstanceId && this.cases.has(task.caseInstanceId)) {
      const parentCase = this.cases.get(task.caseInstanceId)!;
      task.caseInstance = {
        id: parentCase.id,
        name: parentCase.name,
        businessKey: parentCase.businessKey,
        variables: parentCase.variables,
        status: parentCase.status,
        createdAt: parentCase.createdAt,
      };
    }
    return task;
  }

  public completeTask(
    taskId: string,
    variables: Record<string, unknown>
  ): { success: boolean; task?: HumanTask; error?: string } {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.variables = { ...task.variables, ...variables };

    const caseInstance = task.caseInstanceId ? this.cases.get(task.caseInstanceId) : null;
    if (caseInstance) {
      // Merge submitted variables to case instance
      caseInstance.variables = {
        ...caseInstance.variables,
        ...variables,
      };
      caseInstance.updatedAt = new Date().toISOString();

      // CMMN Sentry Evaluation
      if (task.formKey === "l1-form") {
        const decision = String(variables.l1_decision || "").toLowerCase();
        if (decision === "reject") {
          // Exit criterion fired
          caseInstance.status = "terminated";
          caseInstance.closedAt = new Date().toISOString();
        } else if (decision === "approve") {
          // L1 approved -> spawn L2 task
          const l2TaskId = `task-l2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const l2Task: HumanTask = {
            id: l2TaskId,
            caseInstanceId: caseInstance.id,
            taskDefinitionKey: "PlanItem_0eptewu",
            name: "L2 Senior Approval",
            status: "assigned",
            formKey: "l2-form",
            formData: { ...caseInstance.variables },
            variables: {},
            createdAt: new Date().toISOString(),
            caseInstance: {
              id: caseInstance.id,
              name: caseInstance.name,
              businessKey: caseInstance.businessKey,
              variables: caseInstance.variables,
              status: caseInstance.status,
              createdAt: caseInstance.createdAt,
            },
          };
          this.tasks.set(l2TaskId, l2Task);
        }
      } else if (task.formKey === "l2-form") {
        const decision = String(variables.l2_decision || "").toLowerCase();
        if (decision === "reject") {
          // Exit criterion fired
          caseInstance.status = "terminated";
          caseInstance.closedAt = new Date().toISOString();
        } else if (decision === "approve") {
          // Milestone "Visitor Request Approved" reached -> autoComplete completes case
          caseInstance.status = "completed";
          caseInstance.completedAt = new Date().toISOString();
          caseInstance.closedAt = new Date().toISOString();
        }
      }
    }

    return { success: true, task };
  }
}

// Global singleton for the process lifetime
declare global {
  var __mockEngineStore: MockEngineStore | undefined;
}

export const mockEngine = global.__mockEngineStore ?? new MockEngineStore();
if (process.env.NODE_ENV !== "production") {
  global.__mockEngineStore = mockEngine;
}
