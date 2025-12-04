import { prisma } from "../db";

/**
 * Get tenant by user ID
 */
export async function getTenantByUserId(userId: string) {
  return prisma.tenant.findFirst({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      unitId: true,
    },
  });
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      unitId: true,
      userId: true,
    },
  });
}
