import { prisma } from "../db";

export type UserRole = "OWNER" | "TENANT";

/**
 * Gets user roles based on database relationships.
 * This is database-aware and checks:
 * - If user has any tickets as owner -> OWNER role
 * - If user is linked to a tenant account -> TENANT role
 *
 * A user can have both roles simultaneously.
 * Defaults to OWNER if no roles are found.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const roles: UserRole[] = [];

  // Check if user is a tenant (has linked tenant account)
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (tenant) {
    roles.push("TENANT");
  }

  // Check if user is an owner (has created tickets)
  const ownerTicket = await prisma.ticket.findFirst({
    where: { ownerUserId: userId },
    select: { id: true },
  });

  if (ownerTicket) {
    roles.push("OWNER");
  }

  // Default to OWNER if no roles found
  if (roles.length === 0) {
    roles.push("OWNER");
  }

  return roles;
}
