import { prisma, findContractors } from "../db";
import { searchExternalContractors, type ExternalContractorProfile } from "../integrations/contractor-search";
import { analyzeTicketForContractors, type ContractorSearchAnalysis } from "../ai/contractor-analyzer";
import type { Contractor, ContractorCategory } from "@prisma/client";

export type CreateContractorInput = {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category: ContractorCategory;
  serviceAreas?: string[];
  notes?: string;
};

export type UpdateContractorInput = Partial<CreateContractorInput> & {
  id: string;
};

/**
 * List all contractors
 */
export async function listContractors() {
  const contractors = await prisma.contractor.findMany({
    orderBy: { createdAt: "desc" },
  });
  return contractors;
}

/**
 * Get a contractor by ID
 */
export async function getContractorById(id: string) {
  const contractor = await prisma.contractor.findUnique({
    where: { id },
  });
  return contractor;
}

/**
 * Create a new contractor
 */
export async function createContractor(input: CreateContractorInput) {
  const contractor = await prisma.contractor.create({
    data: {
      companyName: sanitizeString(input.companyName),
      contactName: sanitizeOptionalString(input.contactName),
      email: sanitizeOptionalString(input.email),
      phone: sanitizeOptionalString(input.phone),
      category: input.category,
      serviceAreas: sanitizeServiceAreas(input.serviceAreas ?? []),
      notes: sanitizeOptionalString(input.notes),
    },
  });
  return contractor;
}

/**
 * Update a contractor
 */
export async function updateContractor(input: UpdateContractorInput) {
  const { id, ...data } = input;

  const contractor = await prisma.contractor.update({
    where: { id },
    data: {
      ...(data.companyName !== undefined && {
        companyName: sanitizeString(data.companyName),
      }),
      ...(data.contactName !== undefined && {
        contactName: sanitizeOptionalString(data.contactName),
      }),
      ...(data.email !== undefined && {
        email: sanitizeOptionalString(data.email),
      }),
      ...(data.phone !== undefined && {
        phone: sanitizeOptionalString(data.phone),
      }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.notes !== undefined && {
        notes: sanitizeOptionalString(data.notes),
      }),
      ...(data.serviceAreas !== undefined && {
        serviceAreas: sanitizeServiceAreas(data.serviceAreas),
      }),
    },
  });

  return contractor;
}

/**
 * Delete a contractor
 */
export async function deleteContractor(id: string) {
  await prisma.contractor.delete({
    where: { id },
  });
}

// Helper functions
function sanitizeString(value: string) {
  return value.trim();
}

function sanitizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeServiceAreas(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

// ============================================================================
// AI-POWERED CONTRACTOR SEARCH
// ============================================================================

export interface SearchContractorsWithAIInput {
  ticketId: string;
  forceExternal?: boolean; // Force Google search even if internal contractors found
}

export interface SearchContractorsWithAIResult {
  analysis: ContractorSearchAnalysis;
  internalContractors: Contractor[];
  externalContractors: ExternalContractorProfile[];
  usedExternal: boolean;
  source: "internal" | "external" | "both";
}

/**
 * Searches for contractors using AI-powered ticket analysis
 * Prioritizes internal contractors, falls back to Google Maps if needed
 */
export async function searchContractorsWithAI(
  input: SearchContractorsWithAIInput,
): Promise<SearchContractorsWithAIResult> {
  // Step 1: Analyze ticket with AI
  const analysis = await analyzeTicketForContractors({ ticketId: input.ticketId });

  // Step 2: Search internal contractors first
  const internalResults = await searchInternalContractors(analysis);

  // Step 3: Determine if external search is needed
  const shouldSearchExternal = input.forceExternal || internalResults.length === 0;

  let externalResults: ExternalContractorProfile[] = [];
  if (shouldSearchExternal) {
    externalResults = await searchExternalContractorsFromAnalysis(analysis, input.ticketId);
  }

  // Determine source
  let source: "internal" | "external" | "both";
  if (internalResults.length > 0 && externalResults.length > 0) {
    source = "both";
  } else if (internalResults.length > 0) {
    source = "internal";
  } else {
    source = "external";
  }

  return {
    analysis,
    internalContractors: internalResults,
    externalContractors: externalResults,
    usedExternal: externalResults.length > 0,
    source,
  };
}

/**
 * Search internal contractor database using AI analysis
 */
async function searchInternalContractors(
  analysis: ContractorSearchAnalysis,
): Promise<Contractor[]> {
  const keywords = analysis.keywords.join(" ");
  const primaryTrade = analysis.requiredTrade[0]; // Use first trade as primary category

  // First try: search with category filter
  let results = await findContractors({
    search: keywords || analysis.specialty,
    category: primaryTrade,
    limit: 5,
  });

  console.log(
    `Internal contractor search (with category): found ${results.length} matches for "${keywords}" in category "${primaryTrade}"`,
  );

  // If no results found with category filter, try without category (broader search)
  if (results.length === 0) {
    results = await findContractors({
      search: keywords || analysis.specialty || analysis.maintenanceType,
      limit: 5,
    });

    console.log(
      `Internal contractor search (without category): found ${results.length} matches for "${keywords || analysis.specialty || analysis.maintenanceType}"`,
    );
  }

  return results;
}

/**
 * Search Google Maps using AI analysis
 */
async function searchExternalContractorsFromAnalysis(
  analysis: ContractorSearchAnalysis,
  ticketId: string,
): Promise<ExternalContractorProfile[]> {
  // Get ticket for location data
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { unit: true },
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // Build location string
  const location = ticket.unit
    ? `${ticket.unit.postalCode}, ${ticket.unit.city}, ${ticket.unit.state}`
    : "Saint John, NB, Canada"; // Fallback location

  // Use AI-generated search query
  const results = await searchExternalContractors({
    term: analysis.searchQuery,
    location,
    limit: 5,
  });

  console.log(
    `External contractor search: found ${results.length} matches for "${analysis.searchQuery}" near "${location}"`,
  );

  return results;
}

/**
 * Save external contractor to internal database
 */
export async function saveExternalContractor(
  external: ExternalContractorProfile,
  category?: ContractorCategory,
): Promise<Contractor> {
  // Map Google contractor to internal format
  return prisma.contractor.create({
    data: {
      companyName: external.name,
      contactName: external.name,
      email: external.email || null,
      phone: external.phone || null,
      category: category || ("OTHER" as ContractorCategory),
      serviceAreas: [],
      rating: external.rating || null,
      reviewCount: external.reviewCount || null,
      notes: external.address
        ? `Imported from Google Maps. Address: ${external.address}. Rating: ${external.rating || "N/A"} (${external.reviewCount || 0} reviews)`
        : `Imported from Google Maps. Rating: ${external.rating || "N/A"} (${external.reviewCount || 0} reviews)`,
    },
  });
}
