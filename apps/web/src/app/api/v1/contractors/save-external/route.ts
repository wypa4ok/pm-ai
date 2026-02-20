export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../src/server/api/middleware/rate-limit";
import { saveExternalContractor } from "../../../../../../../../src/server/services/contractor-service";
import type { ContractorCategory } from "@prisma/client";

const saveExternalContractorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  address: z.string().optional(),
  category: z.enum([
    "PLUMBING",
    "ELECTRICAL",
    "HVAC",
    "CARPENTRY",
    "PAINTING",
    "ROOFING",
    "LANDSCAPING",
    "APPLIANCE_REPAIR",
    "PEST_CONTROL",
    "GENERAL",
    "CLEANING",
    "OTHER",
  ] as const).optional(),
});

export async function POST(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  try {
    const json = await request.json();
    const parsed = saveExternalContractorSchema.safeParse(json);

    if (!parsed.success) {
      const fieldErrors = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      return errorResponse("invalid_request", fieldErrors || "Validation failed", 400);
    }

    const { name, phone, email, website, rating, reviewCount, address, category } = parsed.data;

    console.log(`[Save External Contractor] Saving "${name}" to internal database`);

    // Save to database
    const contractor = await saveExternalContractor(
      {
        id: `external-${Date.now()}`, // Temporary ID for external profile type
        name,
        phone: phone || undefined,
        email: email || undefined,
        website: website || undefined,
        rating: rating || undefined,
        reviewCount: reviewCount || undefined,
        address: address || undefined,
        source: "google",
      },
      category as ContractorCategory | undefined,
    );

    console.log(`[Save External Contractor] Saved contractor with ID ${contractor.id}`);

    return NextResponse.json({
      id: contractor.id,
      name: contractor.companyName,
      contactName: contractor.contactName,
      phone: contractor.phone,
      email: contractor.email,
      category: contractor.category,
      rating: contractor.rating,
      source: "internal",
    });
  } catch (error) {
    console.error("[Save External Contractor] Error:", error);

    if (error instanceof Error) {
      return errorResponse("internal_error", error.message, 500);
    }

    return errorResponse(
      "internal_error",
      "An unexpected error occurred while saving the contractor",
      500,
    );
  }
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
