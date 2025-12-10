import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../src/server/api/middleware/rate-limit";
import { generateContractorOutreach } from "../../../../../../../../../src/server/ai/message-generator";
import { getContractorById } from "../../../../../../../../../src/server/services/contractor-service";
import { searchExternalContractors } from "../../../../../../../../../src/server/integrations/contractor-search";

const draftMessageSchema = z.object({
  contractorId: z.string().min(1),
  contractorSource: z.enum(["internal", "google"]).default("internal"),
  tone: z.enum(["formal", "friendly", "urgent"]).optional(),
  // For Google contractors, we need additional info since they're not in our DB
  contractorData: z
    .object({
      name: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const ticketId = params.id;

  try {
    const json = await request.json();
    const parsed = draftMessageSchema.safeParse(json);

    if (!parsed.success) {
      const fieldErrors = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      return errorResponse("invalid_request", fieldErrors || "Validation failed", 400);
    }

    const { contractorId, contractorSource, tone, contractorData } = parsed.data;

    console.log(
      `[AI Message Generator] Generating outreach for ticket ${ticketId}, contractor ${contractorId} (${contractorSource})`,
    );

    // Get contractor data
    let contractor;

    if (contractorSource === "internal") {
      // Fetch from internal database
      contractor = await getContractorById(contractorId);

      if (!contractor) {
        return errorResponse(
          "not_found",
          `Contractor ${contractorId} not found in database`,
          404,
        );
      }
    } else {
      // Use provided contractor data from Google
      if (!contractorData) {
        return errorResponse(
          "invalid_request",
          "contractorData is required for Google contractors",
          400,
        );
      }

      contractor = {
        id: contractorId,
        name: contractorData.name,
        phone: contractorData.phone,
        email: contractorData.email,
        website: contractorData.website,
        rating: contractorData.rating,
        reviewCount: contractorData.reviewCount,
        address: contractorData.address,
        source: "google" as const,
      };
    }

    // Generate AI message
    const message = await generateContractorOutreach({
      ticketId,
      contractor,
      tone,
    });

    console.log(`[AI Message Generator] Generated message for ${contractor.name}`);

    return NextResponse.json({
      subject: message.subject,
      body: message.body,
      metadata: message.metadata,
    });
  } catch (error) {
    console.error("[AI Message Generator] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        return errorResponse(
          "configuration_error",
          "OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.",
          500,
        );
      }

      if (error.message.includes("not found")) {
        return errorResponse("not_found", error.message, 404);
      }

      return errorResponse("internal_error", error.message, 500);
    }

    return errorResponse(
      "internal_error",
      "An unexpected error occurred while generating the message",
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
