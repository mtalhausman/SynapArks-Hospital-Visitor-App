/**
 * SynapArk CMMN Case & Task Types
 */

export interface SynapArkSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface SynapArkErrorEnvelope {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export type SynapArkResponse<T> = SynapArkSuccessEnvelope<T> | SynapArkErrorEnvelope;

export type CaseInstanceStatus =
  | "active"
  | "completed"
  | "terminated"
  | "failed"
  | "suspended"
  | "closed"
  | string;

export interface CaseInstance {
  id: string;
  organizationId?: string;
  caseDefinitionId?: string;
  applicationId?: string;
  environmentId?: string;
  applicationVersionId?: string;
  deploymentId?: string;
  businessKey?: string;
  name?: string;
  status: CaseInstanceStatus;
  startUserId?: string;
  ownerId?: string;
  parentCaseInstanceId?: string | null;
  variables: Record<string, unknown>;
  metadata?: {
    cmmnCaseId?: string;
    autoComplete?: boolean;
    caseFileKeys?: string[];
  };
  startedAt?: string;
  completedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Included in detailed response if present
  tasks?: HumanTask[];
}

export interface HumanTask {
  id: string;
  caseInstanceId?: string;
  processInstanceId?: string;
  executionId?: string;
  taskDefinitionKey?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status: "created" | "assigned" | "claimed" | "completed" | "terminated" | string;
  priority?: "low" | "medium" | "high" | "critical" | string;
  assigneeId?: string | null;
  ownerId?: string | null;
  formKey: string | null; // e.g. "l1-form", "l2-form", "visitor-form"
  formData?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  // Associated case instance summary if joined
  caseInstance?: {
    id: string;
    name?: string;
    businessKey?: string;
    variables?: Record<string, unknown>;
    status?: string;
    createdAt?: string;
  };
}

/**
 * Normalized UI Status for Receptionist Watcher
 */
export type ResolvedCaseStatus =
  | "pending_l1"    // Awaiting L1 Review
  | "pending_l2"    // Awaiting L2 Review
  | "approved"      // Completed milestone reached
  | "rejected"      // Terminated sentry fired
  | "unknown";      // Undetermined state
