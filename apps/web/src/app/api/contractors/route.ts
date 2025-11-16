import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../src/server/db";

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
  const contractors = await prisma.contractor.findMany({
    orderBy: { createdAt: "desc" },
  });
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

  const contractor = await prisma.contractor.create({
    data: sanitizePayload(parsed.data),
  });

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

  const { id, ...data } = parsed.data;

  const contractor = await prisma.contractor.update({
    where: { id },
    data: {
      ...(data.companyName !== undefined && {
        companyName: sanitizeString(data.companyName),
      }),
      ...(data.contactName !== undefined && {
        contactName: sanitizeOptionalString(data.contactName),
      }),
      ...(data.email !== undefined && { email: sanitizeOptionalString(data.email) }),
      ...(data.phone !== undefined && { phone: sanitizeOptionalString(data.phone) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.notes !== undefined && { notes: sanitizeOptionalString(data.notes) }),
      ...(parsed.data.serviceAreas !== undefined && {
        serviceAreas: sanitizeServiceAreas(data.serviceAreas ?? []),
      }),
    },
  });

  return NextResponse.json({ contractor });
}

function sanitizePayload(data: z.infer<typeof createSchema>) {
  return {
    companyName: sanitizeString(data.companyName),
    contactName: sanitizeOptionalString(data.contactName),
    email: sanitizeOptionalString(data.email),
    phone: sanitizeOptionalString(data.phone),
    category: data.category,
    serviceAreas: sanitizeServiceAreas(data.serviceAreas ?? []),
    notes: sanitizeOptionalString(data.notes),
  };
}

function sanitizeString(value: string) {
  return value.trim();
}

function sanitizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeServiceAreas(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}
