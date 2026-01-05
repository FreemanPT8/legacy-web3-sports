# LEGACY Platform - Quick Reference Guide

## Getting Started in 5 Minutes

### 1. Start the Platform
```bash
npm run dev
```
Visit: http://localhost:3000

### 2. Log In as Super Admin
- URL: http://localhost:3000/login
- Username: `superadmin`
- Password: `admin123`

### 3. Manage Users
- Go to: http://localhost:3000/admin/users
- Click "Edit" on any user
- Change role to "Admin" or "Super Admin"
- Save changes

---

## Common Tasks

### Register New User
```
URL: /signup
Required: username, full_name, email, password, country
Result: New user with role "Member", XP 0
```

### Promote User to Admin (UI)
```
1. Login as Admin/Super Admin
2. Go to /admin/users
3. Find user, click "Edit"
4. Select "Admin" role
5. Save
```

### Promote User to Admin (SQL)
```sql
UPDATE users
SET role = 'Admin'
WHERE username = 'username_here';
```

### Create Course
```
1. Login as Admin
2. Go to /admin/courses
3. Click "Create New Course"
4. Fill all 6 languages
5. Add modules and lessons
6. Publish
```

### Create Blog Post
```
1. Login as Admin
2. Go to /admin/blog
3. Click "Create New Post"
4. Fill all 6 languages
5. Set category and XP reward
6. Publish
```

### Award Manual XP
```
1. Go to /admin/xp
2. Enter username
3. Enter XP amount and reason
4. Click "Award XP"
```

---

## Important URLs

| Page | URL | Access |
|------|-----|--------|
| Homepage | `/` | Public |
| Sign Up | `/signup` | Public |
| Log In | `/login` | Public |
| Dashboard | `/dashboard` | Authenticated |
| User Profile | `/profile` | Authenticated |
| Admin Dashboard | `/admin` | Admin/Super Admin |
| User Management | `/admin/users` | Admin/Super Admin |
| Course Management | `/admin/courses` | Admin/Super Admin |
| Blog Management | `/admin/blog` | Admin/Super Admin |
| XP Management | `/admin/xp` | Admin/Super Admin |
| Analytics | `/admin/analytics` | Admin/Super Admin |

---

## User Roles

| Role | Can Do |
|------|--------|
| **Member** | • Use platform<br>• Earn XP<br>• Complete courses<br>• Read blog<br>• Unlock private comments at 369 XP |
| **Admin** | • All Member features<br>• Create courses<br>• Create blog posts<br>• View users<br>• Promote to Admin<br>• Award XP |
| **Super Admin** | • All Admin features<br>• Promote to Super Admin<br>• Modify other Super Admins<br>• Full platform control |

---

## XP Thresholds

| XP | Unlocks |
|----|---------|
| 0 | Registration complete |
| 99 | Profile editing |
| 369 | Private comments & emoji reactions |
| 3333 | Hall of Fame |

---

## XP Rewards

| Action | XP |
|--------|-----|
| Complete lesson | 7-33 |
| Read blog post | 5-33 |
| Complete daily mission | 12 |
| 7-day streak bonus | 222 |
| Manual award | Admin decides |

---

## Database Quick Commands

### View All Users
```sql
SELECT username, email, role, xp_total
FROM users
ORDER BY created_at DESC;
```

### Find User by Email
```sql
SELECT username, email, role, xp_total
FROM users
WHERE email = 'user@example.com';
```

### Change User Role
```sql
UPDATE users
SET role = 'Admin'
WHERE username = 'username_here';
```

### Adjust User XP
```sql
UPDATE users
SET xp_total = 500
WHERE username = 'username_here';
```

### List All Admins
```sql
SELECT username, email, role, created_at
FROM users
WHERE role IN ('Admin', 'Super Admin')
ORDER BY created_at DESC;
```

### View Recent XP Activity
```sql
SELECT u.username, x.action, x.xp_earned, x.created_at
FROM xp_transactions x
JOIN users u ON x.user_id = u.id
ORDER BY x.created_at DESC
LIMIT 20;
```

### Unlock User Profile
```sql
UPDATE users
SET profile_unlocked = true
WHERE username = 'username_here';
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Admin - Users
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[id]` - Get user details
- `PATCH /api/admin/users/[id]` - Update user role/XP

### Content
- `GET /api/courses` - List courses
- `POST /api/admin/courses/create` - Create course
- `GET /api/blog` - List blog posts
- `POST /api/admin/blog/create` - Create blog post

### XP & Gamification
- `POST /api/xp/award` - Award XP manually
- `GET /api/xp/history` - Get XP history
- `POST /api/missions/generate` - Generate daily missions
- `POST /api/missions/complete` - Complete mission
- `POST /api/streak/update` - Update user streak

---

## Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret
```

### Optional
```env
RESEND_API_KEY=your_resend_key
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Troubleshooting

### Can't Log In
1. Check username exists: `SELECT * FROM users WHERE username = 'user';`
2. Reset password using bcrypt hash
3. Check `email_verified` status

### User Can't Access Admin Panel
1. Check role: `SELECT role FROM users WHERE username = 'user';`
2. Promote if needed: `UPDATE users SET role = 'Admin' WHERE username = 'user';`
3. Clear browser cache and re-login

### Content Not Appearing
1. Check `published = true` in database
2. Verify XP threshold requirements
3. Check all 6 language fields are filled

### Emails Not Sending
1. Verify `RESEND_API_KEY` is set
2. Check `FROM_EMAIL` is configured
3. Platform works fine without - emails are optional

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

---

## Default Accounts

### Super Admin (Created by seed script)
```
Username: superadmin
Password: admin123
Email: admin@legacy.com
Role: Super Admin
XP: 9999
```

### Demo User (Created by seed script)
```
Username: demo_user
Password: demo123
Email: demo@legacy.com
Role: Member
XP: 500
```

**IMPORTANT**: Change these passwords in production!

---

## File Structure

```
/app                      # Next.js pages
  /api                    # API endpoints
    /admin                # Admin-only APIs
    /auth                 # Authentication
  /admin                  # Admin pages
/components               # React components
  /layout                 # Header, Footer
  /ui                     # shadcn/ui components
/contexts                 # React contexts
/lib                      # Utilities
  auth.ts                 # Authentication logic
  supabase.ts            # Database client
  xp.ts                   # XP system
  email.ts               # Email sending
/supabase/migrations      # Database migrations
```

---

## Support

### Documentation
- `README.md` - Quick start
- `ADMIN_GUIDE.md` - Complete admin guide
- `PRODUCTION_READY.md` - Production deployment
- `QUICK_REFERENCE.md` - This file

### Database
- Supabase Dashboard: https://supabase.com/dashboard
- SQL Editor: Use for direct queries
- Migrations: In `/supabase/migrations/`

### Tools
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com

---

## Security Best Practices

1. Change default admin passwords immediately
2. Use strong passwords for all accounts
3. Keep `JWT_SECRET` secure and random
4. Don't commit `.env` to version control
5. Review admin list regularly
6. Monitor XP transactions for abuse
7. Keep dependencies updated
8. Use HTTPS in production
9. Enable 2FA on Supabase account
10. Regular database backups

---

## Performance Tips

1. Enable caching on static pages
2. Optimize images before upload
3. Use Vercel Edge Functions for API routes
4. Monitor Supabase query performance
5. Index frequently queried columns
6. Paginate large lists
7. Lazy load heavy components
8. Enable Vercel Analytics
9. Use CDN for static assets
10. Monitor bundle size

---

This quick reference covers the most common tasks. For detailed instructions, see:
- **Admin Tasks**: `ADMIN_GUIDE.md`
- **Full Setup**: `PRODUCTION_READY.md`
- **Technical Details**: `README.md`
