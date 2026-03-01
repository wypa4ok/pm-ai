export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../../../../src/server/api/middleware/rate-limit";
import { resolveProposal } from "../../../../../../../../../../../../src/server/services/agent-conversation-service";

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; proposalId: string } },
) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  try {
    const body = await request.json();
    const { action } = body as { action: "accept" | "reject" };

    if (action !== "accept" && action !== "reject") {
      return errorResponse(
        "validation_error",
        'action must be "accept" or "reject"',
        400,
      );
    }

    const proposal = await resolveProposal(
      params.proposalId,
      authed.auth.user.id,
      action,
      params.id,
    );

    return NextResponse.json({ proposal });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve proposal";
    return errorResponse("internal_error", message, 500);
  }
}
