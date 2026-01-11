import { prisma } from "../db";

export type CreateUnitInput = {
  ownerUserId: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
};

export type UnitListItem = {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
};

/**
 * Create a new unit (property)
 */
export async function createUnit(input: CreateUnitInput) {
  const unit = await prisma.unit.create({
    data: {
      ownerUserId: input.ownerUserId,
      name: input.name,
      address1: input.address1,
      address2: input.address2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      notes: input.notes || null,
    },
  });

  return unit;
}

export type ListUnitsFilters = {
  ownerUserId?: string;
  limit?: number;
  offset?: number;
};

/**
 * Get units for listing with owner filtering and pagination
 * IMPORTANT: Always filter by ownerUserId to prevent cross-landlord data leakage
 */
export async function listUnits(filters: ListUnitsFilters = {}): Promise<UnitListItem[]> {
  const units = await prisma.unit.findMany({
    where: filters.ownerUserId ? { ownerUserId: filters.ownerUserId } : undefined,
    orderBy: { name: "asc" },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
    select: {
      id: true,
      name: true,
      address1: true,
      city: true,
      state: true,
    },
  });

  return units;
}

/**
 * Get a single unit by ID
 */
export async function getUnitById(id: string) {
  const unit = await prisma.unit.findUnique({
    where: { id },
  });

  return unit;
}
