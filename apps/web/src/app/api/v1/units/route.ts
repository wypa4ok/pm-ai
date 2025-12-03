import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { applyCors } from "~/server/api/middleware/cors";
import { rateLimit } from "~/server/api/middleware/rate-limit";
import * as unitService from "~/server/services/unit-service";
import { getUserRoles } from "~/server/services/user-roles";

const createSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  notes: z.string().optional().nullable(),
});

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
      "Only property owners can access units",
      403
    );
  }

  const units = await unitService.listUnits();

  return NextResponse.json({
    units,
  });
}

export async function POST(request: NextRequest) {
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
      "Only property owners can create units",
      403
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400
    );
  }

  const data = parsed.data;

  const unit = await unitService.createUnit({
    name: data.name,
    address1: data.address1,
    address2: data.address2 ?? undefined,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    notes: data.notes ?? undefined,
  });

  return NextResponse.json(
    {
      unit,
    },
    { status: 201 }
  );
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
