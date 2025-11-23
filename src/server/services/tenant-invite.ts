import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { sendTenantInviteEmail } from "../integrations/invite-email";

type InviteInput = {
  ownerUserId: string;
  ownerEmail?: string;
  firstName: string;
  lastName: string;
  email: string;
  unitId?: string | null;
};

export async function createTenantInvite(input: InviteInput) {
  const email = input.email.trim().toLowerCase();

  let tenant = await prisma.tenant.findFirst({
    where: { email },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        unitId: input.unitId || null,
      },
    });
  } else {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        unitId: input.unitId || null,
      },
    });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.tenantInvite.create({
    data: {
      tenantId: tenant.id,
      ownerUserId: input.ownerUserId,
      token,
      expiresAt,
    },
  });

  const inviteLink = buildInviteLink(tenant.id, token);

  await sendTenantInviteEmail({
    email,
    tenantName: `${tenant.firstName} ${tenant.lastName}`.trim(),
    inviteLink,
    expiresAt,
    ownerEmail: input.ownerEmail,
  });

  return { tenant, inviteLink, expiresAt };
}

export async function getRecentTenants(limit = 20) {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      invites: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      unit: true,
    },
  });

  return tenants;
}

function buildInviteLink(tenantId: string, token: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  const url = new URL("/invite/accept", base);
  url.searchParams.set("tenantId", tenantId);
  url.searchParams.set("token", token);
  return url.toString();
}
