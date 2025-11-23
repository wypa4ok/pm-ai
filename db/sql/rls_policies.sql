-- Supabase RLS policies for tenants, tickets, messages, and storage.
-- Apply via Supabase SQL editor (run as service role).

-------------------------------------------------------------------------------
-- TENANTS
-------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_owner_manage" ON public.tenants;
CREATE POLICY "tenants_owner_manage" ON public.tenants
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.tenant_id = tenants.id
        AND t.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.tenant_id = tenants.id
        AND t.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenants_self_manage" ON public.tenants;
CREATE POLICY "tenants_self_manage" ON public.tenants
  FOR ALL
  USING (
    tenants.user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    tenants.user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-------------------------------------------------------------------------------
-- TICKETS
-------------------------------------------------------------------------------
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_owner_manage" ON public.tickets;
CREATE POLICY "tickets_owner_manage" ON public.tickets
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR owner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "tickets_tenant_read" ON public.tickets;
CREATE POLICY "tickets_tenant_read" ON public.tickets
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR tenant_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "tickets_tenant_insert" ON public.tickets;
CREATE POLICY "tickets_tenant_insert" ON public.tickets
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR tenant_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "tickets_tenant_update" ON public.tickets;
CREATE POLICY "tickets_tenant_update" ON public.tickets
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR tenant_user_id = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR tenant_user_id = auth.uid()
  );

-------------------------------------------------------------------------------
-- MESSAGES
-------------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_owner_manage" ON public.messages;
CREATE POLICY "messages_owner_manage" ON public.messages
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR owner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_tenant_read" ON public.messages;
CREATE POLICY "messages_tenant_read" ON public.messages
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (tenant_user_id = auth.uid() AND visibility = 'PUBLIC')
  );

DROP POLICY IF EXISTS "messages_tenant_insert" ON public.messages;
CREATE POLICY "messages_tenant_insert" ON public.messages
  FOR INSERT
  WITH CHECK (
    tenant_user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "messages_tenant_update" ON public.messages;
CREATE POLICY "messages_tenant_update" ON public.messages
  FOR UPDATE
  USING (
    tenant_user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    tenant_user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-------------------------------------------------------------------------------
-- STORAGE policies require supabase_admin. Apply separately via service role.
-------------------------------------------------------------------------------
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "storage_service_manage" ON storage.objects;
-- CREATE POLICY "storage_service_manage" ON storage.objects
--   FOR ALL
--   USING (auth.role() = 'service_role')
--   WITH CHECK (auth.role() = 'service_role');
--
-- DROP POLICY IF EXISTS "storage_ticket_access" ON storage.objects;
-- CREATE POLICY "storage_ticket_access" ON storage.objects
--   FOR SELECT
--   USING (
--     auth.role() = 'service_role'
--     OR (
--       bucket_id = 'attachments'
--       AND split_part(name, '/', 1) = 'tickets'
--       AND EXISTS (
--         SELECT 1 FROM public.tickets t
--         WHERE t.id::text = split_part(name, '/', 2)
--           AND (
--             t.owner_user_id = auth.uid()
--             OR t.tenant_user_id = auth.uid()
--           )
--       )
--     )
--   );
