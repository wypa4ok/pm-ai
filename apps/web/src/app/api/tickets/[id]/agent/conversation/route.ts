export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import {
  getActiveConversation,
  createConversation,
} from "../../../../../../../../../src/server/services/agent-conversation-service";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const conversation = await getActiveConversation(params.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // For now, use a placeholder userId since these routes don't have auth
    const result = await createConversation(params.id, "system");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
