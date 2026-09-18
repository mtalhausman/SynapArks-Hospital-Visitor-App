import { NextResponse } from "next/server";
import { SynapArkClient } from "@/lib/synapark-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entryPointRes = await SynapArkClient.getEntryPoint();
    const isLive = entryPointRes.success === true;

    return NextResponse.json({
      success: true,
      connected: isLive,
      baseUrl: process.env.SYNAPARK_BASE_URL || "https://app.synapark.com",
      entryPointId: process.env.SYNAPARK_VISITOR_ENTRY_POINT_ID,
      liveDetails: isLive ? entryPointRes.data : null,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      connected: false,
      error: err.message,
    });
  }
}
