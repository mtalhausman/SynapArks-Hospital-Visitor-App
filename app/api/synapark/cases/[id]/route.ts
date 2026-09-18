import { NextRequest, NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.headers.get("cookie") || undefined;
  const authHeader = request.headers.get("authorization") || undefined;

  const result = await SynapArkClient.getCaseInstance(id, sessionCookie, authHeader);

  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
