import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import * as tenancyService from "~/server/services/tenancy-service";
import { getUserRoles } from "~/server/services/user-roles";

export async function GET(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  // Get user roles from database
  const roles = await getUserRoles(authed.auth.user.id);

  // Enforce OWNER role
  if (!roles.includes("OWNER")) {
    return errorResponse(
      "forbidden",
      "Only property owners can access tenants",
      403
    );
  }

  // Parse pagination parameters
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  // CRITICAL: Filter tenants by authenticated user to prevent cross-landlord data leakage
  const tenants = await tenancyService.listTenants({
    ownerUserId: authed.auth.user.id,
    limit,
    offset,
  });

  return NextResponse.json({
    tenants,
    pagination: {
      page,
      limit,
      hasMore: tenants.length === limit,
    },
  });
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
