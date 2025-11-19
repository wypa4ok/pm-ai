# Realtime channels (Supabase)

Use Supabase Realtime to stream ticket/message updates to clients.

## Channels

- `tickets:owner:{ownerUserId}` — broadcasts INSERT/UPDATE/DELETE on `tickets` scoped by `owner_user_id`.
- `messages:ticket:{ticketId}` — broadcasts INSERT/UPDATE/DELETE on `messages` for a given ticket.

## Filters

Configure PostgreSQL replication filters via RLS or subscribe with `event` and `filter`:

- Tickets by owner: `table=tickets,event=*,filter=owner_user_id=eq.{ownerUserId}`
- Messages by ticket: `table=messages,event=*,filter=ticket_id=eq.{ticketId}`

## Payload shape

Supabase sends `record` (new row) and `old_record` (previous row) for UPDATE/DELETE.

Key fields:
- Tickets: `id`, `subject`, `status`, `priority`, `category`, `channel`, `updated_at`, `owner_user_id`, `tenant_id`, `unit_id`.
- Messages: `id`, `ticket_id`, `direction`, `channel`, `subject`, `body_text`, `attachments`, `sent_at`.

## Client notes

- Authenticate Realtime with the Supabase access token (same JWT as API).
- Resubscribe after reconnect; handle de-duplication by `id`/`updated_at`.
- Consider backfilling via `/api/v1/tickets` or `/api/v1/tickets/{id}` on reconnect to repair missed events.
