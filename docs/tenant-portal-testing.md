# Tenant Portal Testing Guide

Comprehensive test scenarios for the Landlord/Tenant split functionality.

## Prerequisites

- RLS policies applied (see `tenant-portal-setup.md`)
- At least one owner user created in Supabase Auth
- Test tenant users created

## Test Setup SQL

Run these queries in Supabase SQL Editor to set up test data:

```sql
-- 1. Create test users (do this via Supabase Auth UI or API)
-- Owner: owner@example.com
-- Tenant 1: tenant1@example.com
-- Tenant 2: tenant2@example.com

-- 2. Get the user IDs
SELECT id, email FROM auth.users WHERE email IN ('owner@example.com', 'tenant1@example.com', 'tenant2@example.com');

-- 3. Create test unit
INSERT INTO units (id, name, address_1, city, state, postal_code)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Unit 101', '123 Main St', 'Toronto', 'ON', 'M5H 2N2');

-- 4. Create test tenants
-- Replace 'OWNER_USER_ID', 'TENANT1_USER_ID', 'TENANT2_USER_ID' with actual IDs
INSERT INTO tenants (id, unit_id, first_name, last_name, email, user_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'John', 'Doe', 'tenant1@example.com', 'TENANT1_USER_ID'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Jane', 'Smith', 'tenant2@example.com', 'TENANT2_USER_ID');

-- 5. Create test tickets
-- Replace 'OWNER_USER_ID' and 'TENANT1_USER_ID' with actual IDs
INSERT INTO tickets (id, subject, description, status, category, priority, channel, owner_user_id, tenant_id, tenant_user_id, unit_id)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Leaky faucet', 'Kitchen faucet is dripping', 'OPEN', 'MAINTENANCE', 'MEDIUM', 'EMAIL', 'OWNER_USER_ID', '10000000-0000-0000-0000-000000000001', 'TENANT1_USER_ID', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Broken heater', 'Heater not working', 'IN_PROGRESS', 'MAINTENANCE', 'HIGH', 'EMAIL', 'OWNER_USER_ID', '10000000-0000-0000-0000-000000000002', 'TENANT2_USER_ID', '00000000-0000-0000-0000-000000000001');

-- 6. Create test messages (mix of PUBLIC and INTERNAL)
-- Replace 'OWNER_USER_ID', 'TENANT1_USER_ID' with actual IDs
INSERT INTO messages (ticket_id, owner_user_id, tenant_user_id, direction, channel, visibility, body_text)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'OWNER_USER_ID', 'TENANT1_USER_ID', 'INBOUND', 'EMAIL', 'PUBLIC', 'The faucet has been dripping for 2 days'),
  ('20000000-0000-0000-0000-000000000001', 'OWNER_USER_ID', NULL, 'INTERNAL', 'INTERNAL', 'INTERNAL', 'Need to schedule plumber - use contractor John Smith'),
  ('20000000-0000-0000-0000-000000000001', 'OWNER_USER_ID', 'TENANT1_USER_ID', 'OUTBOUND', 'EMAIL', 'PUBLIC', 'We will send a plumber tomorrow between 9-11am');
```

## Test Scenarios

### 1. RLS Policy Verification

#### Test 1.1: Verify RLS is Enabled

```sql
-- Should return 'true' for all three tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tickets', 'messages');
```

**Expected Result:** All three tables have `rowsecurity = true`

#### Test 1.2: List All Policies

```sql
-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'tickets', 'messages')
ORDER BY tablename, policyname;
```

**Expected Result:** Should see policies for owner and tenant access

### 2. Tenant Access Tests

#### Test 2.1: Tenant Can Only See Their Own Tickets

**Test as Tenant 1:**
1. Log in as `tenant1@example.com`
2. Navigate to `/tenant/tickets`
3. Verify you see only ticket "Leaky faucet"
4. Try to access `/tenant/tickets/20000000-0000-0000-0000-000000000002` (Tenant 2's ticket)
5. **Expected:** Should see "Ticket not found or you don't have access"

**SQL Verification:**
```sql
-- Set session to tenant1's user ID
SET LOCAL jwt.claims.sub = 'TENANT1_USER_ID';

-- This should return only tenant1's ticket
SELECT id, subject FROM tickets WHERE tenant_user_id = 'TENANT1_USER_ID';
```

#### Test 2.2: Tenant Cannot See INTERNAL Messages

**Test as Tenant 1:**
1. Log in as `tenant1@example.com`
2. Open ticket `/tenant/tickets/20000000-0000-0000-0000-000000000001`
3. **Expected:** See 2 messages (initial report and owner's public response)
4. **Expected:** Do NOT see the internal message about scheduling plumber

**SQL Verification:**
```sql
-- Set session to tenant1's user ID
SET LOCAL jwt.claims.sub = 'TENANT1_USER_ID';

-- This should return only PUBLIC messages
SELECT id, body_text, visibility
FROM messages
WHERE ticket_id = '20000000-0000-0000-0000-000000000001'
AND tenant_user_id = 'TENANT1_USER_ID';
```

#### Test 2.3: Tenant Can Create Tickets

**Test as Tenant 1:**
1. Log in as `tenant1@example.com`
2. Navigate to `/tenant/tickets/new`
3. Fill in:
   - Subject: "Test ticket from tenant"
   - Description: "This is a test"
   - Category: MAINTENANCE
   - Priority: MEDIUM
4. Upload a test image
5. Submit
6. **Expected:** Ticket created and redirected to detail page
7. **Expected:** Ticket has `tenant_user_id` set to tenant1's ID

#### Test 2.4: Tenant Can Reply to Their Tickets

**Test as Tenant 1:**
1. Open one of your tickets
2. Scroll to "Add a Reply" section
3. Type a message: "Thank you for the update"
4. Click "Send Reply"
5. **Expected:** Message appears in timeline
6. **Expected:** Message has `visibility = 'PUBLIC'` and `direction = 'INBOUND'`

#### Test 2.5: Tenant Can Update Profile

**Test as Tenant 1:**
1. Navigate to `/tenant/profile`
2. **Expected:** See name, email, unit info (read-only)
3. Update phone number to "(555) 123-4567"
4. Click "Save Changes"
5. **Expected:** Success message
6. Refresh page
7. **Expected:** Phone number persisted

**SQL Verification:**
```sql
SELECT phone FROM tenants WHERE id = '10000000-0000-0000-0000-000000000001';
```

### 3. Owner Access Tests

#### Test 3.1: Owner Can See All Tickets

**Test as Owner:**
1. Log in as `owner@example.com`
2. Navigate to `/tickets`
3. **Expected:** See both "Leaky faucet" and "Broken heater" tickets

**SQL Verification:**
```sql
-- Set session to owner's user ID
SET LOCAL jwt.claims.sub = 'OWNER_USER_ID';

-- This should return all tickets owned by this owner
SELECT id, subject FROM tickets WHERE owner_user_id = 'OWNER_USER_ID';
```

#### Test 3.2: Owner Can See All Messages (Including INTERNAL)

**Test as Owner:**
1. Log in as `owner@example.com`
2. Open ticket `/tickets/20000000-0000-0000-0000-000000000001`
3. **Expected:** See all 3 messages including the INTERNAL one
4. **Expected:** INTERNAL message should have a badge or indicator

**SQL Verification:**
```sql
SET LOCAL jwt.claims.sub = 'OWNER_USER_ID';

SELECT id, body_text, visibility
FROM messages
WHERE ticket_id = '20000000-0000-0000-0000-000000000001';
```

#### Test 3.3: Owner Can Invite Tenants

**Test as Owner:**
1. Log in as `owner@example.com`
2. Navigate to `/tenants`
3. Click "Invite Tenant" (or similar button)
4. Fill in:
   - First Name: "New"
   - Last Name: "Tenant"
   - Email: "newtenant@example.com"
   - Unit: Select Unit 101
5. Submit
6. **Expected:** Invite created, email sent (check logs)
7. **Expected:** Can copy invite link

**SQL Verification:**
```sql
-- Check invite was created
SELECT token, expires_at, claimed_at
FROM tenant_invites
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE email = 'newtenant@example.com'
)
ORDER BY created_at DESC
LIMIT 1;
```

### 4. Invite Flow Tests

#### Test 4.1: Accept Invite (Not Logged In)

1. As a new user (logged out), click invite link: `/invite/accept?tenantId=xxx&token=xxx`
2. **Expected:** Redirected to Supabase Auth login
3. Sign up or log in as the invited email
4. **Expected:** Redirected back to `/invite/accept` with token
5. **Expected:** Success message: "Welcome, [Name]! Your account has been set up."
6. **Expected:** Redirected to `/tenant` after 2 seconds

**SQL Verification:**
```sql
-- Check tenant was bound to user
SELECT id, email, user_id FROM tenants WHERE email = 'newtenant@example.com';

-- Check invite was claimed
SELECT claimed_at FROM tenant_invites WHERE token = 'xxx';
```

#### Test 4.2: Accept Invite (Already Logged In)

1. Log in as the invited email
2. Click invite link
3. **Expected:** Immediate processing (no auth redirect)
4. **Expected:** Account bound and redirected to portal

#### Test 4.3: Expired Invite Token

1. Create an invite (or modify an existing one in DB to be expired):
```sql
UPDATE tenant_invites SET expires_at = NOW() - INTERVAL '1 day' WHERE token = 'xxx';
```
2. Try to accept the invite
3. **Expected:** Error: "Invite has expired"

#### Test 4.4: Already Claimed Invite

1. Try to accept an invite that's already been claimed
2. **Expected:** Error: "Invite not found or already claimed"

### 5. Role Switching Tests

#### Test 5.1: User with Both OWNER and TENANT Roles

**Setup:**
```sql
-- Give a user both roles (via Supabase Auth metadata)
-- user_metadata: { roles: ['OWNER', 'TENANT'] }
```

**Test:**
1. Log in with dual-role user
2. **Expected:** See RoleSwitcher component in header
3. Click to switch from OWNER to TENANT
4. **Expected:** Redirected to appropriate portal
5. **Expected:** Cookie `sb-active-role` updated
6. Switch back to OWNER
7. **Expected:** Redirected to `/tickets`

### 6. Security Boundary Tests

#### Test 6.1: Tenant Cannot Access Owner Endpoints

**Test as Tenant:**
1. Try to POST to `/api/v1/tenants/invite`
2. **Expected:** 403 Forbidden "Owner role required"

#### Test 6.2: Tenant Cannot Update Another Tenant's Profile

**Test as Tenant 1:**
1. Try to PATCH `/api/tenants/10000000-0000-0000-0000-000000000002` (Tenant 2's ID)
2. **Expected:** 403 Forbidden "You can only update your own profile"

#### Test 6.3: Unauthorized Access to APIs

**Test (Logged Out):**
1. Try to GET `/api/v1/tickets`
2. **Expected:** 401 Unauthorized

### 7. File Upload Tests

#### Test 7.1: Tenant Can Upload Files on New Ticket

**Test as Tenant:**
1. Create new ticket
2. Attach 2-3 images
3. Submit
4. **Expected:** Files uploaded to Supabase Storage
5. **Expected:** Attachments appear in ticket timeline

**SQL Verification:**
```sql
-- Check attachments in message
SELECT attachments FROM messages
WHERE ticket_id = 'NEW_TICKET_ID'
ORDER BY sent_at DESC
LIMIT 1;
```

#### Test 7.2: Verify Storage Paths

1. Check Supabase Storage bucket `attachments`
2. **Expected:** Files stored under `tickets/[timestamp]-[filename]`

### 8. Search and Filtering Tests

#### Test 8.1: Tenant Search

**Test as Tenant:**
1. Create multiple tickets with different subjects
2. Go to `/tenant/tickets`
3. Search for specific keyword
4. **Expected:** Only matching tickets appear
5. Filter by status = OPEN
6. **Expected:** Only open tickets appear

#### Test 8.2: Owner Search Across All Tenants

**Test as Owner:**
1. Go to `/tickets`
2. Search for keyword that appears in both tenants' tickets
3. **Expected:** All matching tickets shown regardless of tenant

## SQL Test Queries for Manual Verification

### Check RLS is Working

```sql
-- Test as tenant (replace with actual user ID)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "TENANT1_USER_ID"}';

-- Should only see tenant1's tickets
SELECT COUNT(*) FROM tickets;

-- Should only see PUBLIC messages
SELECT COUNT(*) FROM messages WHERE visibility = 'INTERNAL';
-- Expected: 0

RESET ROLE;
```

### Verify Data Isolation

```sql
-- Count tickets by tenant
SELECT
  t.id,
  t.first_name || ' ' || t.last_name as tenant_name,
  COUNT(tk.id) as ticket_count
FROM tenants t
LEFT JOIN tickets tk ON tk.tenant_user_id = t.user_id
GROUP BY t.id, t.first_name, t.last_name;
```

### Check Message Visibility Distribution

```sql
-- Count messages by visibility
SELECT
  visibility,
  COUNT(*) as message_count
FROM messages
GROUP BY visibility;
```

## Automated Test Script (Optional)

You can create automated tests using your preferred testing framework. Here's a sample structure:

```typescript
// tests/tenant-portal.test.ts

describe('Tenant Portal - RLS Tests', () => {
  describe('Tenant Access', () => {
    it('should only see own tickets', async () => {
      // Test implementation
    });

    it('should not see INTERNAL messages', async () => {
      // Test implementation
    });
  });

  describe('Owner Access', () => {
    it('should see all tickets', async () => {
      // Test implementation
    });
  });

  describe('Invite Flow', () => {
    it('should accept invite and bind user', async () => {
      // Test implementation
    });
  });
});
```

## Success Criteria

All tests should pass with:
- ✅ Tenants can only access their own data
- ✅ INTERNAL messages are hidden from tenants
- ✅ Owners can access all data for their properties
- ✅ Invite flow works end-to-end
- ✅ File uploads work correctly
- ✅ Role switching functions properly
- ✅ No unauthorized access to API endpoints
- ✅ Search and filtering respect RLS boundaries

## Troubleshooting Common Issues

**Issue:** Tenant can see other tenants' tickets
- **Solution:** Verify `tickets.tenant_user_id` is correctly set
- Check RLS policies are enabled

**Issue:** Tenant can see INTERNAL messages
- **Solution:** Verify `messages.visibility` is set to 'INTERNAL'
- Check RLS policy `messages_tenant_read` is applied correctly

**Issue:** Invite link doesn't work
- **Solution:** Check token hasn't expired
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check `tenant_invites.claimed_at` is NULL

**Issue:** File uploads fail
- **Solution:** Check Supabase Storage bucket exists
- Verify signed upload URLs are generated correctly
- Check CORS settings on storage bucket
