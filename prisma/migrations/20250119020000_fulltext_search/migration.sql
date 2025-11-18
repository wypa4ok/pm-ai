-- Create a combined tsvector column on tickets for subject and description
ALTER TABLE "tickets"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

UPDATE "tickets"
SET "search_vector" =
  to_tsvector('english', coalesce(subject, '')) ||
  to_tsvector('english', coalesce(description, ''));

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION tickets_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', coalesce(NEW.subject, '')) ||
    to_tsvector('english', coalesce(NEW.description, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_search_vector_trigger ON "tickets";
CREATE TRIGGER tickets_search_vector_trigger
BEFORE INSERT OR UPDATE ON "tickets"
FOR EACH ROW EXECUTE PROCEDURE tickets_search_vector_update();

-- Add GIN index for fast FTS
CREATE INDEX IF NOT EXISTS tickets_search_vector_idx ON "tickets" USING GIN (search_vector);

-- Optional trigram index on subject to speed fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS tickets_subject_trgm_idx ON "tickets" USING GIN (subject gin_trgm_ops);
