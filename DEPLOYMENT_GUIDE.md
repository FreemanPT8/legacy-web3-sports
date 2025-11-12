# LEGACY Platform - Deployment Guide

## Prerequisites

- Supabase project already configured
- Vercel or Netlify account for deployment
- (Optional) Resend account for email notifications

---

## Step 1: Apply Database Migrations

The platform includes two critical migrations that must be applied to your Supabase database:

1. Initial schema (`20251103162942_create_initial_schema.sql`)
2. Missions system fix (`20251104000000_fix_missions_system.sql`)

Both migrations have been applied automatically via the Supabase MCP tool during development.

To verify migrations in production:

```bash
# Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC;
```

---

## Step 2: Generate JWT Secret

Generate a secure JWT secret for production:

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output for use in environment variables.

---

## Step 3: (Optional) Configure Resend for Emails

If you want email notifications (welcome emails, streak bonuses):

1. Sign up at https://resend.com
2. Verify your domain or use the test domain
3. Create an API key: https://resend.com/api-keys
4. Copy the API key (starts with `re_`)

---

## Step 4: Configure Environment Variables

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_generated_jwt_secret_from_step_2

# Optional but recommended
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=onboarding@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### For Netlify Deployment

1. Go to Site settings > Build & deploy > Environment
2. Add the same environment variables as above

---

## Step 5: Deploy the Application

### Deploying to Vercel

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploying to Netlify

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Or connect your GitHub repository to Netlify for automatic deployments.

---

## Step 6: Configure Cron Jobs (Important!)

The daily missions system requires a cron job to generate missions every day at midnight.

### Using Vercel Cron Jobs

1. Create `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/missions/generate",
    "schedule": "0 0 * * *"
  }]
}
```

2. Commit and push to trigger redeployment

### Using External Cron Service

If your hosting doesn't support cron jobs, use a service like:

- **Cron-job.org**: Free cron job service
- **EasyCron**: Another free option
- **GitHub Actions**: Free with scheduled workflows

Configure to call:
```
POST https://yourdomain.com/api/missions/generate
```

Schedule: Daily at 00:00 UTC (midnight)

---

## Step 7: Test Your Deployment

### Test Authentication
1. Visit `/signup` and create a test account
2. Check if you receive a welcome email (if Resend is configured)
3. Login with the new account
4. Verify JWT token is stored in localStorage

### Test Daily Missions
1. Manually trigger mission generation:
   ```bash
   curl -X POST https://yourdomain.com/api/missions/generate
   ```
2. Login to dashboard
3. Verify 3 missions appear
4. Try completing a mission

### Test Admin Access
1. Login with superadmin credentials (from initial migration)
   - Username: `superadmin`
   - Password: (set during migration)
2. Visit `/admin/users`
3. Verify you can see all users
4. Test creating a blog post at `/admin/blog/create`

### Test Streak System
1. Login daily for 7 consecutive days
2. On day 7, verify you receive:
   - +222 XP bonus
   - Streak bonus email (if Resend configured)

---

## Step 8: Security Checklist

Before going live, verify:

- [ ] JWT_SECRET is strong and unique (not the default)
- [ ] Supabase RLS policies are enabled
- [ ] Admin routes return 403 for non-admin users
- [ ] Passwords are never returned in API responses
- [ ] All environment variables are set in production
- [ ] HTTPS is enforced
- [ ] Database backups are configured in Supabase

---

## Step 9: Monitoring and Maintenance

### Monitor Application Health

1. **Vercel Analytics**: Enable in project settings
2. **Supabase Logs**: Check database queries and errors
3. **Email Delivery**: Monitor Resend dashboard for bounces

### Regular Maintenance Tasks

- **Weekly**: Check daily mission generation logs
- **Monthly**: Review user growth and XP distribution
- **Quarterly**: Audit admin access and permissions

---

## Troubleshooting

### Issue: Missions not generating

**Solution**: Verify cron job is configured and calling the API correctly

```bash
# Test manually
curl -X POST https://yourdomain.com/api/missions/generate

# Expected response
{"success":true,"missions":[...],"message":"Generated 3 missions for today"}
```

### Issue: Emails not sending

**Cause**: Resend API key not configured or invalid

**Solution**:
1. Verify RESEND_API_KEY in environment variables
2. Check Resend dashboard for API key status
3. Verify FROM_EMAIL domain is verified in Resend

### Issue: Admin routes return 401

**Cause**: JWT token not being sent or invalid

**Solution**:
1. Check browser localStorage for `token`
2. Verify JWT_SECRET matches between environments
3. Clear browser cache and login again

### Issue: Build fails with TypeScript errors

**Solution**:
```bash
# Run type check locally
npm run typecheck

# Common fixes
npm install
rm -rf .next
npm run build
```

---

## Performance Optimization

### Database Optimization

1. **Indexes**: Already configured in migrations
2. **RLS Policies**: Optimized for performance
3. **Connection Pooling**: Handled by Supabase

### Application Optimization

1. **Next.js Static Generation**: Enabled for most pages
2. **API Route Optimization**: Using Supabase client-side queries where possible
3. **Image Optimization**: Use Next.js Image component

---

## Scaling Considerations

### Current Capacity

- **Users**: Unlimited (Supabase scales automatically)
- **Missions**: 3 per user per day
- **API Requests**: Limited by Vercel/Netlify plan

### When to Scale

- **1000+ users**: Consider upgrading Supabase plan
- **High traffic**: Enable Vercel Edge Functions
- **Many admins**: Implement rate limiting

---

## Support Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Resend: https://resend.com/docs

### Platform Specific
- Supabase Dashboard: https://app.supabase.com
- Resend Dashboard: https://resend.com/overview
- Vercel Dashboard: https://vercel.com/dashboard

---

## Post-Deployment Checklist

- [ ] Application accessible at production URL
- [ ] SSL certificate is valid (HTTPS working)
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Cron job for daily missions working
- [ ] Authentication flow working (signup, login, logout)
- [ ] Email notifications sending (if configured)
- [ ] Admin access working
- [ ] Daily missions generating
- [ ] Streak tracking functional
- [ ] All pages loading without errors
- [ ] Build completed successfully with no errors

---

## Success Criteria

Your deployment is successful when:

1. Users can sign up and receive welcome email
2. Users can login and see their dashboard
3. Daily missions appear and can be completed
4. Streak counter increments daily
5. Admins can access `/admin` routes
6. All API endpoints return expected responses
7. No console errors on client or server

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check Supabase logs for database errors
2. Check Vercel/Netlify logs for deployment errors
3. Verify all environment variables are set
4. Test API endpoints with curl or Postman
5. Check browser console for client-side errors

---

**Congratulations!** Your LEGACY platform is now deployed and ready for production use!

Last Updated: November 2025
Version: 1.0.0
