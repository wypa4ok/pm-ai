# Tenant Invite Flow

## Overview

This document explains the complete flow for inviting tenants and having them accept invitations to access the tenant portal.

## Complete Flow

### 1. Landlord Creates Tenant Invite

**Location**: Landlord UI → Tenants page

1. Landlord fills out tenant information:
   - First Name, Last Name
   - **Email address** (required - will be used for authentication)
   - Phone number
   - Property details
   - Move-in date

2. System creates:
   - Tenant record in database (with `userId = null`)
   - TenantInvite record with unique token and expiration (7 days)
   - Invite link: `https://yourdomain.com/invite/accept?tenantId=xxx&token=xxx`

3. System sends email via Gmail (App Password or OAuth2):
   - To: Tenant's email address
   - Subject: "You're invited to the Rental Ops tenant portal"
   - Body: Contains invite link and landlord contact info
   - Reply-To: Landlord's email (if provided)

### 2. Tenant Receives Email & Clicks Link

**Location**: Email → Invite Accept Page

When tenant clicks the invite link, they arrive at `/invite/accept?tenantId=xxx&token=xxx`

The system:
1. Fetches invite information (tenant email, name) via `/api/v1/tenants/invite-info`
2. Checks if user is authenticated via `/api/v1/auth/me`

### 3a. Tenant Not Authenticated → Sign Up Flow

**Location**: `/auth/signup`

If the tenant doesn't have an account:

1. System redirects to: `/auth/signup?returnUrl=/invite/accept?tenantId=xxx&token=xxx&email=tenant@example.com`

2. Sign-up form is pre-filled with:
   - **Email**: From invite (read-only)
   - Full Name: Empty (tenant enters)
   - Password: Empty (tenant creates)

3. Tenant submits form

4. System creates Supabase user account:
   - Email: From invite
   - Password: Tenant's chosen password
   - User metadata: { name: "Tenant Name" }

5. System sets authentication cookies:
   - `sb-access-token`: JWT access token (httpOnly, 1 hour)
   - `sb-refresh-token`: Refresh token (httpOnly, 30 days)

6. System redirects back to: `/invite/accept?tenantId=xxx&token=xxx`

### 3b. Tenant Already Has Account → Login Flow

**Location**: `/auth/login`

If the tenant already has an account, they can click "Log in" from the signup page:

1. System redirects to: `/auth/login?returnUrl=/invite/accept?tenantId=xxx&token=xxx&email=tenant@example.com`

2. Login form is pre-filled with:
   - **Email**: From invite
   - Password: Empty

3. Tenant submits credentials

4. System authenticates with Supabase

5. System sets authentication cookies

6. System redirects back to: `/invite/accept?tenantId=xxx&token=xxx`

### 4. Accept Invite & Bind Account

**Location**: `/invite/accept` (authenticated)

Now that the tenant is authenticated:

1. System fetches authenticated user ID from `/api/v1/auth/me`

2. System calls `/api/v1/tenants/accept` with:
   ```json
   {
     "tenantId": "xxx",
     "token": "xxx",
     "userId": "authenticated-user-id"
   }
   ```

3. API validates:
   - Invite exists and is not claimed
   - Invite has not expired
   - Tenant is not already linked to a different user
   - **Email validation** (important): The authenticated user's email should match the tenant's email

4. API performs atomic transaction:
   ```sql
   -- Link tenant to user
   UPDATE tenants
   SET user_id = 'authenticated-user-id'
   WHERE id = 'tenant-id';

   -- Mark invite as claimed
   UPDATE tenant_invites
   SET claimed_at = NOW()
   WHERE id = 'invite-id';

   -- Link existing tickets to user
   UPDATE tickets
   SET tenant_user_id = 'authenticated-user-id'
   WHERE tenant_id = 'tenant-id'
   AND tenant_user_id IS NULL;
   ```

5. System shows success message:
   > "Welcome, [First Name]! Your account has been set up."

6. After 2 seconds, redirects to tenant portal: `/tenant`

### 5. Tenant Accesses Portal

**Location**: `/tenant` (Tenant Portal)

Now the tenant can:
- View their tickets
- Create new maintenance requests
- Add messages/photos to tickets
- Update their profile
- See property information

## Security Considerations

### Email Validation

**Critical**: The system should validate that the authenticated user's email matches the tenant's email from the invite.

**Why?** To prevent:
- User A receiving an invite for tenant@example.com
- User A sharing the link with User B (different email)
- User B claiming the tenant account

**Implementation** (add to `/api/v1/tenants/accept`):

```typescript
// After fetching invite and user
const authenticatedUserEmail = authData.user.email;
const inviteTenantEmail = invite.tenant.email;

if (authenticatedUserEmail !== inviteTenantEmail) {
  return errorResponse(
    "email_mismatch",
    `This invite is for ${inviteTenantEmail}. Please sign up or log in with that email address.`,
    403,
  );
}
```

### Token Security

- Tokens are UUIDs (128-bit random)
- Tokens expire after 7 days
- Tokens can only be used once (`claimedAt` prevents reuse)
- Tokens are validated on every request

### Session Security

- Cookies are httpOnly (not accessible via JavaScript)
- Cookies use secure flag in production
- Cookies use SameSite=lax to prevent CSRF
- Access tokens expire after 1 hour (require refresh)

## Error Handling

### Invite Not Found or Already Claimed

**Error**: "Invite not found or already claimed"

**Causes**:
- Invalid token or tenant ID
- Invite already accepted by another user
- Invite deleted

**Solution**: Contact landlord to resend invite

### Invite Expired

**Error**: "Invite has expired"

**Cause**: More than 7 days since invite was created

**Solution**: Contact landlord to resend invite

### Email Mismatch

**Error**: "This invite is for tenant@example.com. Please sign up or log in with that email address."

**Cause**: Authenticated user's email doesn't match tenant email

**Solution**:
- Log out and sign up with correct email
- Or ask landlord to send invite to correct email

### Tenant Already Linked

**Error**: "This tenant is already linked to a different user"

**Cause**: Tenant account already bound to another user ID

**Solution**: This is a conflict - contact support or landlord

## Environment Variables Required

```env
# Supabase (for authentication)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxx...

# Email (Gmail App Password - recommended)
GMAIL_FROM_ADDRESS=noreply@yourdomain.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxx

# Optional: OAuth2 (alternative to App Password)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GMAIL_REFRESH_TOKEN=1//0xxxxx

# App URL (for invite links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# or
APP_URL=https://yourdomain.com
```

## Testing the Flow

### 1. Test Complete New Tenant Flow

1. As landlord, create tenant invite with email `newtenant@example.com`
2. Copy invite link from console or email
3. Open link in incognito window (not authenticated)
4. Verify redirect to `/auth/signup` with email pre-filled
5. Sign up with that email
6. Verify redirect back to `/invite/accept`
7. Verify "Success!" message appears
8. Verify redirect to `/tenant` portal
9. Verify tenant can see their dashboard

### 2. Test Existing User Flow

1. Create another tenant invite with email `existinguser@example.com`
2. First, manually sign up a user with `existinguser@example.com`
3. Log out
4. Click invite link
5. Click "Log in" instead of "Sign up"
6. Log in with existing credentials
7. Verify invite acceptance and redirect to portal

### 3. Test Email Mismatch (After Implementing Validation)

1. Create tenant invite for `tenantA@example.com`
2. Sign up/log in as `userB@example.com`
3. Try to accept invite
4. Verify error: "This invite is for tenantA@example.com"

### 4. Test Expired Invite

1. Create tenant invite
2. Manually update `expires_at` in database to yesterday
3. Click invite link
4. Verify error: "Invite has expired"

### 5. Test Already Claimed

1. Create and accept an invite (complete flow)
2. Try to use the same invite link again
3. Verify error: "Invite not found or already claimed"

## Files Involved

### Frontend Pages
- `/apps/web/src/app/invite/accept/page.tsx` - Invite acceptance orchestration
- `/apps/web/src/app/auth/signup/page.tsx` - New user registration
- `/apps/web/src/app/auth/login/page.tsx` - Existing user login
- `/apps/web/src/app/(tenant)/tenant/page.tsx` - Tenant portal dashboard

### API Endpoints
- `/apps/web/src/app/api/v1/tenants/invite-info/route.ts` - Fetch invite details
- `/apps/web/src/app/api/v1/tenants/accept/route.ts` - Accept invite and bind account
- `/apps/web/src/app/api/v1/auth/me/route.ts` - Check authentication status
- `/apps/web/src/app/api/v1/auth/signup/route.ts` - Create new user
- `/apps/web/src/app/api/v1/auth/login/route.ts` - Authenticate user

### Services
- `/src/server/services/tenant-invite.ts` - Create invite and send email
- `/src/server/integrations/invite-email.ts` - Send invite email via Gmail

### Database Schema
- `Tenant` - Tenant record with `userId` (nullable until claimed)
- `TenantInvite` - Invite record with token and expiration
- `Ticket` - Tickets with `tenantUserId` (set during claim)

## Future Enhancements

1. **Email Confirmation**: Require email verification after signup
2. **Resend Invite**: Allow landlords to resend expired invites
3. **Multiple Properties**: Support tenants with multiple properties
4. **Invite History**: Show invite status (pending, accepted, expired) in UI
5. **Custom Invite Messages**: Allow landlords to personalize invite emails
6. **SMS Invites**: Alternative to email invites for tenants without email
