export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../../src/server/api/middleware/rate-limit";
import {
  getActiveConversation,
  createConversation,
} from "../../../../../../../../../../src/server/services/agent-conversation-service";

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

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

  try {
    const conversation = await getActiveConversation(params.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get conversation";
    return errorResponse("internal_error", message, 500);
  }
}

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

  try {
    const result = await createConversation(params.id, authed.auth.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    return errorResponse("internal_error", message, 500);
  }
}
