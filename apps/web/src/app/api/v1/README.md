# /api/v1

Versioned API namespace for third-party/mobile clients.

## Error shape

Errors follow this structure:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "optional"
  }
}
```

Use meaningful HTTP status codes and concise messages.

## Auth

- Supabase access JWT expected in `Authorization: Bearer <token>`.
- Verified via Supabase admin client in `src/server/api/middleware/auth.ts`.

## Notes

- All endpoints live under `/api/v1/*`.
- Responses are JSON; do not leak stack traces.
