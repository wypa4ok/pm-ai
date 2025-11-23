-- Mirror migration to keep history aligned (original dropped indexes).
DROP INDEX IF EXISTS "tickets_search_vector_idx";
DROP INDEX IF EXISTS "tickets_subject_trgm_idx";
