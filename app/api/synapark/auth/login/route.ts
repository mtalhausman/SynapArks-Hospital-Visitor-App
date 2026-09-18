import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.SYNAPARK_BASE_URL || "https://app.synapark.com";

/**
 * Parses an upstream Set-Cookie header string into components suitable for NextResponse.cookies.set.
 * Strips upstream Domain restrictions and forces secure: false for localhost dev compatibility.
 */
function parseSetCookie(cookieStr: string) {
  const parts = cookieStr.split(";").map((p) => p.trim());
  const [firstPart, ...attrs] = parts;
  const equalIdx = firstPart.indexOf("=");
  if (equalIdx === -1) return null;

  const name = firstPart.slice(0, equalIdx).trim();
  const value = firstPart.slice(equalIdx + 1).trim();

  const options: {
    path: string;
    maxAge?: number;
    expires?: Date;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
  } = {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // Ensure localhost dev compatibility
  };

  for (const attr of attrs) {
    const [attrKey, ...attrVals] = attr.split("=");
    const keyLower = attrKey.trim().toLowerCase();
    const val = attrVals.join("=").trim();

    if (keyLower === "path") {
      options.path = val || "/";
    } else if (keyLower === "max-age") {
      const num = parseInt(val, 10);
      if (!isNaN(num)) options.maxAge = num;
    } else if (keyLower === "expires") {
      const expDate = new Date(val);
      if (!isNaN(expDate.getTime())) options.expires = expDate;
    } else if (keyLower === "httponly") {
      options.httpOnly = true;
    } else if (keyLower === "samesite") {
      const ssLower = val.toLowerCase();
      if (ssLower === "lax" || ssLower === "strict" || ssLower === "none") {
        options.sameSite = ssLower;
      }
    }
    // Intentionally omit Domain so the browser attaches the cookie to localhost
  }

  return { name, value, options };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, mfaCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: "Email and password are required." } },
        { status: 400 }
      );
    }

    console.log(`\n======================================================`);
    console.log(`[Staff Auth Login] Forwarding login request to SynapArk: ${email}`);
    console.log(`[Staff Auth Login] Target Endpoint: ${BASE_URL}/api/auth/login`);

    const upstreamRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password, mfaCode }),
    });

    console.log(`[Staff Auth Login] SynapArk returned status: ${upstreamRes.status}`);

    // Capture raw response body
    const data = await upstreamRes.json().catch(() => null);

    // If SynapArk returns an error status (e.g. 400 or 401), return exact error envelope without fallback
    if (!upstreamRes.ok || !data?.success) {
      console.error(`[Staff Auth Login] SynapArk rejected authentication (HTTP ${upstreamRes.status}):`, data);
      console.log(`======================================================\n`);
      return NextResponse.json(
        data || { success: false, error: { message: `Authentication failed (HTTP ${upstreamRes.status})` } },
        { status: upstreamRes.status || 401 }
      );
    }

    // Success response construct
    const response = NextResponse.json(data, { status: upstreamRes.status });

    // 1. Extract all upstream cookies
    const upstreamCookies: string[] =
      typeof upstreamRes.headers.getSetCookie === "function"
        ? upstreamRes.headers.getSetCookie()
        : [upstreamRes.headers.get("set-cookie")].filter(Boolean) as string[];

    console.log(`[Staff Auth Login] Upstream set-cookie headers received:`, upstreamCookies);

    let cookieApplied = false;
    for (const cookieStr of upstreamCookies) {
      const parsed = parseSetCookie(cookieStr);
      if (parsed) {
        console.log(`[Staff Auth Login] Applying parsed cookie onto response: ${parsed.name}`);
        response.cookies.set(parsed.name, parsed.value, parsed.options);
        cookieApplied = true;
      }
    }

    // 2. Check if JSON response body contains an auth token directly
    const responsePayload = data.data || data;
    const bodyToken =
      responsePayload?.token ||
      responsePayload?.accessToken ||
      responsePayload?.jwt ||
      responsePayload?.authToken ||
      data?.token ||
      data?.accessToken ||
      data?.jwt;

    if (bodyToken && typeof bodyToken === "string") {
      console.log(`[Staff Auth Login] Found auth token directly in JSON body. Setting 'auth_token' cookie.`);
      response.cookies.set("auth_token", bodyToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: false, // Ensure localhost dev compatibility
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      cookieApplied = true;
    }

    // Log the final cookies attached to the outgoing NextResponse
    console.log(
      `[Staff Auth Login] Final cookies attached to outgoing NextResponse:`,
      response.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value ? `${c.value.substring(0, 15)}...` : "(empty)",
        path: c.path,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        secure: c.secure,
      }))
    );
    console.log(`======================================================\n`);

    return response;
  } catch (err: any) {
    console.error(`[Staff Auth Login] Exception during authentication flow:`, err);
    console.log(`======================================================\n`);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Authentication failed due to internal error" } },
      { status: 500 }
    );
  }
}
