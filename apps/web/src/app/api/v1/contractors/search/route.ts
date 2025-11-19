import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../src/server/api/middleware/rate-limit";
import { searchExternalContractors } from "../../../../../../src/server/integrations/contractor-search";

const querySchema = z.object({
  category: z.string().optional(),
  term: z.string().optional(),
  location: z.string().optional(),
  limit: z.coerce.number().min(1).max(10).optional(),
});

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function GET(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    term: searchParams.get("term") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  const inputs = parsed.data;
  const category = inputs.category ?? "handyman";
  const term = inputs.term ?? "handyman";
  const location = inputs.location ?? "Saint John, NB, Canada";
  const limit = inputs.limit ?? 5;

  const cacheKey = `${category}:${term}:${location}:${limit}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.value);
  }

  const contractors = await searchExternalContractors({
    category,
    term,
    location,
    limit,
  });

  const payload = { contractors };
  cache.set(cacheKey, { value: payload, expiresAt: now + TTL_MS });

  return NextResponse.json(payload);
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
