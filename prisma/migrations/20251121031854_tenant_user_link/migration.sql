-- Mirror of previously applied migration that dropped search indexes.
-- Using IF EXISTS to avoid errors if rerun locally.
DROP INDEX IF EXISTS "tickets_search_vector_idx";
DROP INDEX IF EXISTS "tickets_subject_trgm_idx";
