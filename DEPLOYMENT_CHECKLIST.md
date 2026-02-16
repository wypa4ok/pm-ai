# Vercel Deployment Checklist

**Quick reference while deploying**. See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## Pre-Deployment

- [ ] Code is on GitHub and pushed to main branch
- [ ] Local `.env.local` has all variables (compare with `.env.local.example`)
- [ ] `vercel.json` exists in root directory
- [ ] `.gitignore` includes `.env.local`
- [ ] App builds successfully locally: `npm run build`

---

## Vercel Setup

- [ ] Created Vercel account (https://vercel.com)
- [ ] Connected GitHub account to Vercel
- [ ] Imported project from GitHub

---

## Environment Variables (CRITICAL!)

Copy from your `.env.local` to Vercel Project Settings → Environment Variables

### Required Variables

**Database**:
- [ ] `DATABASE_URL` (from Supabase - use Connection Pooling URL!)
- [ ] `SHADOW_DATABASE_URL` (same as DATABASE_URL)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_STORAGE_BUCKET` = `attachments`

**Public Variables** (MUST have NEXT_PUBLIC_ prefix):
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (same as SUPABASE_URL)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same as SUPABASE_ANON_KEY)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app` (update after first deploy!)

**Email**:
- [ ] `GMAIL_FROM_ADDRESS`
- [ ] `GMAIL_APP_PASSWORD` (16 chars from Google App Passwords)

**Environment**:
- [ ] `NODE_ENV` = `production`

### Optional but Recommended

- [ ] `SUPABASE_WEBHOOK_SECRET` (generate with: `openssl rand -hex 32`)
- [ ] `OPENAI_API_KEY` (if using AI features)
- [ ] `GOOGLE_PLACES_API_KEY` (if using address autocomplete)

---

## First Deployment

- [ ] All environment variables added
- [ ] Clicked "Deploy" button
- [ ] Build succeeded (wait 2-5 minutes)
- [ ] Got deployment URL: `https://your-app.vercel.app`
- [ ] Visited URL and app loads

---

## Post-Deployment Configuration

### Update App URL
- [ ] Go to Vercel → Settings → Environment Variables
- [ ] Edit `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
- [ ] Redeploy (Deployments → ... → Redeploy)

### Configure Supabase Webhook
- [ ] Supabase → Authentication → Hooks
- [ ] Enable "Send event when user is created"
- [ ] URL: `https://your-app.vercel.app/api/v1/webhooks/supabase`
- [ ] Header: `Authorization: Bearer YOUR_WEBHOOK_SECRET`
- [ ] Save webhook

### Verify Storage Bucket
- [ ] Supabase → Storage
- [ ] Bucket named `attachments` exists
- [ ] Bucket is Private

---

## Testing

### Test 1: User Registration
- [ ] Go to `https://your-app.vercel.app/auth/signup`
- [ ] Create test account
- [ ] Redirected to onboarding
- [ ] User appears in Supabase Auth
- [ ] User appears in database `users` table

### Test 2: Webhook
- [ ] Check Vercel Function Logs
- [ ] Should see: `✅ User synced: test@example.com`
- [ ] If not, check webhook configuration

### Test 3: Email Sending
- [ ] Complete onboarding
- [ ] Create a unit
- [ ] Invite a tenant
- [ ] Check Vercel logs for: `Invite email sent successfully`

### Test 4: Database Connection
- [ ] App can read/write to database
- [ ] No connection errors in logs

---

## Custom Domain (Optional)

- [ ] Go to Vercel → Settings → Domains
- [ ] Add domain: `app.yourdomain.com`
- [ ] Add DNS record to domain registrar:
  ```
  Type: CNAME
  Name: app
  Value: cname.vercel-dns.com
  ```
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Update `NEXT_PUBLIC_APP_URL` to custom domain
- [ ] Redeploy

---

## Monitoring Setup

- [ ] Know where to find logs: Vercel → Deployments → View Function Logs
- [ ] Bookmark Vercel dashboard
- [ ] Set calendar reminder to check logs daily (first week)

---

## Final Verification

- [ ] App is accessible at production URL
- [ ] Can create account and login
- [ ] Emails are sending
- [ ] No errors in Vercel logs
- [ ] Database operations work
- [ ] Tenant invites work end-to-end

---

## Common Issues

### Build Fails
- Check build logs for specific error
- Usually missing environment variable
- Verify all `NEXT_PUBLIC_*` variables are set

### Database Connection Error
- Use Connection Pooling URL from Supabase (has `:6543` port)
- Verify `DATABASE_URL` is correct

### Emails Not Sending
- Check `GMAIL_APP_PASSWORD` is correct (16 chars, no spaces)
- Check Vercel logs for specific email error

### Webhook Not Working
- Verify URL is correct
- Check Authorization header matches `SUPABASE_WEBHOOK_SECRET`
- Look for webhook requests in Vercel logs

---

## Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com
- **Your App**: _________________________
- **GitHub Repo**: _________________________

---

## Done!

Once all items are checked, you're live! 🚀

**Next**: Run `LAUNCH_TEST_PLAN.md` to verify everything works.
