# Quick Start: Launch Preparation

**Time to Complete**: ~2-3 hours of testing

---

## Step 1: Environment Setup (15 minutes)

1. **Copy environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in required variables** in `.env.local`:
   ```bash
   # Most important ones:
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to your domain
   GMAIL_FROM_ADDRESS=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Get from Google
   ```

3. **Get Gmail App Password**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification (if not already)
   - Search for "App Passwords"
   - Generate new app password for "Mail"
   - Copy the 16-character password to `GMAIL_APP_PASSWORD`

4. **Verify database**:
   ```bash
   npm run dev
   # Check for errors in console
   ```

---

## Step 2: Quick Smoke Test (30 minutes)

### Test Data Isolation (MOST IMPORTANT!)

1. **Create Landlord A**:
   - Open browser: http://localhost:3000/auth/signup
   - Email: `test-landlord-a@test.com`
   - Complete onboarding with company name

2. **Create a unit for Landlord A**:
   - Add a property/unit (any address)
   - Note the unit name

3. **Create Landlord B** (incognito/different browser):
   - Email: `test-landlord-b@test.com`
   - Complete onboarding

4. **Create a unit for Landlord B**:
   - Add a different property/unit

5. **VERIFY ISOLATION**:
   - As Landlord A: Should ONLY see Landlord A's unit
   - As Landlord B: Should ONLY see Landlord B's unit
   - **If both see all units → CRITICAL BUG, do not launch!**

---

## Step 3: Test Tenant Invite (30 minutes)

1. **As Landlord A, invite a tenant**:
   - Go to Tenants → Invite
   - Email: `test-tenant@test.com`
   - Select Landlord A's unit
   - Submit

2. **Check email delivery**:
   - Look in server logs for:
     ```
     ✅ Invite email sent successfully to: test-tenant@test.com
     ```
   - Copy the invite link from logs

3. **Accept invite** (incognito browser):
   - Paste invite link
   - Create account for tenant
   - Verify redirect to tenant portal

4. **Verify tenant access**:
   - Tenant should see tenant portal at `/tenant`
   - Tenant should NOT be able to access `/home` or landlord features

---

## Step 4: Run Full Test Plan (1-2 hours)

Follow the comprehensive test plan:
```bash
# Open this file and go through each test
cat LAUNCH_TEST_PLAN.md
```

**Focus on these sections**:
- ✅ Test 3: Data Isolation Verification (CRITICAL!)
- ✅ Test 4: Tenant Invite Flow
- ✅ Test 5: Tenant Portal
- ✅ Test 8: Error Handling & Logging

---

## Step 5: Pre-Launch Checklist

- [ ] Data isolation verified (Landlord A can't see Landlord B's data)
- [ ] Emails sending successfully
- [ ] Tenant invites working end-to-end
- [ ] Onboarding flow working
- [ ] No errors in console/logs during testing
- [ ] Mobile UI looks reasonable (quick check)
- [ ] Database backups enabled
- [ ] Know where to check logs for errors

---

## Step 6: Launch! 🚀

You're ready to onboard your first real landlord!

### Monitoring After Launch

**Daily checks (first week)**:
```bash
# Check for errors
grep '[ERROR]' logs | tail -50

# Check email delivery
grep 'Invite email sent' logs

# Check user growth
# (Check database or Supabase dashboard)
```

**What to watch**:
- Any error logs
- User feedback about confusing UI
- Email delivery failures
- Performance issues (slow pages)

---

## Common Issues & Quick Fixes

### "Email not sent"
- Check `GMAIL_APP_PASSWORD` is correct (16 chars, no spaces)
- Check `GMAIL_FROM_ADDRESS` matches the Google account
- Fallback: Share invite links manually from logs

### "Can't login"
- Check Supabase dashboard has the user
- Verify `SUPABASE_URL` and keys in `.env.local`
- Clear browser cookies and try again

### "Landlord sees other landlord's data"
- **STOP! Critical security issue**
- Check API responses in Network tab
- Verify `ownerUserId` filter is applied
- Review recent code changes
- Re-run security tests

---

## Success Metrics (First Week)

- [ ] 2-3 landlords onboarded
- [ ] 5-10 properties added
- [ ] 5-20 tenant invites sent
- [ ] At least 1 tenant accepted invite
- [ ] No critical bugs reported
- [ ] No data leakage between landlords
- [ ] Email delivery working reliably

---

## Files You Should Know

| File | Purpose |
|------|---------|
| `LAUNCH_TEST_PLAN.md` | Complete testing checklist (use this!) |
| `LAUNCH_PREP_SUMMARY.md` | What was changed and why |
| `PRODUCTION_READINESS_PLAN.md` | Full production roadmap |
| `.env.local.example` | All environment variables |
| `src/server/lib/logger.ts` | Error logging utility |
| `src/server/services/authorization.ts` | Authorization checks |

---

## Need Help?

1. **Check the logs first**:
   ```bash
   grep '[ERROR]' logs | tail -100
   ```

2. **Review the test plan**: `LAUNCH_TEST_PLAN.md`

3. **Check environment variables**: Compare `.env.local` with `.env.local.example`

4. **Database issues**: Check Supabase dashboard

5. **Still stuck**: Review `LAUNCH_PREP_SUMMARY.md` troubleshooting section

---

## After Soft Launch

Based on feedback from your 2-3 landlords, you can add:

**Week 2-4**:
- Bulk tenant import (if manually adding many tenants is tedious)
- Better mobile UI (if landlords complain)
- Email templates improvements (if requested)

**Month 2-3**:
- Performance optimizations (if queries slow down)
- Advanced features based on feedback
- Scaling infrastructure (if growing beyond 10 landlords)

---

**You're ready! Go launch!** 🎉

Remember: Start small, monitor closely, iterate quickly.
