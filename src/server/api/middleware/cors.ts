import { NextRequest, NextResponse } from "next/server";

const DEFAULT_HEADERS = {
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-credentials": "true",
};

export function applyCors(
  request: NextRequest,
  allowedOrigins: string[] = [],
): NextResponse | null {
  const origin = request.headers.get("origin") ?? "";
  const allowAll = allowedOrigins.includes("*");
  const allowed =
    allowAll || allowedOrigins.some((allowedOrigin) => origin === allowedOrigin);

  const headers = new Headers(DEFAULT_HEADERS);
  if (allowed) {
    headers.set("access-control-allow-origin", origin);
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  // Only set CORS headers for allowed origins; otherwise return null to continue.
  return allowed ? null : null;
}

export function withCors(
  request: NextRequest,
  allowedOrigins: string[] = [],
): NextResponse | undefined {
  const origin = request.headers.get("origin") ?? "";
  const allowAll = allowedOrigins.includes("*");
  const allowed =
    allowAll || allowedOrigins.some((allowedOrigin) => origin === allowedOrigin);
  const headers = new Headers(DEFAULT_HEADERS);

  if (allowed) {
    headers.set("access-control-allow-origin", origin);
  }

  for (const [key, value] of headers) {
    request.headers.set(key, value);
  }

  return undefined;
}
