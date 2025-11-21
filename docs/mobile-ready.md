# Mobile-ready API notes

This doc outlines how mobile clients should integrate with `/api/v1` for auth, uploads, realtime, and deep links.

## Auth

- Use Supabase email+password to obtain an access token (`Authorization: Bearer <token>`).
- Tokens are validated on every `/api/v1/*` via Supabase admin auth.
- Refresh tokens should be stored securely by the mobile client; renew access tokens before expiry.

Endpoints involved:
- Login (Supabase): `POST {SUPABASE_URL}/auth/v1/token?grant_type=password`
- API: `/api/v1/tickets`, `/api/v1/messages`, `/api/v1/contractors/search`, `/api/v1/uploads/sign`

## Uploads

- Use `/api/v1/uploads/sign` to get a `signedUrl` + `token` for Supabase Storage.
- Then upload the file bytes to `signedUrl` with `authorization: Bearer <token>` and `content-type` header.
- Send the uploaded `bucket` + `path` (or a fresh signed URL) when creating messages.

Flow:
1. `POST /api/v1/uploads/sign` with `{ path, contentType }`
2. `POST signedUrl` with file bytes and `authorization: Bearer <token>`
3. Include `attachments: [{ filename, mimeType, bucket, path }]` in `/api/v1/messages`

See `docs/upload-flow.md` for curl examples.

## Realtime

- Subscribe to Supabase Realtime channels using the same access token.
- Channels:
  - `tickets:owner:{ownerUserId}` for ticket changes
  - `messages:ticket:{ticketId}` for message changes
- On reconnect, refetch via `/api/v1/tickets` or `/api/v1/tickets/{id}` to backfill.

Details in `src/server/realtime/channels.md`.

## Deep links

- Use app-specific links to open tickets directly, e.g., `myapp://tickets/{id}`.
- Pair with web fallback URLs like `https://app.example.com/tickets/{id}`.
- Ensure message push notifications include ticket id and deep link so the app can route correctly.

## Error shape

- All errors follow `{ "error": { "code": "...", "message": "...", "details": ... } }` with appropriate HTTP status codes.
