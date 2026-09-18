import { NextRequest, NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.headers.get("cookie") || undefined;
  const authHeader = request.headers.get("authorization") || undefined;

  const task = await SynapArkClient.getTask(id, sessionCookie, authHeader);
  if (!task) {
    return NextResponse.json(
      {
        success: false,
        error: { message: `Task ${id} not found.` },
      },
      { status: 404 }
    );
  }

  // Resolve form schema for this task's formKey
  const formKey = task.formKey || (task.name.includes("L2") ? "l2-form" : "l1-form");
  const schema = await SynapArkClient.getFormSchema(formKey, sessionCookie);

  if (!schema) {
    return NextResponse.json(
      {
        success: false,
        error: { message: `Form schema for '${formKey}' not found.` },
      },
      { status: 404 }
    );
  }

  // Prepare prefill values from task formData or parent caseInstance variables
  const initialValues: Record<string, unknown> = {
    ...(task.caseInstance?.variables || {}),
    ...(task.formData || {}),
    ...(task.variables || {}),
  };

  return NextResponse.json({
    success: true,
    data: {
      task,
      schema,
      initialValues,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.headers.get("cookie") || undefined;
  const authHeader = request.headers.get("authorization") || undefined;

  // 1. Verify Task Identifier Integrity
  if (
    id.startsWith("PlanItem_") ||
    id.startsWith("HumanTask_") ||
    id.endsWith("-form") ||
    id.includes(" ")
  ) {
    console.error(`[SynapArk API Route] Invalid task identifier provided: "${id}". Must be a runtime task instance UUID.`);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: `Invalid task identifier "${id}". Expected a runtime task instance ID, not a CMMN definition key or form contract.`,
          code: "INVALID_TASK_IDENTIFIER",
        },
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const variables: Record<string, unknown> = { ...(body.variables || {}) };

    // 2. Normalize Variable Casing for CMMN Sentries (e.g. Sentry_1hjmeh9: l1_decision == "approve")
    if (typeof variables.l1_decision === "string") {
      variables.l1_decision = variables.l1_decision.toLowerCase().trim();
    }
    if (typeof variables.l2_decision === "string") {
      variables.l2_decision = variables.l2_decision.toLowerCase().trim();
    }

    console.log(`\n======================================================`);
    console.log(`[SynapArk API Route] POST /api/synapark/tasks/${id} received`);
    console.log(`[SynapArk API Route] Session Cookie present: ${Boolean(sessionCookie)}`);
    console.log(`[SynapArk API Route] Auth Header present: ${Boolean(authHeader)}`);
    console.log(`[SynapArk API Route] Variables to submit:`, JSON.stringify(variables, null, 2));

    // 3. Execute claim and complete sequence via SynapArkClient
    const result = await SynapArkClient.completeTask(id, variables, sessionCookie, authHeader);

    if (!result.success) {
      const errorStatus = (result.error as any)?.status || 400;
      console.error(`[SynapArk API Route] Task ${id} completion rejected (HTTP ${errorStatus}):`, result.error);
      console.log(`======================================================\n`);
      return NextResponse.json(result, { status: errorStatus });
    }

    console.log(`[SynapArk API Route] Task ${id} successfully completed on live engine:`, result);
    console.log(`======================================================\n`);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[SynapArk API Route] Unexpected exception in task completion handler:`, err);
    console.log(`======================================================\n`);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: err.message || "Failed to complete task due to internal error",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
