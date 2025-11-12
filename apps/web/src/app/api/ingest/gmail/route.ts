import { NextResponse } from "next/server";
import { ingestGmail } from "../../../../../../../src/server/integrations/gmail";

export async function POST() {
  try {
    const result = await ingestGmail();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Gmail ingest failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error).message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
