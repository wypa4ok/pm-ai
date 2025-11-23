-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "visibility" "MessageVisibility" NOT NULL DEFAULT 'PUBLIC';
