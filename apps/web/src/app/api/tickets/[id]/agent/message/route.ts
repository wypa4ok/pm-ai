export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { sendMessage } from "../../../../../../../../../src/server/services/agent-conversation-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { conversationId, message } = body as {
      conversationId: string;
      message: string;
    };

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "conversationId and message are required" },
        { status: 400 },
      );
    }

    const result = await sendMessage(conversationId, params.id, "system", message);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    console.error("Send message error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
