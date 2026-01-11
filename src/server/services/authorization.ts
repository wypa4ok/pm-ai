import { prisma } from "../db";

/**
 * Authorization helpers to prevent cross-landlord data access
 * CRITICAL: Always call these before mutations to ensure users can only modify their own resources
 */

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Verify that a user owns a specific unit
 * @throws AuthorizationError if user doesn't own the unit
 */
export async function authorizeUnitOwnership(
  userId: string,
  unitId: string
): Promise<void> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { ownerUserId: true },
  });

  if (!unit) {
    throw new AuthorizationError("Unit not found");
  }

  if (unit.ownerUserId !== userId) {
    throw new AuthorizationError(
      "Forbidden: You do not have permission to access this unit"
    );
  }
}

/**
 * Verify that a user owns a specific tenant
 * @throws AuthorizationError if user doesn't own the tenant
 */
export async function authorizeTenantOwnership(
  userId: string,
  tenantId: string
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ownerUserId: true },
  });

  if (!tenant) {
    throw new AuthorizationError("Tenant not found");
  }

  if (tenant.ownerUserId !== userId) {
    throw new AuthorizationError(
      "Forbidden: You do not have permission to access this tenant"
    );
  }
}

/**
 * Verify that a user owns a specific ticket
 * @throws AuthorizationError if user doesn't own the ticket
 */
export async function authorizeTicketOwnership(
  userId: string,
  ticketId: string
): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { ownerUserId: true },
  });

  if (!ticket) {
    throw new AuthorizationError("Ticket not found");
  }

  if (ticket.ownerUserId !== userId) {
    throw new AuthorizationError(
      "Forbidden: You do not have permission to access this ticket"
    );
  }
}

/**
 * Verify that a user owns a specific tenancy
 * @throws AuthorizationError if user doesn't own the tenancy
 */
export async function authorizeTenancyOwnership(
  userId: string,
  tenancyId: string
): Promise<void> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { unit: { select: { ownerUserId: true } } },
  });

  if (!tenancy) {
    throw new AuthorizationError("Tenancy not found");
  }

  if (tenancy.unit.ownerUserId !== userId) {
    throw new AuthorizationError(
      "Forbidden: You do not have permission to access this tenancy"
    );
  }
}
