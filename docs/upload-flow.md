# Upload flow (signed uploads)

Clients should upload attachments via Supabase signed upload URLs.

1) Request a signed upload URL:
   - POST `/api/v1/uploads/sign`
   - Headers: `Authorization: Bearer <supabase access token>`
   - Body: `{ "path": "tickets/<ticketId>/<filename>", "contentType": "<mime>" }`
   - Response: `{ signedUrl, token, path, bucket, contentType, expiresAt }`

2) Upload the file bytes using the signed URL and token:

```bash
curl -X POST "$signedUrl" \
  -H "x-upsert: true" \
  -H "content-type: <mime>" \
  -H "authorization: Bearer $token" \
  --data-binary "@path/to/file"
```

3) Store `bucket` + `path` (and optionally `expiresAt`) on the message payload. Use `getSignedUrl` later if you need a fresh URL to view.

Notes:
- Paths should be deterministic (e.g., `tickets/<ticketId>/...`) to avoid collisions.
- Tokens expire quickly; request a new signed URL if upload is delayed.
