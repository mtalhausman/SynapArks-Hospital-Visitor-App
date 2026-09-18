import { SynapArkResponse, CaseInstance, HumanTask } from "./types/case";
import { UiSchema } from "./types/form-schema";
import { mockEngine, L1_UI_SCHEMA, L2_UI_SCHEMA, MOCK_VISITOR_ENTRY_POINT } from "./mock-engine";

const BASE_URL = process.env.SYNAPARK_BASE_URL || "https://app.synapark.com";
const API_KEY = process.env.SYNAPARK_API_KEY || "";
const DEFAULT_ENTRY_POINT_ID =
  process.env.SYNAPARK_VISITOR_ENTRY_POINT_ID || "d33bb9b8-5021-4692-b40d-1f7cae10ebee";

function getApiKey(): string {
  return process.env.SYNAPARK_API_KEY || API_KEY || "";
}

function getBaseUrl(): string {
  return process.env.SYNAPARK_BASE_URL || BASE_URL || "https://app.synapark.com";
}

interface RequestOptions extends RequestInit {
  sessionCookie?: string;
}

function extractAuthToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedCasesCache {
  timestamp: number;
  cases: CaseInstance[];
}

let activeCasesCache: EnrichedCasesCache | null = null;
const CASES_CACHE_TTL_MS = 2500; // 2.5s TTL for deduplicating concurrent L1/L2 requests

export class SynapArkClient {
  private static getHeaders(sessionCookie?: string, skipCookie: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const apiKey = getApiKey();
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    if (sessionCookie && !skipCookie) {
      headers["Cookie"] = sessionCookie;
    }
    return headers;
  }

  /**
   * Builds headers for staff/authenticated operations (tasks, adjudication)
   * Prioritizes the staff session cookie and extracts auth_token for dual Cookie & Bearer propagation.
   */
  private static getStaffHeaders(
    sessionCookie?: string,
    authHeader?: string,
    contentType?: string
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    let token = authHeader;
    if (!token && sessionCookie) {
      const extracted = extractAuthToken(sessionCookie);
      if (extracted) {
        token = `Bearer ${extracted}`;
      }
    }

    if (token) {
      headers["Authorization"] = token;
    } else {
      const apiKey = getApiKey();
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }

    return headers;
  }

  /**
   * Discovers the Visitor Entry Point and Live Start Form
   */
  static async getEntryPoint(
    entryPointId: string = process.env.SYNAPARK_VISITOR_ENTRY_POINT_ID || DEFAULT_ENTRY_POINT_ID,
    sessionCookie?: string
  ): Promise<SynapArkResponse<any>> {
    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();

    try {
      // Entry points are public visitor interfaces. Strictly skip passing client browser cookies.
      const res = await fetch(`${baseUrl}/api/work/entry-points/${entryPointId}`, {
        method: "GET",
        headers: this.getHeaders(undefined, true),
        cache: "no-store",
      });

      const data = await res.json();
      if (data.success) {
        return data;
      }

      // If live endpoint returned error and API key is present, fail-fast
      if (apiKey) {
        return data;
      }

      // If offline/unconfigured, fallback to mock entry point schema
      return {
        success: true,
        data: MOCK_VISITOR_ENTRY_POINT,
      };
    } catch (err: any) {
      if (apiKey) {
        return {
          success: false,
          error: { message: err.message || "Failed to reach SynapArk entry point" },
        };
      }
      return {
        success: true,
        data: MOCK_VISITOR_ENTRY_POINT,
      };
    }
  }

  /**
   * Starts a new visitor case instance via the Entry Point
   */
  static async startCase(
    payload: {
      businessKey?: string;
      name?: string;
      variables: Record<string, unknown>;
      idempotencyKey: string;
      entryPointId?: string;
    },
    sessionCookie?: string
  ): Promise<SynapArkResponse<CaseInstance>> {
    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    const entryPointId = payload.entryPointId || process.env.SYNAPARK_VISITOR_ENTRY_POINT_ID || DEFAULT_ENTRY_POINT_ID;

    try {
      // Public visitor start: strictly skip passing client browser cookies to avoid 401 Unauthorized
      const res = await fetch(`${baseUrl}/api/work/entry-points/${entryPointId}/start`, {
        method: "POST",
        headers: this.getHeaders(undefined, true),
        body: JSON.stringify({
          businessKey: payload.businessKey,
          name: payload.name || "Visitor Registration",
          variables: payload.variables,
          idempotencyKey: payload.idempotencyKey,
        }),
      });

      const result = await res.json();

      if (result.success && result.data?.id) {
        // Live case successfully registered on SynapArk; do not register mock tasks
        return result;
      }

      // If API key is configured, return the live failure without diverting to mock engine
      if (apiKey) {
        return result;
      }

      // If offline/unconfigured, fallback to mock engine simulator
      const mockCase: CaseInstance = {
        id: `case-${Date.now()}`,
        status: "active",
        name: payload.name || "Visitor Registration",
        businessKey: payload.businessKey || `VISITOR-${Date.now()}`,
        variables: payload.variables,
        createdAt: new Date().toISOString(),
      };
      mockEngine.registerCase(mockCase);
      return {
        success: true,
        data: mockCase,
      };
    } catch (err: any) {
      if (apiKey) {
        return {
          success: false,
          error: { message: err.message || "Failed to connect to SynapArk workflow engine" },
        };
      }
      // Offline fallback: generate mock case instance
      const mockCase: CaseInstance = {
        id: `case-${Date.now()}`,
        status: "active",
        name: payload.name || "Visitor Registration (Offline)",
        businessKey: payload.businessKey || `VISITOR-${Date.now()}`,
        variables: payload.variables,
        createdAt: new Date().toISOString(),
      };
      mockEngine.registerCase(mockCase);

      return {
        success: true,
        data: mockCase,
      };
    }
  }

  /**
   * Fetches case instance status by ID and unwraps the full case document
   */
  static async getCaseInstance(
    id: string,
    sessionCookie?: string,
    authHeader?: string
  ): Promise<SynapArkResponse<CaseInstance>> {
    const baseUrl = getBaseUrl();
    const headers = this.getStaffHeaders(sessionCookie, authHeader);
    const hasCredentials = Boolean(sessionCookie || authHeader || getApiKey());

    // 1. Check in-memory activeCasesCache first
    if (activeCasesCache && Date.now() - activeCasesCache.timestamp < CASES_CACHE_TTL_MS) {
      const cached = activeCasesCache.cases.find((c) => c.id === id);
      if (cached) {
        return {
          success: true,
          data: cached,
        };
      }
    }

    // 2. Query SynapArk live endpoint
    try {
      const res = await fetch(`${baseUrl}/api/cases/instances/${id}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        const raw = await res.json();
        const rawPayload = raw.data !== undefined ? raw.data : raw;

        let caseObj: any = null;

        if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
          if (rawPayload.instance && typeof rawPayload.instance === "object") {
            // Nested { instance: {...}, history: [...] } or { instance: {...}, events: [...] }
            caseObj = {
              ...rawPayload.instance,
              history: rawPayload.history || rawPayload.instance.history || [],
              events: rawPayload.events || rawPayload.instance.events || [],
              planItems: rawPayload.planItems || rawPayload.instance.planItems || rawPayload.tasks || [],
            };
          } else {
            caseObj = { ...rawPayload };
          }
        } else if (Array.isArray(rawPayload)) {
          // If rawPayload is an array of event logs or plan items
          const foundInstance = rawPayload.find((el: any) => el && (el.caseInstance || el.instance));
          const base = foundInstance?.caseInstance || foundInstance?.instance || {};
          caseObj = {
            id,
            status: base.status || "active",
            variables: base.variables || {},
            events: rawPayload,
            planItems: rawPayload,
            ...base,
          };
        }

        if (caseObj) {
          caseObj.id = caseObj.id || id;
          caseObj.variables = caseObj.variables || {};

          // Extract any variables and terminal events attached
          const allEvents = [
            ...(Array.isArray(caseObj.events) ? caseObj.events : []),
            ...(Array.isArray(caseObj.history) ? caseObj.history : []),
            ...(Array.isArray(caseObj.planItems) ? caseObj.planItems : []),
          ];

          for (const ev of allEvents) {
            if (ev && typeof ev === "object") {
              if (ev.variables && typeof ev.variables === "object") {
                Object.assign(caseObj.variables, ev.variables);
              }
              if (ev.formData && typeof ev.formData === "object") {
                Object.assign(caseObj.variables, ev.formData);
              }
              if (
                ev.eventType === "case_completed" ||
                ev.eventType === "milestone_reached" ||
                ev.sentryId === "Sentry_1w9pyhb" ||
                ev.criterionId === "EntryCriterion_1nz2zgq" ||
                (ev.planItemId === "PlanItem_1638h51" && (ev.state === "completed" || ev.status === "completed"))
              ) {
                caseObj.status = "completed";
              } else if (
                ev.eventType === "case_terminated" ||
                ev.eventType === "exit_criterion_triggered" ||
                Boolean(ev.criterionId && String(ev.criterionId).toLowerCase().includes("exit")) ||
                Boolean(ev.sentryId && String(ev.sentryId).toLowerCase().includes("exit")) ||
                ev.criterionType === "exit" ||
                ev.sentryId === "Sentry_0a348c3" ||
                ev.criterionId === "ExitCriterion_1rx48w6" ||
                ev.state === "terminated" ||
                ev.status === "terminated"
              ) {
                caseObj.status = "terminated";
              }
            }
          }

          // Enforce strict terminal state integrity based on decision variables
          const vL1 = String(caseObj.variables?.l1_decision || "").toLowerCase().trim();
          const vL2 = String(caseObj.variables?.l2_decision || "").toLowerCase().trim();
          if (vL1 === "reject" || vL2 === "reject") {
            caseObj.status = "terminated";
          } else if (vL1 === "approve" && vL2 === "approve") {
            caseObj.status = "completed";
          }

          return {
            success: true,
            data: caseObj as CaseInstance,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[SynapArk Client] getCaseInstance live fetch error:`, err.message);
    }

    // 3. Fallback to in-memory engine simulator only for local synthetic cases or unconfigured offline mode
    if (!hasCredentials || id.startsWith("case-")) {
      const localCase = mockEngine.getCase(id);
      if (localCase) {
        return {
          success: true,
          data: localCase,
        };
      }
    }

    return {
      success: false,
      error: { message: `Case instance ${id} not found` },
    };
  }

  /**
   * Lists tasks for L1 or L2 stage by inspecting live active case instances on SynapArk CMMN engine
   */
  /**
   * Helper to filter tasks for stage (l1 or l2) from an array of enriched case instances
   */
  private static filterTasksForStage(cases: CaseInstance[], stage: "l1" | "l2"): HumanTask[] {
    const targetFormKey = stage === "l1" ? "l1-form" : "l2-form";
    const liveTasks: HumanTask[] = [];

    for (const caseInst of cases) {
      const taskList = caseInst.tasks || (caseInst as any).humanTasks || (caseInst as any).planItems;
      if (Array.isArray(taskList)) {
        for (const t of taskList) {
          const matchesStage =
            t.formKey === targetFormKey ||
            (stage === "l1" &&
              (t.taskDefinitionKey === "PlanItem_1jjsmp4" ||
                t.name?.toLowerCase().includes("l1") ||
                t.name?.toLowerCase().includes("triage"))) ||
            (stage === "l2" &&
              (t.taskDefinitionKey === "PlanItem_0eptewu" ||
                t.name?.toLowerCase().includes("l2") ||
                t.name?.toLowerCase().includes("senior")));

          const isPending =
            t.status !== "completed" &&
            t.status !== "COMPLETED" &&
            t.status !== "terminated" &&
            t.status !== "TERMINATED";

          if (matchesStage && isPending) {
            liveTasks.push({
              id: String(t.id), // Real runtime task instance ID provided by SynapArk
              caseInstanceId: caseInst.id,
              taskDefinitionKey:
                t.taskDefinitionKey || (stage === "l1" ? "PlanItem_1jjsmp4" : "PlanItem_0eptewu"),
              name: t.name || (stage === "l1" ? "L1 Review" : "L2 Approval"),
              status: t.status || "assigned",
              formKey: t.formKey || targetFormKey,
              formData: t.formData || caseInst.variables || {},
              variables: t.variables || {},
              createdAt: t.createdAt || caseInst.createdAt,
              caseInstance: {
                id: caseInst.id,
                name: caseInst.name,
                businessKey: caseInst.businessKey,
                variables: caseInst.variables || {},
                status: caseInst.status,
                createdAt: caseInst.createdAt,
              },
            });
          }
        }
      }
    }
    return liveTasks;
  }

  /**
   * Lists tasks for L1 or L2 stage by inspecting live active case instances on SynapArk CMMN engine.
   * Optimized with short-lived deduplicating cache and concurrent batching to avoid N+1 waterfalls.
   */
  static async listTasks(
    stage: "l1" | "l2",
    sessionCookie?: string,
    authHeader?: string
  ): Promise<HumanTask[]> {
    const targetFormKey = stage === "l1" ? "l1-form" : "l2-form";
    const baseUrl = getBaseUrl();
    const headers = this.getStaffHeaders(sessionCookie, authHeader);
    const hasCredentials = Boolean(sessionCookie || authHeader || getApiKey());

    // 0. Check in-memory short-lived cache (TTL: 2.5s) to satisfy concurrent L1/L2 polling instantly
    if (activeCasesCache && Date.now() - activeCasesCache.timestamp < CASES_CACHE_TTL_MS) {
      console.log(`[SynapArk Client] Serving ${stage} tasks from in-memory cache (${activeCasesCache.cases.length} cases).`);
      return this.filterTasksForStage(activeCasesCache.cases, stage);
    }

    // 1. Live SynapArk Case Discovery: Query active case instances
    try {
      console.log(`[SynapArk Client] Fetching active case instances from: ${baseUrl}/api/cases/instances?status=active`);
      const res = await fetch(`${baseUrl}/api/cases/instances?status=active&limit=50`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error(`[SynapArk Client] Failed to fetch active case instances (HTTP ${res.status}):`, errorData);
        if (hasCredentials) {
          const err = new Error(
            errorData?.error?.message || `Failed to fetch active case instances from SynapArk (HTTP ${res.status})`
          ) as any;
          err.status = res.status;
          err.details = errorData;
          throw err;
        }
      } else {
        const body = await res.json();
        const rawCases: CaseInstance[] = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body)
          ? body
          : [];

        // Only inspect cases whose status is active
        const activeCases = rawCases.filter(
          (c) => c.status === "active" || c.status === "ACTIVE"
        );

        // Check if any case already has embedded tasks/planItems in the list response
        const hasEmbeddedTasks = activeCases.some((c) => {
          const list = c.tasks || (c as any).humanTasks || (c as any).planItems;
          return Array.isArray(list) && list.length > 0;
        });

        let enrichedCases: CaseInstance[] = [];

        if (hasEmbeddedTasks) {
          // If tasks are embedded in the list response, use directly without refetching
          enrichedCases = activeCases;
        } else {
          // Concurrency pool (batch size: 8) to parallelize individual case inspection
          const BATCH_SIZE = 8;
          for (let i = 0; i < activeCases.length; i += BATCH_SIZE) {
            const batch = activeCases.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
              batch.map(async (caseInst) => {
                const existingTasks = caseInst.tasks || (caseInst as any).humanTasks || (caseInst as any).planItems;
                if (Array.isArray(existingTasks) && existingTasks.length > 0) {
                  return caseInst;
                }

                try {
                  const detailRes = await fetch(`${baseUrl}/api/cases/instances/${caseInst.id}`, {
                    method: "GET",
                    headers,
                    cache: "no-store",
                  });
                  if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    const fullCase = detailData.data || detailData;
                    return {
                      ...caseInst,
                      ...fullCase,
                      tasks: fullCase.tasks || fullCase.humanTasks || fullCase.planItems || [],
                    };
                  }
                } catch (err: any) {
                  console.warn(`[SynapArk Client] Failed to fetch details for case ${caseInst.id}:`, err.message);
                }
                return caseInst;
              })
            );
            enrichedCases.push(...batchResults);
          }
        }

        // Cache the enriched cases for short-lived deduplication (2.5s)
        activeCasesCache = {
          timestamp: Date.now(),
          cases: enrichedCases,
        };

        const liveTasks = this.filterTasksForStage(enrichedCases, stage);
        console.log(`[SynapArk Client] Discovered ${liveTasks.length} live ${stage} task(s) on SynapArk in parallel.`);
        return liveTasks;
      }
    } catch (err: any) {
      if (hasCredentials) {
        console.error(`[SynapArk Client] listTasks failed with live credentials:`, err.message);
        throw err;
      }
      console.warn(`[SynapArk Client] listTasks offline fallback:`, err.message);
    }

    // Only fallback to in-memory mock engine if no credentials are configured
    return mockEngine.listTasksByFormKey(targetFormKey);
  }

  /**
   * Retrieves task detail by taskId
   */
  static async getTask(
    taskId: string,
    sessionCookie?: string,
    authHeader?: string
  ): Promise<HumanTask | null> {
    const baseUrl = getBaseUrl();
    const headers = this.getStaffHeaders(sessionCookie, authHeader);
    const hasCredentials = Boolean(sessionCookie || authHeader || getApiKey());

    try {
      // 1. Try /api/cases/tasks/{taskId}
      const resCase = await fetch(`${baseUrl}/api/cases/tasks/${taskId}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (resCase.ok) {
        const data = await resCase.json();
        if (data.success && data.data) return data.data;
        if (data.id) return data;
      }

      // 2. Try /api/tasks/{taskId}
      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) return data.data;
        if (data.id) return data;
      }

      // 3. Fallback discovery by scanning active case instances
      const casesRes = await fetch(`${baseUrl}/api/cases/instances?status=active&limit=50`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (casesRes.ok) {
        const body = await casesRes.json();
        const caseInstances = Array.isArray(body.data) ? body.data : [];
        for (const caseInst of caseInstances) {
          let taskList = caseInst.tasks || caseInst.humanTasks || caseInst.planItems;
          if (!Array.isArray(taskList) || taskList.length === 0) {
            const detailRes = await fetch(`${baseUrl}/api/cases/instances/${caseInst.id}`, {
              method: "GET",
              headers,
              cache: "no-store",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              taskList = detailData.data?.tasks || detailData.data?.humanTasks || [];
            }
          }

          if (Array.isArray(taskList)) {
            const matched = taskList.find((t: any) => String(t.id) === taskId);
            if (matched) {
              return {
                id: String(matched.id),
                caseInstanceId: caseInst.id,
                taskDefinitionKey: matched.taskDefinitionKey,
                name: matched.name,
                status: matched.status || "assigned",
                formKey: matched.formKey || (matched.name?.includes("L2") ? "l2-form" : "l1-form"),
                formData: matched.formData || caseInst.variables || {},
                variables: matched.variables || {},
                createdAt: matched.createdAt || caseInst.createdAt,
                caseInstance: {
                  id: caseInst.id,
                  name: caseInst.name,
                  businessKey: caseInst.businessKey,
                  variables: caseInst.variables || {},
                  status: caseInst.status,
                  createdAt: caseInst.createdAt,
                },
              };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[SynapArk Client] getTask live fetch error:`, err.message);
    }

    if (!hasCredentials && taskId.startsWith("task-")) {
      return mockEngine.getTask(taskId);
    }

    return null;
  }

  /**
   * Gets UI Schema for a form key
   */
  static async getFormSchema(formKey: string, sessionCookie?: string): Promise<UiSchema | null> {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/forms/${formKey}`, {
        method: "GET",
        headers: this.getHeaders(sessionCookie),
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.uiSchema) {
          return data.data.uiSchema;
        }
      }
    } catch {
      // Fallback below
    }

    if (formKey === "l1-form") return L1_UI_SCHEMA;
    if (formKey === "l2-form") return L2_UI_SCHEMA;

    return null;
  }

  /**
   * Completes a task using explicit Claim-Before-Complete lifecycle:
   *   Step A: POST /api/cases/tasks/{id} with { "action": "claim" }
   *   Step B: POST /api/cases/tasks/{id} with { "action": "complete", "variables": ... }
   *
   * Disables silent fallback to ensure all live errors are surfaced.
   */
  static async completeTask(
    taskId: string,
    variables: Record<string, unknown>,
    sessionCookie?: string,
    authHeader?: string
  ): Promise<SynapArkResponse<any>> {
    const baseUrl = getBaseUrl();

    // Section 5.2: Strip read-only visitor fields to strictly scope decision variables
    const readOnlyKeys = new Set([
      "visitor_name",
      "visitor_phone_number",
      "patient_name",
      "relation",
      "visit_date",
      "number_of_visitors",
      "h_visitor_info",
      "h_l1_decision",
      "h_l2_decision",
    ]);

    const cleanedVariables: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(variables)) {
      if (!readOnlyKeys.has(k)) {
        cleanedVariables[k] = typeof v === "string" ? v.trim() : v;
      }
    }

    // Sentry variable casing normalization (strict lowercase for CMMN sentries)
    if (typeof cleanedVariables.l1_decision === "string") {
      cleanedVariables.l1_decision = (cleanedVariables.l1_decision as string).toLowerCase().trim();
    }
    if (typeof cleanedVariables.l2_decision === "string") {
      cleanedVariables.l2_decision = (cleanedVariables.l2_decision as string).toLowerCase().trim();
    }

    // Build staff request headers with dual Cookie & Bearer propagation
    const headers = this.getStaffHeaders(sessionCookie, authHeader, "application/json");

    console.log(`\n======================================================`);
    console.log(`[SynapArk Client] Beginning Task Lifecycle for Task ID: ${taskId}`);
    console.log(`[SynapArk Client] Endpoint: ${baseUrl}/api/cases/tasks/${taskId}`);
    console.log(`[SynapArk Client] Headers Configured:`, {
      hasCookie: Boolean(headers["Cookie"]),
      hasAuth: Boolean(headers["Authorization"]),
    });

    // Handle local mock tasks explicitly if running pure mock engine
    const isLocalMockTask = taskId.startsWith("task-") && Boolean(mockEngine.getTask(taskId));

    // STEP A: Explicit Claim
    console.log(`[SynapArk Client] [Step A: Claim] Sending POST ${baseUrl}/api/cases/tasks/${taskId}`);
    console.log(`[SynapArk Client] [Step A: Claim Payload]`, JSON.stringify({ action: "claim" }));

    try {
      const claimRes = await fetch(`${baseUrl}/api/cases/tasks/${taskId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "claim" }),
      });

      const claimData = await claimRes.json().catch(() => null);
      console.log(`[SynapArk Client] [Step A: Claim Response] HTTP ${claimRes.status}:`, claimData);

      // Check for terminal authentication / permissions / server errors on claim
      if (claimRes.status === 401 || claimRes.status === 403 || claimRes.status >= 500) {
        console.error(`[SynapArk Client] [Step A: Claim Failed with HTTP ${claimRes.status}]:`, claimData);
        return {
          success: false,
          error: {
            message: claimData?.error?.message || `Claim failed with HTTP ${claimRes.status}`,
            code: claimData?.error?.code || `HTTP_${claimRes.status}`,
            details: claimData?.error?.details || claimData,
            status: claimRes.status,
          } as any,
        };
      }
      // Note: If task is already claimed or assigned, SynapArk may return a 400 error indicating
      // "Task already claimed" or "Already assigned". We continue to Step B (complete) in that case.
    } catch (err: any) {
      console.error(`[SynapArk Client] [Step A: Claim Network Warning]:`, err.message);
    }

    // STEP B: Explicit Complete with clean variables
    const completePayload = {
      action: "complete",
      variables: cleanedVariables,
    };

    console.log(`[SynapArk Client] [Step B: Complete] Sending POST ${baseUrl}/api/cases/tasks/${taskId}`);
    console.log(`[SynapArk Client] [Step B: Complete Payload]`, JSON.stringify(completePayload, null, 2));

    try {
      const completeRes = await fetch(`${baseUrl}/api/cases/tasks/${taskId}`, {
        method: "POST",
        headers,
        body: JSON.stringify(completePayload),
      });

      const completeData = await completeRes.json().catch(() => null);
      console.log(`[SynapArk Client] [Step B: Complete Response] HTTP ${completeRes.status}:`, completeData);
      console.log(`======================================================\n`);

      if (completeRes.ok && completeData?.success) {
        // Task successfully advanced on the live CMMN engine!
        // Invalidate active cases cache so next task listing reflects completion immediately
        activeCasesCache = null;
        // Sync local mock engine state so local counts update
        mockEngine.completeTask(taskId, cleanedVariables);
        return completeData;
      }

      // If this was a local mock task, allow local mock engine fallback
      if (isLocalMockTask && completeRes.status === 404) {
        console.log(`[SynapArk Client] Task ${taskId} is a local mock task. Completing in mock engine.`);
        const localResult = mockEngine.completeTask(taskId, cleanedVariables);
        if (localResult.success) {
          return {
            success: true,
            data: localResult.task,
          };
        }
      }

      // DO NOT SILENTLY FALL BACK! Return the exact live engine failure.
      console.error(`[SynapArk Client] Live task completion failed on engine:`, {
        status: completeRes.status,
        envelope: completeData,
      });

      return {
        success: false,
        error: {
          message:
            completeData?.error?.message ||
            `SynapArk task completion failed (HTTP ${completeRes.status})`,
          code: completeData?.error?.code || `HTTP_${completeRes.status}`,
          details: completeData?.error?.details || completeData,
          status: completeRes.status,
        } as any,
      };
    } catch (err: any) {
      console.error(`[SynapArk Client] Complete Task Network Error:`, err);
      console.log(`======================================================\n`);

      if (isLocalMockTask) {
        const localResult = mockEngine.completeTask(taskId, cleanedVariables);
        if (localResult.success) {
          return { success: true, data: localResult.task };
        }
      }

      return {
        success: false,
        error: {
          message: err.message || "Failed to reach SynapArk workflow engine",
          code: "NETWORK_ERROR",
        },
      };
    }
  }
}
