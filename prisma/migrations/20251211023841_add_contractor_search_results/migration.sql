-- CreateTable
CREATE TABLE "contractor_search_results" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "analysis" JSONB NOT NULL,
    "searchResults" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "used_external" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_search_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_search_results_ticket_id_key" ON "contractor_search_results"("ticket_id");

-- CreateIndex
CREATE INDEX "contractor_search_results_ticket_id_idx" ON "contractor_search_results"("ticket_id");

-- CreateIndex
CREATE INDEX "contractor_search_results_created_at_idx" ON "contractor_search_results"("created_at");

-- AddForeignKey
ALTER TABLE "contractor_search_results" ADD CONSTRAINT "contractor_search_results_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
