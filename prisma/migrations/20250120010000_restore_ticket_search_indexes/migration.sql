CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "tickets_search_vector_idx" ON "tickets" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS "tickets_subject_trgm_idx" ON "tickets" USING GIN (subject gin_trgm_ops);
