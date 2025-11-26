import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import * as tenancyService from "~/server/services/tenancy-service";

export async function GET(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Enforce OWNER role
  if (!authed.auth.roles.includes("OWNER")) {
    return errorResponse(
      "forbidden",
      "Only property owners can access tenants",
      403
    );
  }

  const tenants = await tenancyService.listTenants();

  return NextResponse.json({
    tenants,
  });
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
