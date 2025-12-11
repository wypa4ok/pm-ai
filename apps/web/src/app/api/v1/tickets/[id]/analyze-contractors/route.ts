import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../src/server/api/middleware/rate-limit";
import { searchContractorsWithAI } from "../../../../../../../../../src/server/services/contractor-service";
import { prisma } from "../../../../../../../../../src/server/db";

// GET - Retrieve saved contractor search results
export async function GET(
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
    const savedResult = await prisma.contractorSearchResult.findUnique({
      where: { ticketId },
    });

    if (!savedResult) {
      return NextResponse.json({
        found: false,
        message: "No saved contractor search results for this ticket",
      });
    }

    const searchResults = savedResult.searchResults as any;

    return NextResponse.json({
      found: true,
      analysis: savedResult.analysis,
      contractors: {
        internal: searchResults.internal || [],
        external: searchResults.external || [],
      },
      meta: {
        source: savedResult.source,
        usedExternal: savedResult.usedExternal,
        totalFound: (searchResults.internal?.length || 0) + (searchResults.external?.length || 0),
        savedAt: savedResult.createdAt,
        updatedAt: savedResult.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Get Contractor Search] Error:", error);
    return errorResponse("internal_error", "Failed to retrieve saved results", 500);
  }
}

// POST - Run new AI contractor search
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

    // Map contractors to response format
    const internalMapped = result.internalContractors.map((c) => ({
      id: c.id,
      name: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      category: c.category,
      rating: c.rating,
      source: "internal" as const,
    }));

    const externalMapped = result.externalContractors.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      website: c.website,
      rating: c.rating,
      reviewCount: c.reviewCount,
      address: c.address,
      source: "google" as const,
    }));

    // Save results to database for future retrieval
    await prisma.contractorSearchResult.upsert({
      where: { ticketId },
      create: {
        ticketId,
        analysis: result.analysis as any,
        searchResults: {
          internal: internalMapped,
          external: externalMapped,
        },
        source: result.source,
        usedExternal: result.usedExternal,
      },
      update: {
        analysis: result.analysis as any,
        searchResults: {
          internal: internalMapped,
          external: externalMapped,
        },
        source: result.source,
        usedExternal: result.usedExternal,
      },
    });

    console.log(`[AI Contractor Search] Saved search results for ticket ${ticketId}`);

    return NextResponse.json({
      analysis: result.analysis,
      contractors: {
        internal: internalMapped,
        external: externalMapped,
      },
      meta: {
        source: result.source,
        usedExternal: result.usedExternal,
        totalFound: internalMapped.length + externalMapped.length,
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
