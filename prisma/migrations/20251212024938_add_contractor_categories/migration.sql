-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractorCategory" ADD VALUE 'CARPENTRY';
ALTER TYPE "ContractorCategory" ADD VALUE 'PAINTING';
ALTER TYPE "ContractorCategory" ADD VALUE 'ROOFING';
ALTER TYPE "ContractorCategory" ADD VALUE 'LANDSCAPING';
ALTER TYPE "ContractorCategory" ADD VALUE 'APPLIANCE_REPAIR';
ALTER TYPE "ContractorCategory" ADD VALUE 'PEST_CONTROL';
