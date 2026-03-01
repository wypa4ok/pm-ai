export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { resolveProposal } from "../../../../../../../../../../../src/server/services/agent-conversation-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string; proposalId: string } },
) {
  try {
    const body = await request.json();
    const { action } = body as { action: "accept" | "reject" };

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "accept" or "reject"' },
        { status: 400 },
      );
    }

    const proposal = await resolveProposal(
      params.proposalId,
      "system",
      action,
      params.id,
    );

    return NextResponse.json({ proposal });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve proposal";
    console.error("Resolve proposal error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
