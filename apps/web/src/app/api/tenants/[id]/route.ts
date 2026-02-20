export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../src/server/db";
import { fetchSupabaseUser } from "../../../../server/session/role";

const updateSchema = z.object({
  phone: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUser = await fetchSupabaseUser(accessToken);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify that the user is updating their own tenant profile
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
  });

  if (!tenant || tenant.userId !== supabaseUser.id) {
    return NextResponse.json(
      { error: "Forbidden: You can only update your own profile" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      phone: parsed.data.phone,
    },
  });

  return NextResponse.json({
    id: updated.id,
    phone: updated.phone,
  });
}
