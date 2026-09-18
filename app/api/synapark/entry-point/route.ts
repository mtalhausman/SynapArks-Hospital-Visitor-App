import { NextRequest, NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const entryPointId = request.nextUrl.searchParams.get("entryPointId") || undefined;

  // Public visitor endpoint: strictly do not forward browser cookies to avoid cookie collisions
  const result = await SynapArkClient.getEntryPoint(entryPointId);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
