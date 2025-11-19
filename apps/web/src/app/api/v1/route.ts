import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "../../../../src/server/api/errors";
import { withAuth } from "../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../src/server/api/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  return NextResponse.json({
    status: "ok",
    version: "v1",
    user: authed.auth.user,
  });
}

export function POST() {
  return errorResponse("method_not_allowed", "Use GET", 405);
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
