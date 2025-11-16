import type { Contractor } from "@prisma/client";
import type { ToolInputByName, ToolResultByName } from "./tools";
import type { ToolHandlers } from "./reasoner";
import { findContractors } from "../db";
import { searchExternalContractors } from "../integrations/contractor-search";

const DEFAULT_LOCATION = "Saint John, NB, Canada";

export const toolHandlers: Partial<ToolHandlers> = {
  search_contractors: searchContractorsToolHandler,
};

export async function searchContractorsToolHandler(
  input: ToolInputByName<"search_contractors">,
): Promise<ToolResultByName<"search_contractors">> {
  const limit = input.limit ?? 3;

  const internal = await findContractors({
    category: input.category,
    search: input.specialty,
    limit,
  });

  const normalizedInternal = internal.slice(0, limit).map(normalizeInternal);
  const remaining = Math.max(limit - normalizedInternal.length, 0);

  let normalizedExternal: ReturnType<typeof normalizeExternal>[] = [];
  if (remaining > 0) {
    const location =
      input.location?.postalCode
        ? `${input.location.postalCode}, Canada`
        : DEFAULT_LOCATION;

    const external = await searchExternalContractors({
      category: input.category,
      term: input.specialty,
      limit: remaining,
      location,
    });

    normalizedExternal = external.map(normalizeExternal);
  }

  return {
    contractors: [...normalizedInternal, ...normalizedExternal].slice(0, limit),
  };
}

function normalizeInternal(contractor: Contractor) {
  return {
    id: contractor.id,
    name: contractor.companyName,
    phone: contractor.phone ?? undefined,
    email: contractor.email ?? undefined,
    rating: undefined,
    reviewCount: undefined,
    source: "internal" as const,
  };
}

function normalizeExternal(external: Awaited<ReturnType<typeof searchExternalContractors>>[number]) {
  return {
    id: `external:${external.id}`,
    name: external.name,
    phone: external.phone,
    email: undefined,
    rating: external.rating,
    reviewCount: external.reviewCount,
    source: "external" as const,
  };
}
