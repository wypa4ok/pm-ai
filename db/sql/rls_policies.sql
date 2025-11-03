-- Draft Supabase RLS policies (left disabled until manual review).
-- Run these statements via the Supabase SQL editor once ready.

-- Tickets ------------------------------------------------------------------
-- ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "tickets_owner_select" ON public.tickets
--   FOR SELECT
--   USING (
--     owner_user_id = auth.uid()
--     OR tenant_user_id = auth.uid()
--   );

-- CREATE POLICY "tickets_owner_modify" ON public.tickets
--   FOR ALL
--   USING (owner_user_id = auth.uid())
--   WITH CHECK (owner_user_id = auth.uid());

-- Messages -----------------------------------------------------------------
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "messages_owner_select" ON public.messages
--   FOR SELECT
--   USING (
--     owner_user_id = auth.uid()
--     OR tenant_user_id = auth.uid()
--   );

-- CREATE POLICY "messages_owner_modify" ON public.messages
--   FOR ALL
--   USING (owner_user_id = auth.uid())
--   WITH CHECK (owner_user_id = auth.uid());

-- NOTE: Leave RLS disabled until application-side role enforcement
-- and service-role usage is validated.
