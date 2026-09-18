import { NextRequest, NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.headers.get("cookie") || undefined;
    const body = await request.json();

    const { variables, businessKey, name, idempotencyKey, entryPointId } = body;

    if (!variables || typeof variables !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Missing required 'variables' object in request body." },
        },
        { status: 400 }
      );
    }

    // Always ensure an idempotencyKey is attached
    const finalIdempotencyKey = idempotencyKey || crypto.randomUUID();
    const finalBusinessKey = businessKey || `VIS-${Date.now()}`;

    // Public visitor endpoint: strictly do not pass visitor browser cookies to avoid cookie poisoning
    const result = await SynapArkClient.startCase({
      variables,
      businessKey: finalBusinessKey,
      name: name || `Visitor Case - ${variables.visitor_name || "New Visitor"}`,
      idempotencyKey: finalIdempotencyKey,
      entryPointId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: { message: err.message || "Failed to start visitor case" },
      },
      { status: 500 }
    );
  }
}
