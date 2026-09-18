import { NextRequest, NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionCookie = request.headers.get("cookie") || undefined;
  const authHeader = request.headers.get("authorization") || undefined;
  const stage = (request.nextUrl.searchParams.get("stage") || "l1").toLowerCase();

  if (stage !== "l1" && stage !== "l2") {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Invalid stage. Expected 'l1' or 'l2'." },
      },
      { status: 400 }
    );
  }

  try {
    const tasks = await SynapArkClient.listTasks(stage, sessionCookie, authHeader);
    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (err: any) {
    console.error(`[SynapArk Tasks Route] Failed to fetch ${stage} tasks:`, err);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: err.message || "Failed to list tasks",
          code: err.code || (err.status ? `HTTP_${err.status}` : "TASK_LIST_ERROR"),
          details: err.details,
        },
      },
      { status: err.status || 500 }
    );
  }
}
