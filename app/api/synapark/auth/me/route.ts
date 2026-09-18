import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.SYNAPARK_BASE_URL || "https://app.synapark.com";
const API_KEY = process.env.SYNAPARK_API_KEY || "";

export async function GET(request: NextRequest) {
  const sessionCookie = request.headers.get("cookie") || "";
  const authHeader = request.headers.get("authorization") || (API_KEY ? `Bearer ${API_KEY}` : "");

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;
    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Ignore and return fallback
  }

  // Fallback demo user
  return NextResponse.json({
    success: true,
    data: {
      userId: "demo-agent-01",
      email: "agent@blockmindark.com",
      displayName: "Staff Portal Agent",
      roles: ["l1", "l2"],
      permissions: ["case:start", "task:complete"],
    },
  });
}
