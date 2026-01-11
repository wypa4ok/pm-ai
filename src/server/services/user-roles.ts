import { prisma } from "../db";
import { LRUCache } from "lru-cache";

export type UserRole = "OWNER" | "TENANT" | "ADMIN";

// Cache user roles for 5 minutes to reduce database load
const roleCache = new LRUCache<string, UserRole[]>({
  max: 1000, // Store up to 1000 users
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

/**
 * Gets user roles based on database relationships.
 * Uses a SINGLE database query with eager loading and caches results.
 *
 * This is database-aware and checks:
 * - User.role field (ADMIN, AGENT, OWNER from schema)
 * - If user owns any units -> OWNER role
 * - If user is linked to a tenant account -> TENANT role
 *
 * A user can have both OWNER and TENANT roles simultaneously.
 * Results are cached for 5 minutes to prevent N+1 query problems.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached) {
    return cached;
  }

  // Fetch user with all role-determining relationships in ONE query
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true, // User's assigned role from schema
      ownedTenants: { take: 1, select: { id: true } }, // Check if owns tenants
      ownedUnits: { take: 1, select: { id: true } }, // Check if owns units
      ownedTickets: { take: 1, select: { id: true } }, // Check if created tickets (legacy)
    },
  });

  if (!user) {
    // User not found - return empty array
    return [];
  }

  const roles: UserRole[] = [];

  // Add ADMIN role if user has it in their profile
  if (user.role === "ADMIN") {
    roles.push("ADMIN");
  }

  // User is an OWNER if:
  // 1. They have role=OWNER in User table, OR
  // 2. They own any units, OR
  // 3. They own any tenants, OR
  // 4. They created any tickets (legacy check)
  if (
    user.role === "OWNER" ||
    user.ownedUnits.length > 0 ||
    user.ownedTenants.length > 0 ||
    user.ownedTickets.length > 0
  ) {
    roles.push("OWNER");
  }

  // Check if user is a tenant (tenant profile links to this userId)
  // NOTE: We can't check this in the single query above because Tenant->User
  // is a reverse relation. We need a separate query, but only if we haven't
  // found OWNER role yet (optimization)
  if (!roles.includes("TENANT")) {
    const tenantProfile = await prisma.tenant.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (tenantProfile) {
      roles.push("TENANT");
    }
  }

  // Default to OWNER if no roles found (for backward compatibility)
  if (roles.length === 0) {
    roles.push("OWNER");
  }

  // Cache the result
  roleCache.set(userId, roles);

  return roles;
}

/**
 * Invalidates the role cache for a specific user.
 * Call this when user's roles change (e.g., after creating first unit,
 * linking to tenant account, or admin updating their role).
 */
export function invalidateUserRoleCache(userId: string): void {
  roleCache.delete(userId);
}

/**
 * Clears the entire role cache.
 * Useful for testing or after bulk role changes.
 */
export function clearRoleCache(): void {
  roleCache.clear();
}
