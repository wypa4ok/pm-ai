export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { searchExternalContractors } from "../../../../../../../src/server/integrations/contractor-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "handyman";
  const term = searchParams.get("term") ?? "handyman";
  const location = searchParams.get("location") ?? "Saint John, NB, Canada";
  const limit = Number(searchParams.get("limit") ?? "5");

  try {
    const contractors = await searchExternalContractors({
      category,
      term,
      location,
      limit,
    });
    return NextResponse.json({ contractors });
  } catch (error) {
    console.error("External contractor search failed", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Search failed" },
      { status: 500 },
    );
  }
}
