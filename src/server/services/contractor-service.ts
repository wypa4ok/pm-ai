import { prisma } from "../db";
import type { ContractorCategory } from "@prisma/client";

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
