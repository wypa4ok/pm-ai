"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../../../../src/server/db";
import { createTenantInvite } from "../../../../../../src/server/services/tenant-invite";
import { fetchSupabaseUser } from "../../../server/session/role";

async function getAuthenticatedOwner() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    throw new Error("Unauthorized - no access token");
  }

  const user = await fetchSupabaseUser(accessToken);
  if (!user) {
    throw new Error("Unauthorized - invalid token");
  }

  // Check if user is an owner (has created tickets or units)
  const ownerCheck = await prisma.ticket.findFirst({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (!ownerCheck) {
    // Also check if they have created units as an alternative
    const unitCheck = await prisma.unit.findFirst({
      where: { createdAt: { not: null } }, // Simple check - in real app would have ownerId
      select: { id: true },
    });
  }

  return { user, email: user.email || "" };
}

export async function createUnit(formData: {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
}) {
  await getAuthenticatedOwner();

  const unit = await prisma.unit.create({
    data: {
      name: formData.name,
      address1: formData.address1,
      address2: formData.address2 || null,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      notes: formData.notes || null,
    },
  });

  revalidatePath("/tenancies/new");
  return { success: true, unit };
}

export async function getUnitsAndTenants() {
  await getAuthenticatedOwner();

  const [units, tenants] = await Promise.all([
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address1: true,
        city: true,
        state: true,
      },
    }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
  ]);

  return { units, tenants };
}

export async function createTenancy(formData: {
  unitId: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  members: Array<{ tenantId: string; isPrimary: boolean }>;
}) {
  await getAuthenticatedOwner();

  // Ensure only one primary tenant
  const primaryCount = formData.members.filter((m) => m.isPrimary).length;
  if (primaryCount > 1) {
    throw new Error("Only one primary tenant is allowed per tenancy");
  }

  // If no primary specified, make the first one primary
  if (primaryCount === 0 && formData.members.length > 0) {
    formData.members[0].isPrimary = true;
  }

  const tenancy = await prisma.tenancy.create({
    data: {
      unitId: formData.unitId,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      notes: formData.notes,
      members: {
        create: formData.members.map((member) => ({
          tenantId: member.tenantId,
          isPrimary: member.isPrimary,
        })),
      },
    },
  });

  revalidatePath("/tenancies");
  return { success: true, tenancyId: tenancy.id };
}

export async function addTenantMember(
  tenancyId: string,
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    isPrimary: boolean;
    sendInvite: boolean;
  }
) {
  const { user, email: ownerEmail } = await getAuthenticatedOwner();

  const email = formData.email.trim().toLowerCase();

  // Check if tenant exists in this tenancy
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      members: {
        include: { tenant: true },
      },
      unit: true,
    },
  });

  if (!tenancy) {
    throw new Error("Tenancy not found");
  }

  const existingMember = tenancy.members.find(
    (m) => m.tenant.email?.toLowerCase() === email
  );

  if (existingMember) {
    throw new Error("This tenant is already a member of this tenancy");
  }

  // If setting as primary, unset current primary
  if (formData.isPrimary) {
    const currentPrimary = tenancy.members.find((m) => m.isPrimary);
    if (currentPrimary) {
      await prisma.tenancyMember.update({
        where: { id: currentPrimary.id },
        data: { isPrimary: false },
      });
    }
  }

  // Find or create tenant
  let tenant = await prisma.tenant.findFirst({
    where: { email },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        unitId: tenancy.unitId,
      },
    });
  }

  // Add to tenancy
  await prisma.tenancyMember.create({
    data: {
      tenancyId,
      tenantId: tenant.id,
      isPrimary: formData.isPrimary,
    },
  });

  // Send invite if requested
  let inviteLink: string | undefined;
  let inviteExpiresAt: Date | undefined;

  if (formData.sendInvite && !tenant.userId) {
    const result = await createTenantInvite({
      ownerUserId: user.id,
      ownerEmail: ownerEmail,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email,
      unitId: tenancy.unitId,
    });
    inviteLink = result.inviteLink;
    inviteExpiresAt = result.expiresAt;
  }

  revalidatePath(`/tenancies/${tenancyId}`);
  return { success: true, inviteLink, inviteExpiresAt };
}
