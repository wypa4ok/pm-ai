import { prisma } from "../db";
import { createTenantInvite } from "./tenant-invite";

export type TenancyMemberInput = {
  tenantId: string;
  isPrimary: boolean;
};

export type CreateTenancyInput = {
  unitId: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  members: TenancyMemberInput[];
};

export type AddTenantMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  isPrimary: boolean;
  sendInvite: boolean;
};

export type TenantListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

/**
 * Create a new tenancy
 */
export async function createTenancy(input: CreateTenancyInput) {
  // Ensure only one primary tenant
  const primaryCount = input.members.filter((m) => m.isPrimary).length;
  if (primaryCount > 1) {
    throw new Error("Only one primary tenant is allowed per tenancy");
  }

  // If no primary specified, make the first one primary
  if (primaryCount === 0 && input.members.length > 0) {
    input.members[0].isPrimary = true;
  }

  const tenancy = await prisma.tenancy.create({
    data: {
      unitId: input.unitId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      notes: input.notes,
      members: {
        create: input.members.map((member) => ({
          tenantId: member.tenantId,
          isPrimary: member.isPrimary,
        })),
      },
    },
  });

  return tenancy;
}

/**
 * Get all tenants for listing
 */
export async function listTenants(): Promise<TenantListItem[]> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return tenants;
}

/**
 * Create a new tenant
 */
export async function createTenant(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  unitId?: string;
}) {
  const email = input.email.trim().toLowerCase();

  // Check if tenant with this email already exists
  const existingTenant = await prisma.tenant.findFirst({
    where: { email },
  });

  if (existingTenant) {
    throw new Error("A tenant with this email already exists");
  }

  const tenant = await prisma.tenant.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone: input.phone?.trim() || null,
      unitId: input.unitId || null,
    },
  });

  return tenant;
}

/**
 * Get a tenancy with full details (unit, members, tickets)
 */
export async function getTenancyWithDetails(id: string) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      members: {
        include: {
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              userId: true,
            },
          },
        },
        orderBy: {
          isPrimary: "desc",
        },
      },
    },
  });

  return tenancy;
}

/**
 * Add a tenant member to a tenancy
 */
export async function addTenantMember(
  tenancyId: string,
  input: AddTenantMemberInput,
  ownerUserId: string,
  ownerEmail: string
) {
  const email = input.email.trim().toLowerCase();

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
  if (input.isPrimary) {
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
        firstName: input.firstName,
        lastName: input.lastName,
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
      isPrimary: input.isPrimary,
    },
  });

  // Send invite if requested
  let inviteLink: string | undefined;
  let inviteExpiresAt: Date | undefined;

  if (input.sendInvite && !tenant.userId) {
    const result = await createTenantInvite({
      ownerUserId,
      ownerEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      unitId: tenancy.unitId,
    });
    inviteLink = result.inviteLink;
    inviteExpiresAt = result.expiresAt;
  }

  return { inviteLink, inviteExpiresAt };
}
