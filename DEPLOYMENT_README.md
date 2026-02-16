# Deployment Guide - Start Here! 🚀

**Ready to deploy your property management system?** Follow these guides in order.

---

## 📚 Documentation Files

| File | When to Use |
|------|-------------|
| **QUICK_START_LAUNCH.md** | ⭐ Testing locally before deployment |
| **VERCEL_DEPLOYMENT_GUIDE.md** | ⭐ Complete Vercel deployment walkthrough (30-45 min) |
| **DEPLOYMENT_CHECKLIST.md** | Quick reference while deploying |
| **LAUNCH_TEST_PLAN.md** | After deployment - verify everything works |
| **LAUNCH_PREP_SUMMARY.md** | What was changed for launch readiness |

---

## 🎯 Quick Start Path

### Option A: Deploy to Vercel (Recommended)

**Time**: 45 minutes + testing

1. **Prepare** (5 min):
   ```bash
   # Make sure code is on GitHub
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy** (30 min):
   - Open `VERCEL_DEPLOYMENT_GUIDE.md`
   - Follow step-by-step
   - Print out `DEPLOYMENT_CHECKLIST.md` to track progress

3. **Test** (2 hours):
   - Open `LAUNCH_TEST_PLAN.md`
   - Run all tests
   - Fix any issues

4. **Launch** 🎉:
   - Onboard your first landlord!

---

### Option B: Local Testing First

**Time**: 2-3 hours

1. **Test Locally**:
   - Open `QUICK_START_LAUNCH.md`
   - Follow the 3-hour testing guide
   - Verify everything works on localhost

2. **Then Deploy**:
   - Follow Option A above

---

## 🔑 What You Need Before Starting

### For Local Testing
- [ ] Node.js 18+ installed
- [ ] Supabase project created
- [ ] Gmail App Password
- [ ] `.env.local` configured

### For Vercel Deployment
- [ ] GitHub account
- [ ] Code pushed to GitHub
- [ ] Supabase project created (with connection string)
- [ ] Gmail App Password ready
- [ ] 45 minutes of focused time

---

## 📋 Pre-Flight Checklist

Run these commands to verify you're ready:

```bash
# 1. Check Node version (should be 18+)
node --version

# 2. Install dependencies
npm install

# 3. Check environment variables
cat .env.local.example
# Make sure your .env.local has all these variables

# 4. Test build locally
npm run build
# Should succeed with no errors

# 5. Test locally
npm run dev
# Visit http://localhost:3000
```

**If all above succeed**: You're ready to deploy! 🚀

**If any fail**: Fix the issue before deploying

---

## 🆘 Common Pre-Deployment Issues

### "Cannot find module"
```bash
npm install
```

### "Build failed"
```bash
# Check the error message
# Usually missing environment variable
# Compare .env.local with .env.local.example
```

### "Database connection error"
```bash
# Verify DATABASE_URL in .env.local
# Should start with: postgresql://
# Test connection:
psql $DATABASE_URL -c "SELECT 1;"
```

### "Email not configured"
```bash
# Get Gmail App Password:
# 1. Go to https://myaccount.google.com/security
# 2. Enable 2-Step Verification
# 3. Search "App Passwords"
# 4. Generate password for "Mail"
# 5. Add to .env.local:
#    GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

---

## 🎓 Deployment Options Compared

| Option | Time | Difficulty | Best For |
|--------|------|------------|----------|
| **Vercel** | 45 min | Easy | Quick production deployment |
| **Railway** | 30 min | Easy | Simple deploys, good free tier |
| **Render** | 45 min | Medium | More control than Vercel |
| **AWS/Google Cloud** | 2-3 hours | Hard | Large scale, enterprise |
| **Docker + VPS** | 2-4 hours | Hard | Full control, custom setup |

**For soft launch**: Vercel is the easiest and fastest! ⚡

---

## 📝 Environment Variables Quick Reference

Must be set in both `.env.local` AND Vercel:

**Database** (from Supabase):
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**Public** (MUST have NEXT_PUBLIC_ prefix):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Email**:
```bash
GMAIL_FROM_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

See `.env.local.example` for complete list!

---

## 🔍 After Deployment

### Where to Check Logs

**Vercel**:
- Dashboard → Your Project → Deployments → View Function Logs
- Search for `[ERROR]` to find issues

**Locally**:
```bash
# Run dev server and watch terminal
npm run dev
```

### How to Deploy Updates

**Automatic** (recommended):
```bash
git add .
git commit -m "Fix bug"
git push origin main
# Vercel auto-deploys!
```

**Manual**:
- Vercel Dashboard → Deployments → Redeploy

---

## ✅ Success Criteria

You're successfully deployed when:

- [ ] App loads at your Vercel URL
- [ ] Can create a new account
- [ ] User appears in Supabase and database
- [ ] Onboarding flow works
- [ ] Can create units/properties
- [ ] Tenant invite emails send
- [ ] No errors in Vercel logs
- [ ] All tests in `LAUNCH_TEST_PLAN.md` pass

---

## 🎯 Next Steps After Deployment

1. **Run full test plan**:
   ```bash
   open LAUNCH_TEST_PLAN.md
   # Go through each test
   ```

2. **Set up monitoring**:
   - Bookmark Vercel logs page
   - Check logs daily for first week
   - Note any user-reported issues

3. **Onboard first landlord**:
   - Start with yourself or a friend
   - Watch them use the app
   - Note confusing UX
   - Fix critical issues immediately

4. **Iterate based on feedback**:
   - Keep a list of feature requests
   - Prioritize based on frequency
   - Deploy updates continuously

---

## 💡 Pro Tips

### Before Deploying
- ✅ Test locally first (`QUICK_START_LAUNCH.md`)
- ✅ Verify all env vars are set
- ✅ Build succeeds locally
- ✅ Have 1 hour of uninterrupted time

### During Deployment
- ✅ Follow the guide step-by-step
- ✅ Don't skip environment variables
- ✅ Double-check NEXT_PUBLIC_ variables
- ✅ Keep Supabase dashboard open in another tab

### After Deployment
- ✅ Update NEXT_PUBLIC_APP_URL immediately
- ✅ Configure Supabase webhook
- ✅ Test critical flows right away
- ✅ Check logs for errors

---

## 🆘 Getting Help

### Documentation
1. **Check this repo's docs first**:
   - VERCEL_DEPLOYMENT_GUIDE.md
   - LAUNCH_TEST_PLAN.md
   - TROUBLESHOOTING section in guides

2. **Official docs**:
   - Vercel: https://vercel.com/docs
   - Next.js: https://nextjs.org/docs
   - Supabase: https://supabase.com/docs

3. **Community**:
   - Vercel Discord: https://vercel.com/discord
   - Next.js GitHub Discussions
   - Supabase Discord

### Common Issues Already Solved
Check the troubleshooting sections in:
- `VERCEL_DEPLOYMENT_GUIDE.md` (Part 9)
- `LAUNCH_PREP_SUMMARY.md` (Troubleshooting section)

---

## 📞 Quick Links

| Resource | URL |
|----------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://app.supabase.com |
| **Google App Passwords** | https://myaccount.google.com/apppasswords |
| **GitHub Repo** | Your repo URL |
| **Deployed App** | (fill in after deployment) |

---

## 🚀 Ready to Deploy?

**Start here**:
1. Open `VERCEL_DEPLOYMENT_GUIDE.md`
2. Print or open `DEPLOYMENT_CHECKLIST.md` alongside
3. Set aside 45 minutes
4. Follow the guide step-by-step

**Good luck! You've got this!** 🎉

---

*Last updated: February 2026*
