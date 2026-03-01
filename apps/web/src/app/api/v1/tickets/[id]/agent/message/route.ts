export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "../../../../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../../../src/server/api/middleware/rate-limit";
import { sendMessage } from "../../../../../../../../../../src/server/services/agent-conversation-service";

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
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
    const body = await request.json();
    const { conversationId, message } = body as {
      conversationId: string;
      message: string;
    };

    if (!conversationId || !message) {
      return errorResponse(
        "validation_error",
        "conversationId and message are required",
        400,
      );
    }

    const result = await sendMessage(
      conversationId,
      params.id,
      authed.auth.user.id,
      message,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    return errorResponse("internal_error", message, 500);
  }
}
