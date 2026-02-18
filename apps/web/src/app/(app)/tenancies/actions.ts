"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { fetchSupabaseUser } from "../../../server/session/role";
import * as unitService from "../../../../../../src/server/services/unit-service";
import * as tenancyService from "../../../../../../src/server/services/tenancy-service";
import { prisma } from "../../../../../../src/server/db";

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
  const { user } = await getAuthenticatedOwner();

  const unit = await unitService.createUnit({ ...formData, ownerUserId: user.id });

  revalidatePath("/tenancies/new");
  return { success: true, unit };
}

export async function createTenant(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  unitId?: string;
}) {
  const { user } = await getAuthenticatedOwner();

  const tenant = await tenancyService.createTenant({ ...formData, ownerUserId: user.id });

  revalidatePath("/tenancies/new");
  return { success: true, tenant };
}

export async function getUnitsAndTenants() {
  const { user } = await getAuthenticatedOwner();

  const [units, tenants] = await Promise.all([
    unitService.listUnits({ ownerUserId: user.id }),
    tenancyService.listTenants({ ownerUserId: user.id }),
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

  const tenancy = await tenancyService.createTenancy(formData);

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

  const result = await tenancyService.addTenantMember(
    tenancyId,
    formData,
    user.id,
    ownerEmail
  );

  revalidatePath(`/tenancies/${tenancyId}`);
  return { success: true, inviteLink: result.inviteLink, inviteExpiresAt: result.inviteExpiresAt };
}
