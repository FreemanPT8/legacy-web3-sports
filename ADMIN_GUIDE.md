# LEGACY Platform - Admin Guide

## User Role Management

### Available Roles

1. **Member** - Default role for new users
   - Access to public content
   - Can unlock features with XP
   - Cannot access admin panels

2. **Admin** - Content manager
   - Can create and manage courses
   - Can create and manage blog posts
   - Can view user list and statistics
   - Can promote users to Admin role
   - Cannot create Super Admins

3. **Super Admin** - Full platform control
   - All Admin permissions
   - Can promote users to any role including Super Admin
   - Can modify other Super Admins
   - Full access to all admin features

---

## Managing User Roles via Admin Panel

### Access User Management
1. Log in as Admin or Super Admin
2. Navigate to `/admin`
3. Click "User Management"

### View User Details
1. Find the user in the list
2. Click the "View" button
3. Modal displays complete user information including:
   - Personal details
   - XP and streak information
   - Social media links
   - Verification status

### Edit User Role and XP
1. Find the user in the list
2. Click the "Edit" button
3. Select new role from dropdown:
   - **Member** - Regular user
   - **Admin** - Content manager
   - **Super Admin** - Only visible if you are Super Admin
4. Adjust XP if needed
5. Click "Save Changes"

### Important Notes
- Only Super Admins can create or modify other Super Admins
- Admins can promote users to Admin but not Super Admin
- All role changes are logged in the system

---

## Managing User Roles via Direct Database Access

If you need to manage roles directly in the Supabase database:

### Promote User to Admin

```sql
UPDATE users
SET role = 'Admin'
WHERE username = 'username_here';
```

### Promote User to Super Admin

```sql
UPDATE users
SET role = 'Super Admin'
WHERE username = 'username_here';
```

### Demote User to Member

```sql
UPDATE users
SET role = 'Member'
WHERE username = 'username_here';
```

### Find User by Email

```sql
SELECT id, username, email, role, xp_total, created_at
FROM users
WHERE email = 'user@example.com';
```

### List All Admins

```sql
SELECT username, email, role, xp_total, created_at
FROM users
WHERE role IN ('Admin', 'Super Admin')
ORDER BY created_at DESC;
```

### Adjust User XP

```sql
UPDATE users
SET xp_total = 1000
WHERE username = 'username_here';
```

### Unlock User Profile

```sql
UPDATE users
SET profile_unlocked = true
WHERE username = 'username_here';
```

### Verify User Email

```sql
UPDATE users
SET email_verified = true
WHERE username = 'username_here';
```

---

## Content Creation

### Creating Courses

1. Navigate to `/admin/courses`
2. Click "Create New Course"
3. Fill in course details for all 6 languages:
   - English (en)
   - Portuguese (pt)
   - Spanish (es)
   - French (fr)
   - Italian (it)
   - German (de)
4. Add modules and lessons
5. Set XP thresholds and rewards
6. Publish when ready

### Creating Blog Posts

1. Navigate to `/admin/blog`
2. Click "Create New Post"
3. Fill in post details for all languages
4. Set category and XP reward
5. Upload featured image
6. Publish or save as draft

---

## XP Management

### Manual XP Awards

1. Navigate to `/admin/xp`
2. Enter username
3. Enter XP amount and reason
4. Click "Award XP"

### View XP History

1. Navigate to `/admin/xp`
2. Scroll to "Recent XP Activity"
3. View all XP transactions with filters

---

## User Registration Flow

### How New Users Join

1. User visits `/signup`
2. Fills registration form:
   - Username (unique)
   - Full name
   - Email (unique)
   - Password
   - Country
3. System creates account with:
   - Role: Member
   - XP: 0
   - Profile locked until 99 XP
4. Welcome email sent (if configured)
5. User redirected to `/dashboard`

### First Login Experience

1. User sees dashboard with:
   - Current XP: 0
   - Profile locked message
   - Available courses
   - Daily missions (if configured)
2. User can:
   - Start first lesson
   - Read blog posts
   - Earn XP to unlock features

---

## XP Unlock Thresholds

These are the default XP thresholds users need to unlock features:

- **99 XP** - Profile editing unlocked
- **369 XP** - Forum read access
- **444 XP** - Forum interactions (like, reply)
- **555 XP** - Create forum topics
- **3333 XP** - Hall of Fame access

---

## Email Configuration

### Setting Up Email Notifications

1. Create a Resend account at https://resend.com
2. Generate API key
3. Add to `.env`:
   ```env
   RESEND_API_KEY=your_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Email Types Sent

1. **Welcome Email** - Sent on registration
2. **Streak Bonus Email** - Sent when user completes 7-day streak
3. Future: Password reset, notifications, etc.

### Without Email Configuration

The platform works fine without email configuration:
- Registration still works
- Users are created successfully
- Emails are skipped with warning in logs
- No impact on functionality

---

## Emergency Procedures

### If Admin Panel Is Inaccessible

Use direct database queries in Supabase SQL Editor:

1. Log in to Supabase Dashboard
2. Go to SQL Editor
3. Run queries from "Managing User Roles via Direct Database Access" section above

### Create Emergency Super Admin

```sql
INSERT INTO users (
  username,
  full_name,
  email,
  password_hash,
  country,
  role,
  xp_total,
  profile_unlocked,
  email_verified
) VALUES (
  'emergency_admin',
  'Emergency Admin',
  'emergency@legacy.com',
  '$2a$10$8Kx5XxH9JQK7x1TqV4K5JOL8TqV4K5JOL8TqV4K5JOL8TqV4K5JOL',
  'Global',
  'Super Admin',
  9999,
  true,
  true
);
```

Note: Password hash above is for 'admin123'. Generate new one using bcrypt.

### Reset User Password

You'll need to generate a bcrypt hash of the new password first:

```javascript
// Run in Node.js or browser console with bcrypt library
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('new_password', 10);
console.log(hash);
```

Then update in database:

```sql
UPDATE users
SET password_hash = 'hash_from_above'
WHERE username = 'username_here';
```

---

## Monitoring and Analytics

### View Platform Statistics

Navigate to `/admin/analytics` to see:
- Total users by role
- XP distribution
- Content engagement
- Course completion rates
- Active users

### View User Activity

1. Go to `/admin/users`
2. Use search and filters
3. Click "View" on any user to see:
   - Login history
   - XP earned
   - Content completed
   - Streak information

---

## Best Practices

### Role Assignment
- Start new team members as Members
- Promote to Admin after training
- Keep Super Admin count minimal
- Review Admin list regularly

### Content Creation
- Test in draft mode first
- Verify all 6 language translations
- Set appropriate XP rewards
- Use clear, engaging descriptions

### XP Economy
- Award 7-33 XP per lesson
- Award 5-33 XP per blog read
- Give 12 XP per daily mission
- Bonus 222 XP for 7-day streak
- Keep economy balanced

### Security
- Change default passwords immediately
- Use strong passwords for admin accounts
- Review user list regularly for suspicious accounts
- Monitor XP transactions for anomalies
- Keep API keys secure

---

## Troubleshooting

### User Can't Log In
1. Check username exists in database
2. Verify password is correct
3. Check `email_verified` status
4. Look for login errors in logs

### Content Not Appearing
1. Verify `published` is true
2. Check XP threshold requirements
3. Ensure multilingual content is filled
4. Check database RLS policies

### XP Not Updating
1. Check XP transactions table
2. Verify lesson completion logic
3. Look for errors in logs
4. Test with different user

### Emails Not Sending
1. Verify RESEND_API_KEY is set
2. Check FROM_EMAIL is configured
3. Look at logs for email errors
4. Test with Resend dashboard

---

## Support Resources

- **GitHub Repository**: Link to your repo
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Database Migrations**: `/supabase/migrations/`
- **API Documentation**: Check `/app/api/` folder
- **Component Library**: shadcn/ui documentation

---

## Quick Reference Commands

### Create Super Admin
```sql
UPDATE users SET role = 'Super Admin' WHERE username = 'username';
```

### List All Users
```sql
SELECT username, email, role, xp_total FROM users ORDER BY created_at DESC;
```

### Check User XP
```sql
SELECT username, xp_total, streak_count FROM users WHERE username = 'username';
```

### View Recent XP Transactions
```sql
SELECT u.username, x.action, x.xp_earned, x.created_at
FROM xp_transactions x
JOIN users u ON x.user_id = u.id
ORDER BY x.created_at DESC
LIMIT 20;
```

---

**Last Updated**: November 2025
**Version**: 1.0
**Platform**: LEGACY - Gamified Web3 Academy
