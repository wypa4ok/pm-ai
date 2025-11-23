# Tenant Portal Setup Guide

This guide covers the complete setup and testing of the Landlord/Tenant split functionality (T14 tasks).

## Prerequisites

- Supabase project running
- Database connection configured in `.env` or `.env.local`
- Prisma CLI installed

## Step 1: Apply Database Migrations

Apply the message visibility migration:

```bash
# Apply the migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

This will:
- Add the `MessageVisibility` enum (PUBLIC, INTERNAL)
- Add the `visibility` column to the `messages` table (defaults to PUBLIC)

## Step 2: Enable Row-Level Security (RLS)

**Important**: RLS policies must be applied via the Supabase SQL Editor with service role credentials.

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `db/sql/rls_policies.sql`
3. Execute the SQL as service role
4. Verify the policies are enabled:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tickets', 'messages');

-- Should return:
-- tenants   | true
-- tickets   | true
-- messages  | true
```

## Step 3: Configure Storage RLS (Optional)

If you're using Supabase Storage for attachments, uncomment and apply the storage policies in `db/sql/rls_policies.sql`:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- ... rest of storage policies
```

## Step 4: Test the Implementation

See `docs/tenant-portal-testing.md` for comprehensive testing scenarios.

## Step 5: Update Environment Variables

Ensure these variables are set:

```env
# Required for invite emails
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Storage bucket
SUPABASE_STORAGE_BUCKET=attachments
```

## Architecture Overview

### Role-Based Access

The system supports two roles:
- **OWNER** (Landlord): Full access to all tickets, tenants, and messages
- **TENANT**: Access only to their own tickets and PUBLIC messages

Roles are derived from:
1. Supabase Auth `user_metadata.roles` or `user_metadata.role`
2. Supabase Auth `app_metadata.roles` or `app_metadata.role`
3. Tenants are auto-assigned the TENANT role when they have a `user_id` set

### Data Scoping

**Tickets:**
- Owners can see all tickets where `owner_user_id = auth.uid()`
- Tenants can see only tickets where `tenant_user_id = auth.uid()`

**Messages:**
- Owners can see all messages where `owner_user_id = auth.uid()`
- Tenants can see only messages where `tenant_user_id = auth.uid()` AND `visibility = 'PUBLIC'`

**Tenants:**
- Owners can manage all tenants linked to their tickets
- Tenants can only view/update their own profile

### Invite Flow

1. Owner invites tenant via `/api/v1/tenants/invite`
   - Creates/updates tenant record
   - Generates unique token (expires in 7 days)
   - Sends email with invite link

2. Tenant clicks link → `/invite/accept?tenantId=xxx&token=xxx`
   - Redirects to Supabase Auth if not logged in
   - On return, accepts invite via `/api/v1/tenants/accept`
   - Binds `tenants.user_id` to authenticated user
   - Migrates existing tickets to set `tenant_user_id`

3. Tenant is redirected to `/tenant` portal

### Message Visibility

Owners can mark messages as INTERNAL to hide them from tenants:

- `visibility: 'PUBLIC'` - Visible to everyone (default)
- `visibility: 'INTERNAL'` - Only visible to owners and staff

Use cases for INTERNAL messages:
- Internal notes about the ticket
- Communication with contractors
- Private discussions about tenant issues
- Agent AI reasoning and decisions

## Routes

### Landlord Routes (Owner role)
- `/tickets` - All tickets inbox
- `/tickets/[id]` - Ticket detail with full timeline
- `/tenants` - Tenant management
- `/contractors` - Contractor directory
- `/settings` - System settings

### Tenant Routes (Tenant role)
- `/tenant` - Tenant home/dashboard
- `/tenant/tickets` - My tickets list
- `/tenant/tickets/[id]` - My ticket detail (PUBLIC messages only)
- `/tenant/tickets/new` - Create new ticket
- `/tenant/profile` - My profile and unit info

### Public Routes
- `/login` - Authentication
- `/invite/accept` - Accept tenant invite

## API Endpoints

### Tenant Management
- `POST /api/v1/tenants/invite` - Invite a tenant (Owner only)
- `POST /api/v1/tenants/accept` - Accept invite (Public, authenticated)
- `PATCH /api/tenants/[id]` - Update tenant profile (Self only)

### Tickets & Messages
- `GET /api/v1/tickets` - List tickets (scoped by role)
- `GET /api/v1/tickets/[id]` - Get ticket (scoped by role)
- `POST /api/v1/tickets` - Create ticket
- `POST /api/v1/messages` - Send message

### Uploads
- `POST /api/v1/uploads/sign` - Get signed upload URL

## Security Features

1. **Row-Level Security**: Enforced at the database level
2. **API Authentication**: All `/api/v1/*` routes require JWT
3. **Role-Based Authorization**: Middleware checks user roles
4. **Invite Token Expiry**: 7-day expiration on invite tokens
5. **Self-Service Restrictions**: Tenants can only modify their own data

## Troubleshooting

### Tenant Can't See Their Tickets
- Verify `tickets.tenant_user_id` is set to the tenant's Supabase user ID
- Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'tickets'`
- Verify the user's session contains the correct user ID

### Tenant Can See Internal Messages
- Verify RLS policies are applied correctly
- Check message `visibility` field is set to 'INTERNAL'
- Ensure RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'messages'`

### Invite Link Doesn't Work
- Check token hasn't expired (7 days)
- Verify `tenant_invites.claimed_at` is NULL
- Ensure environment variable `NEXT_PUBLIC_APP_URL` is set correctly

### Role Detection Issues
- Check Supabase Auth metadata: user should have `roles: ['TENANT']` or `role: 'TENANT'`
- Verify `tenants.user_id` is set after accepting invite
- Check active role cookie: `sb-active-role`

## Next Steps

After setup is complete:
- Test the invite flow end-to-end
- Create sample tickets for both owner and tenant views
- Test file uploads on new ticket creation
- Verify message visibility filtering
- Test role switching if a user has both OWNER and TENANT roles
