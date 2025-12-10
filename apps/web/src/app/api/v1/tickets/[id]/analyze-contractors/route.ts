import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../src/server/api/middleware/rate-limit";
import { searchContractorsWithAI } from "../../../../../../../../../src/server/services/contractor-service";

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
    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const forceExternal = body.forceExternal === true;

    console.log(`[AI Contractor Search] Analyzing ticket ${ticketId} (forceExternal: ${forceExternal})`);

    // Execute AI-powered contractor search
    const result = await searchContractorsWithAI({
      ticketId,
      forceExternal,
    });

    console.log(
      `[AI Contractor Search] Found ${result.internalContractors.length} internal, ${result.externalContractors.length} external contractors`,
    );

    return NextResponse.json({
      analysis: result.analysis,
      contractors: {
        internal: result.internalContractors.map((c) => ({
          id: c.id,
          name: c.company,
          contactName: c.contactName,
          phone: c.phone,
          email: c.email,
          category: c.category,
          rating: c.rating,
          source: "internal",
        })),
        external: result.externalContractors.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          website: c.website,
          rating: c.rating,
          reviewCount: c.reviewCount,
          address: c.address,
          source: "google",
        })),
      },
      meta: {
        source: result.source,
        usedExternal: result.usedExternal,
        totalFound: result.internalContractors.length + result.externalContractors.length,
      },
    });
  } catch (error) {
    console.error("[AI Contractor Search] Error:", error);

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
      "An unexpected error occurred while analyzing the ticket",
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
