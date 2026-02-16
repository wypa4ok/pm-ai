# Complete Vercel Deployment Guide

**Time to Complete**: 30-45 minutes

**What You'll Deploy**:
- Next.js web application on Vercel
- PostgreSQL database on Supabase (already set up)
- Email sending via Gmail
- File storage on Supabase

---

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] GitHub account
- [ ] Your code pushed to a GitHub repository
- [ ] Supabase project created (with DATABASE_URL)
- [ ] Gmail App Password ready (from earlier setup)
- [ ] Credit card (for Vercel - though free tier is fine for soft launch)

---

## Part 1: Prepare Your Repository (10 minutes)

### Step 1.1: Verify Your Code is on GitHub

```bash
# Check your current remote
git remote -v

# Should show your GitHub repository
# If not set up:
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Push your code
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 1.2: Create Vercel Configuration File

This tells Vercel how to build your Next.js app:

**File**: `vercel.json` (create in root directory)

```json
{
  "buildCommand": "cd apps/web && npm run build",
  "devCommand": "cd apps/web && npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "regions": ["iad1"],
  "env": {
    "NODE_VERSION": "18.x"
  }
}
```

### Step 1.3: Update .gitignore

Make sure sensitive files aren't committed:

```bash
# Check that .env.local is in .gitignore
grep "\.env\.local" .gitignore || echo ".env.local" >> .gitignore

# Commit the vercel config
git add vercel.json
git commit -m "Add Vercel configuration"
git push origin main
```

---

## Part 2: Create Vercel Account & Project (5 minutes)

### Step 2.1: Sign Up for Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your repositories
5. Complete the sign-up process

### Step 2.2: Import Your Project

1. On Vercel Dashboard, click **"Add New Project"**
2. Click **"Import Git Repository"**
3. Find your repository in the list
4. Click **"Import"**
5. **WAIT** - Don't click Deploy yet! (We need to set environment variables first)

---

## Part 3: Configure Environment Variables (15 minutes)

This is the **most important part**. Get this right or your app won't work!

### Step 3.1: Navigate to Environment Variables

On the Vercel import page:
1. Scroll down to **"Environment Variables"** section
2. You'll see a form to add variables

### Step 3.2: Add All Required Variables

**Copy these from your `.env.local` file**. Add each one individually:

#### **Core Environment**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `NODE_ENV` | `production` | Type this |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | You'll get this after deploy - use placeholder for now |

#### **Database (Supabase)**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `DATABASE_URL` | `postgresql://...` | Supabase Dashboard → Settings → Database → Connection String (use "Connection pooling") |
| `SHADOW_DATABASE_URL` | Same as `DATABASE_URL` | Same source |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Dashboard → Settings → API → `service_role` `secret` key |
| `SUPABASE_STORAGE_BUCKET` | `attachments` | Type this |

#### **Public Variables (Important!)**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` | Same as above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` | Same as above |

#### **Email (Gmail)**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `GMAIL_FROM_ADDRESS` | `your-email@gmail.com` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | `xxxx xxxx xxxx xxxx` | From Google Account → Security → App Passwords |

#### **Optional but Recommended**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `SUPABASE_WEBHOOK_SECRET` | Generate a random string | Run: `openssl rand -hex 32` |
| `OPENAI_API_KEY` | `sk-...` | If you use AI features - OpenAI Dashboard |
| `GOOGLE_PLACES_API_KEY` | `AIza...` | If you use address autocomplete - Google Cloud Console |

### Step 3.3: Important Notes

**For each environment variable**:
1. Click **"Add"** or the **"+"** button
2. Enter the **Key** (exact spelling, case-sensitive!)
3. Enter the **Value**
4. Select environments: Check **"Production"**, **"Preview"**, and **"Development"**
5. Click **"Add"** to save

**Common Mistakes to Avoid**:
- ❌ Don't include quotes around values
- ❌ Don't add spaces before/after keys or values
- ❌ Don't use `.env` syntax (no `export` or `=`)
- ✅ Just paste the raw value

**Example**:
```
Key: SUPABASE_URL
Value: https://abcdefghijkl.supabase.co
```

---

## Part 4: Deploy! (5 minutes)

### Step 4.1: Start Deployment

1. After adding all environment variables, scroll to bottom
2. Click **"Deploy"**
3. Wait 2-5 minutes while Vercel builds your app

**What Happens**:
- Vercel installs dependencies
- Runs Prisma migrations
- Builds Next.js app
- Deploys to global CDN

### Step 4.2: Watch the Build

1. You'll see a build log in real-time
2. Look for:
   - ✅ `Installing dependencies`
   - ✅ `Building...`
   - ✅ `Uploading...`
   - ✅ `Deployment ready`

**If build fails**:
- Check the error message carefully
- Usually it's a missing environment variable
- Go to Project Settings → Environment Variables to fix

### Step 4.3: Get Your Deployment URL

After successful deployment:
1. You'll see: **"Congratulations! Your project has been deployed."**
2. Your URL will be: `https://your-app-name.vercel.app`
3. Click **"Visit"** to see your live site

---

## Part 5: Post-Deployment Setup (10 minutes)

### Step 5.1: Update NEXT_PUBLIC_APP_URL

**IMPORTANT**: You need to update this with your real URL!

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in sidebar
4. Find `NEXT_PUBLIC_APP_URL`
5. Click **"Edit"**
6. Change value to: `https://your-actual-app.vercel.app`
7. Click **"Save"**
8. **Redeploy**: Go to Deployments → Click "..." → "Redeploy"

**Why?**: This URL is used in:
- Tenant invite links
- OAuth redirects
- Email templates

### Step 5.2: Add Custom Domain (Optional)

**If you have a domain** (like `app.yourdomain.com`):

1. Go to Project Settings → **Domains**
2. Click **"Add"**
3. Enter your domain: `app.yourdomain.com`
4. Follow DNS setup instructions
5. Wait for DNS propagation (5-30 minutes)
6. Update `NEXT_PUBLIC_APP_URL` to your custom domain

**DNS Settings** (add to your domain registrar):
```
Type: CNAME
Name: app (or @ for root domain)
Value: cname.vercel-dns.com
```

### Step 5.3: Set Up Supabase Webhook

**CRITICAL**: This syncs Supabase Auth users to your database!

1. **Get your webhook URL**:
   ```
   https://your-app.vercel.app/api/v1/webhooks/supabase
   ```

2. **In Supabase Dashboard**:
   - Go to **Authentication** → **Hooks**
   - Enable **"Send event when user is created"**
   - URL: `https://your-app.vercel.app/api/v1/webhooks/supabase`
   - HTTP Headers:
     ```
     Authorization: Bearer YOUR_WEBHOOK_SECRET
     ```
   - Save

3. **Test the webhook**:
   - Create a test user in Supabase Auth
   - Check Vercel logs: Dashboard → Deployments → Latest → View Function Logs
   - Should see: `✅ User synced: test@example.com`

### Step 5.4: Set Up Storage Bucket (If not already done)

1. **In Supabase Dashboard**:
   - Go to **Storage**
   - Create bucket named: `attachments`
   - Make it **Private** (not public)
   - Set up RLS policies (if needed)

---

## Part 6: Verification & Testing (10 minutes)

### Step 6.1: Test Basic Access

1. Open your Vercel URL: `https://your-app.vercel.app`
2. **Expected**: Should see your landing/login page
3. **Not Expected**:
   - ❌ 500 error → Check environment variables
   - ❌ Database connection error → Check `DATABASE_URL`
   - ❌ "Module not found" → Rebuild

### Step 6.2: Test User Registration

1. Go to `/auth/signup`
2. Create a test account
3. **Expected**:
   - ✅ Account created
   - ✅ Redirected to onboarding
   - ✅ Check Supabase → Authentication → Users (should see new user)
   - ✅ Check database: `SELECT * FROM users;` (should have user record)

**If user not in database**:
- Check webhook is configured
- Check Vercel Function logs for webhook errors

### Step 6.3: Test Tenant Invite Email

1. Complete onboarding
2. Create a unit
3. Invite a tenant
4. **Check Vercel logs**:
   - Go to Deployments → Latest → **View Function Logs**
   - Search for: `Invite email sent`
5. **Expected**: See email sent confirmation

**If email fails**:
- Check `GMAIL_FROM_ADDRESS` and `GMAIL_APP_PASSWORD`
- Look for error in logs
- Test Gmail credentials locally first

### Step 6.4: Check Database Connection

```bash
# From your local machine
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Should show your test users
```

---

## Part 7: Monitoring & Logs (Important!)

### Step 7.1: Access Vercel Logs

**Real-time Logs**:
1. Vercel Dashboard → Your Project
2. Click **"Deployments"**
3. Click latest deployment
4. Click **"View Function Logs"**
5. See all your structured logs here!

**Search Logs**:
- Use the search box to filter
- Search for: `[ERROR]`, `[WARN]`, or specific keywords
- Logs are retained for 7 days (Hobby plan)

### Step 7.2: Set Up Alerts (Optional)

Vercel Pro plan includes:
- Email alerts on build failures
- Error tracking integration
- Performance monitoring

**For Free Tier**: Just check logs daily

---

## Part 8: Environment Management

### Step 8.1: Production vs Preview Environments

Vercel creates 3 environments:

1. **Production**: Main branch (`main` or `master`)
   - URL: `https://your-app.vercel.app`
   - Uses production environment variables

2. **Preview**: Feature branches
   - URL: `https://your-app-git-branch-name.vercel.app`
   - Uses preview environment variables
   - Great for testing!

3. **Development**: Local (`npm run dev`)
   - Uses development environment variables

### Step 8.2: Update Environment Variables

**To change a variable**:
1. Project Settings → Environment Variables
2. Find the variable
3. Click **Edit** (or Delete and re-add)
4. Save
5. **Redeploy** (Settings → Deployments → Redeploy)

**Important**: Changes don't take effect until you redeploy!

---

## Part 9: Troubleshooting

### Issue: Build Fails with "Module not found"

**Cause**: Dependency not installed

**Fix**:
```bash
# Locally, check if it builds
npm run build

# If it works locally but fails on Vercel:
# Check package.json is committed
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: "Database connection error"

**Cause**: Wrong `DATABASE_URL` or database not accessible

**Fix**:
1. Verify `DATABASE_URL` in Vercel matches Supabase
2. Use **Connection Pooling** URL from Supabase
3. Check Supabase database is running

**Get correct URL**:
- Supabase Dashboard → Settings → Database
- Copy **Connection Pooling** → **Connection String**
- Should look like: `postgresql://postgres.xxx:6543/postgres?pgbouncer=true`

### Issue: "Environment variable not defined"

**Cause**: Missing `NEXT_PUBLIC_*` variable

**Fix**:
1. Variables starting with `NEXT_PUBLIC_` must be set in Vercel
2. Add them in Project Settings → Environment Variables
3. Redeploy

### Issue: Emails not sending

**Cause**: Gmail credentials wrong or not set

**Fix**:
1. Check `GMAIL_FROM_ADDRESS` and `GMAIL_APP_PASSWORD` in Vercel
2. Test locally first:
   ```bash
   # In .env.local, add Gmail credentials
   npm run dev
   # Try sending an invite
   ```
3. Check Vercel Function logs for email errors

### Issue: "This page could not be found"

**Cause**: Routing issue or build problem

**Fix**:
1. Check your page exists in `apps/web/src/app/`
2. Verify build succeeded
3. Check Vercel build logs for errors
4. Try redeploy

### Issue: Webhook not working

**Cause**: Wrong URL or secret

**Fix**:
1. Verify webhook URL: `https://your-app.vercel.app/api/v1/webhooks/supabase`
2. Check Authorization header in Supabase matches `SUPABASE_WEBHOOK_SECRET`
3. Test by creating a user in Supabase
4. Check Vercel Function logs for incoming webhook

---

## Part 10: Performance & Optimization

### Step 10.1: Enable Analytics (Optional)

Vercel has built-in analytics:
1. Project Settings → **Analytics**
2. Enable **Web Analytics**
3. See real-time visitor data

### Step 10.2: Set Up Caching

Your Next.js app automatically gets:
- ✅ Global CDN distribution
- ✅ Static file caching
- ✅ API route caching (if configured)
- ✅ Image optimization

**No additional setup needed!**

---

## Part 11: Ongoing Deployment Workflow

### How to Deploy Updates

**Automatic Deployment** (recommended):
1. Make code changes locally
2. Commit to git: `git commit -m "Fix bug"`
3. Push to GitHub: `git push origin main`
4. **Vercel automatically deploys!** (within 1-2 minutes)

**Manual Deployment**:
1. Vercel Dashboard → Deployments
2. Click **"..."** menu
3. Click **"Redeploy"**

### Preview Deployments (Feature Branches)

**Test changes before production**:
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature

# Vercel creates a preview deployment!
# URL: https://your-app-git-feature-new-feature.vercel.app
```

Test the preview, then merge to main:
```bash
git checkout main
git merge feature/new-feature
git push origin main
# Automatically deploys to production!
```

---

## Part 12: Cost & Scaling

### Vercel Pricing

**Hobby (Free)**:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ Perfect for soft launch!

**Pro ($20/month)**:
- More bandwidth
- Better analytics
- Team features
- Priority support

**For 2-3 landlords**: Free tier is plenty!

### When to Upgrade

Upgrade when you exceed:
- 100 GB bandwidth/month
- Need team collaboration
- Want advanced analytics

---

## Quick Reference: Essential URLs

| Service | URL |
|---------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Vercel Logs** | Dashboard → Project → Deployments → View Logs |
| **Supabase Dashboard** | https://app.supabase.com |
| **Your App** | `https://your-app.vercel.app` |
| **GitHub Repo** | `https://github.com/YOUR-USERNAME/YOUR-REPO` |

---

## Checklist: Deployment Complete

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] All environment variables added (check against `.env.local.example`)
- [ ] First deployment succeeded
- [ ] `NEXT_PUBLIC_APP_URL` updated with real URL
- [ ] Supabase webhook configured
- [ ] Test user registration works
- [ ] Test tenant invite email sends
- [ ] Database connection verified
- [ ] Custom domain added (if applicable)
- [ ] Know where to check logs

---

## Next Steps

After successful deployment:

1. ✅ **Run the test plan**: `LAUNCH_TEST_PLAN.md`
2. ✅ **Monitor logs daily**: Check for errors
3. ✅ **Test all critical flows**: Registration, invites, tickets
4. ✅ **Onboard first landlord**: Start with yourself or a friend
5. ✅ **Gather feedback**: Note what needs improvement

---

## Getting Help

**Vercel Issues**:
- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord

**Next.js Issues**:
- Next.js Docs: https://nextjs.org/docs

**Database Issues**:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

---

**You're ready to deploy!** 🚀

Follow this guide step-by-step, and you'll have your app live in under an hour.
