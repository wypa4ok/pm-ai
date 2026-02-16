# Launch Readiness Test Plan

**Purpose**: Verify system is ready for soft launch with 2-3 landlords and ~10 properties

**Testers**: Run through this checklist before onboarding real landlords

---

## Pre-Test Setup

### Environment Verification
- [ ] `.env.local` has all required variables set (compare with `.env.local.example`)
- [ ] `NEXT_PUBLIC_APP_URL` is set to correct domain (or localhost:3000 for testing)
- [ ] `GMAIL_FROM_ADDRESS` and `GMAIL_APP_PASSWORD` are configured
- [ ] Database is running and migrations are applied
- [ ] Application starts without errors: `npm run dev`

---

## Test 1: Landlord Registration & Onboarding

### Test 1.1: New Landlord Signup
1. Open incognito browser window
2. Navigate to `/auth/signup`
3. Create a new account (Landlord A): `landlord-a@test.com`
4. Verify redirect to onboarding page
5. Fill in company name: "Test Properties A"
6. Fill in phone: "+1 555-0001"
7. Click "Continue to Dashboard"
8. **Expected**: Successfully redirected to dashboard at `/home` or `/`

### Test 1.2: Onboarding Skip Flow
1. Open incognito browser window
2. Create another account (Landlord B): `landlord-b@test.com`
3. On onboarding page, click "Skip for Now"
4. **Expected**: Successfully redirected to dashboard
5. **Expected**: Can still access all features

### Test 1.3: Onboarding Middleware
1. While logged in as Landlord A
2. Manually navigate to `/onboarding`
3. **Expected**: Should NOT be redirected (already completed)
4. Log out and log back in
5. **Expected**: Should land on dashboard, not onboarding page

---

## Test 2: Property Management

### Test 2.1: Create Units (Landlord A)
**Log in as Landlord A**

1. Navigate to Units/Properties section
2. Create Unit 1:
   - Name: "123 Main St - Apt 1A"
   - Address: "123 Main Street"
   - City: "New York"
   - State: "NY"
   - Postal Code: "10001"
3. Create Unit 2:
   - Name: "123 Main St - Apt 1B"
   - Similar address, different unit
4. Create Unit 3:
   - Name: "456 Oak Ave - Unit 1"
   - Different building
5. **Expected**: All 3 units appear in list
6. **Expected**: Can view each unit's details

### Test 2.2: Create Units (Landlord B)
**Log in as Landlord B**

1. Create 2 units with different addresses
2. **Expected**: Only Landlord B's 2 units appear in list
3. **CRITICAL**: Landlord A's units should NOT be visible

---

## Test 3: Data Isolation Verification

### Test 3.1: List Endpoints Isolation
**Log in as Landlord A**
1. Open browser DevTools → Network tab
2. Navigate to Units page
3. Check the API request to `/api/v1/units`
4. **Expected**: Response only contains Landlord A's 3 units
5. **Expected**: NO units from Landlord B

**Log in as Landlord B**
1. Navigate to Units page
2. Check API response
3. **Expected**: Response only contains Landlord B's 2 units
4. **Expected**: NO units from Landlord A

### Test 3.2: Direct API Test (Advanced)
**Using curl or Postman:**
1. Get Landlord A's access token from browser cookies
2. Call: `GET /api/v1/units` with Landlord A's token
3. **Expected**: Only returns Landlord A's units
4. Get Landlord B's access token
5. Call same endpoint with Landlord B's token
6. **Expected**: Only returns Landlord B's units

---

## Test 4: Tenant Invite Flow

### Test 4.1: Invite Tenant to Landlord A's Unit
**Log in as Landlord A**

1. Navigate to Tenants section
2. Click "Invite Tenant"
3. Fill form:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: `tenant-john@test.com`
   - Unit: Select "123 Main St - Apt 1A"
4. Submit invite
5. **Expected**: Success message appears
6. **Expected**: Invite link displayed (or check logs for email)

### Test 4.2: Check Email Delivery
1. Check server logs for email output
2. **Expected**: See log: `✅ Invite email sent successfully to: tenant-john@test.com`
3. **If email failed**: Logs should show invite link that can be shared manually
4. Copy the invite link for next test

### Test 4.3: Attempt Cross-Landlord Invite (Security Test)
**This test requires API knowledge - optional but important**

1. Get Landlord B's unit ID from database or API response
2. As Landlord A, try to create invite with Landlord B's unitId
3. **Expected**: Returns 403 Forbidden error
4. **Expected**: Error message: "You do not own this unit"

---

## Test 5: Tenant Portal

### Test 5.1: Accept Invite
1. Open incognito browser window
2. Paste the invite link from Test 4.1
3. **Expected**: Redirected to signup page with email pre-filled
4. Complete signup for `tenant-john@test.com`
5. **Expected**: Redirected back to invite acceptance
6. **Expected**: Success message: "Welcome, John! Your account has been set up"
7. **Expected**: Automatically redirected to `/tenant` portal

### Test 5.2: Tenant Portal Access
**Logged in as tenant-john@test.com**

1. **Expected**: Should see tenant-specific dashboard
2. Navigate to tickets/maintenance requests
3. **Expected**: Can view tickets (even if empty)
4. Try to navigate to `/home` (landlord area)
5. **Expected**: Redirected back to `/tenant` portal

### Test 5.3: Tenant Cannot Access Landlord Data
**Logged in as tenant**

1. Open DevTools → Network tab
2. Try: `GET /api/v1/units`
3. **Expected**: Returns 403 Forbidden (no OWNER role)

---

## Test 6: Ticket Management

### Test 6.1: Create Ticket (as Landlord)
**Log in as Landlord A**

1. Navigate to Tickets
2. Create new ticket:
   - Unit: "123 Main St - Apt 1A"
   - Subject: "Leaky faucet"
   - Description: "Kitchen faucet is dripping"
   - Priority: High
3. **Expected**: Ticket created successfully
4. **Expected**: Ticket appears in list

### Test 6.2: Create Ticket (as Tenant)
**Log in as tenant-john@test.com**

1. Navigate to tickets in tenant portal
2. Create maintenance request:
   - Issue: "Heating not working"
   - Description: "No heat in bedroom"
3. **Expected**: Ticket submitted successfully
4. **Expected**: Appears in tenant's ticket list

### Test 6.3: Landlord Sees Tenant Ticket
**Log in as Landlord A**

1. Navigate to Tickets
2. **Expected**: Should see BOTH tickets:
   - The "Leaky faucet" ticket created by landlord
   - The "Heating not working" ticket from tenant
3. **Expected**: Can open and respond to tenant's ticket

### Test 6.4: Landlord B Cannot See Landlord A's Tickets
**Log in as Landlord B**

1. Navigate to Tickets
2. **Expected**: Empty list (or only Landlord B's own tickets)
3. **CRITICAL**: Should NOT see any of Landlord A's tickets

---

## Test 7: Tenancy Management

### Test 7.1: Create Tenancy
**Log in as Landlord A**

1. Navigate to Tenancies
2. Create new tenancy:
   - Unit: "123 Main St - Apt 1A"
   - Start Date: Today
   - Monthly Rent: $2000
3. **Expected**: Tenancy created successfully

### Test 7.2: Add Member to Tenancy
1. Open the tenancy created in 7.1
2. Click "Add Member"
3. Add existing tenant: "John Doe" (tenant-john@test.com)
4. Set as Primary: Yes
5. **Expected**: Member added successfully
6. **Expected**: John Doe appears in tenancy members list

### Test 7.3: Cross-Landlord Tenancy Protection
**This requires API testing**

1. As Landlord A, get a tenancy ID
2. As Landlord B (different session), try to access that tenancy
3. **Expected**: 403 Forbidden or 404 Not Found
4. **Expected**: Cannot modify Landlord A's tenancy

---

## Test 8: Error Handling & Logging

### Test 8.1: Check Logs for Structured Output
1. Trigger any action (e.g., create invite)
2. Check server console
3. **Expected**: JSON-formatted logs like:
```json
{
  "timestamp": "2025-...",
  "level": "INFO",
  "message": "Tenant invite created successfully",
  "userId": "...",
  "endpoint": "/api/v1/tenants/invite",
  "tenantId": "...",
  "tenantEmail": "..."
}
```

### Test 8.2: Trigger Validation Error
1. Try to create invite with invalid email: "not-an-email"
2. **Expected**: Clear error message displayed
3. **Expected**: No stack traces visible to user

### Test 8.3: Test Without Unit Ownership
1. As Landlord A, try to invite tenant to unit they don't own
2. **Expected**: 403 Forbidden error
3. **Expected**: Log entry shows authorization failure

---

## Test 9: Mobile Responsiveness (Quick Check)

### Test 9.1: Mobile Browser Test
1. Open Chrome DevTools → Toggle device toolbar (mobile view)
2. Test key flows:
   - Login
   - View units list
   - Create tenant invite
   - View ticket (as tenant)
3. **Expected**: UI is usable on mobile (no horizontal scroll, buttons clickable)

---

## Test 10: Production Readiness

### Test 10.1: Environment Variables
- [ ] All required env vars set (check `.env.local.example`)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] `SUPABASE_WEBHOOK_SECRET` configured
- [ ] Email credentials working

### Test 10.2: Database Backups
- [ ] Verify database backup is configured
- [ ] Test restore process (if applicable)

### Test 10.3: Error Monitoring
- [ ] Structured logs appearing correctly
- [ ] Can grep logs for errors: `grep '\[ERROR\]' logs`

---

## Critical Issues Checklist

If ANY of these fail, DO NOT launch:

- [ ] ❌ Landlord A can see Landlord B's data
- [ ] ❌ Tenant can access landlord endpoints
- [ ] ❌ Invites cannot be sent
- [ ] ❌ Tenant cannot accept invite
- [ ] ❌ Authorization checks not working
- [ ] ❌ Application crashes on critical flows

---

## Success Criteria

✅ All tests pass
✅ Data isolation confirmed between landlords
✅ Tenant portal works end-to-end
✅ Email invites sent successfully
✅ No security vulnerabilities found
✅ Mobile UI is usable

---

## Post-Launch Monitoring

After onboarding first landlords, monitor:

1. **Error Logs**: Check daily for `[ERROR]` entries
   ```bash
   grep '[ERROR]' logs | tail -100
   ```

2. **Email Delivery**: Verify invites are being sent
   ```bash
   grep 'Invite email sent' logs | tail -20
   ```

3. **User Feedback**: Note any issues reported by landlords/tenants

4. **Database Growth**: Monitor record counts
   ```sql
   SELECT COUNT(*) FROM users WHERE role = 'OWNER';
   SELECT COUNT(*) FROM tenants;
   SELECT COUNT(*) FROM tickets;
   ```

---

## Troubleshooting

### Emails Not Sending
- Check `GMAIL_FROM_ADDRESS` and `GMAIL_APP_PASSWORD` are set
- Look for email errors in logs
- Test SMTP connection manually
- Fallback: Share invite links manually from logs

### User Can't Login
- Check Supabase dashboard for user
- Verify `SUPABASE_URL` and keys are correct
- Check browser console for errors

### Data Visible Across Landlords
- CRITICAL: Stop onboarding immediately
- Check API responses include `ownerUserId` filter
- Review recent code changes
- Test with fresh database

---

## Ready to Launch?

- [ ] All tests passed
- [ ] No critical issues found
- [ ] Database backed up
- [ ] Monitoring set up
- [ ] Email working
- [ ] Team briefed on issues to watch

**If all checkboxes are ✅, you're ready to onboard your first landlords!**
