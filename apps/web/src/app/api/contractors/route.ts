export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import * as contractorService from "../../../../../../src/server/services/contractor-service";

const baseSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  category: z.enum([
    "GENERAL",
    "PLUMBING",
    "ELECTRICAL",
    "HVAC",
    "CLEANING",
    "OTHER",
  ]),
  serviceAreas: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET() {
  const contractors = await contractorService.listContractors();
  return NextResponse.json({ contractors });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 },
    );
  }

  const contractor = await contractorService.createContractor(parsed.data);

  return NextResponse.json({ contractor }, { status: 201 });
}

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 },
    );
  }

  const contractor = await contractorService.updateContractor(parsed.data);

  return NextResponse.json({ contractor });
}
