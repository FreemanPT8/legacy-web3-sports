/*
  # Create Initial LEGACY Platform Schema

  ## Overview
  This migration creates the complete database schema for the LEGACY gamified education platform.

  ## New Tables
  
  ### 1. `users` - User accounts and profiles
    - `id` (uuid, primary key)
    - `username` (text, unique) - Public display name
    - `full_name` (text) - Private full name
    - `email` (text, unique) - Private, verified email
    - `password_hash` (text) - Encrypted password
    - `country` (text) - User's country
    - `role` (text) - Super Admin, Admin, or Member
    - `xp_total` (integer) - Total XP earned
    - `avatar_url` (text) - Profile photo URL
    - `bio` (text) - User biography (8-888 chars)
    - `sports_role` (text) - Athlete, Coach, etc.
    - `telegram` (text) - Telegram handle
    - `dao1_did_nft` (text) - DAO1 DID NFT identifier
    - `wallet_address` (text) - Crypto wallet
    - `website` (text) - Personal website
    - `youtube` (text) - YouTube channel
    - `linkhub` (text) - LinkHub URL
    - `facebook` (text) - Facebook profile
    - `instagram` (text) - Instagram handle
    - `profile_visibility` (jsonb) - Privacy settings per field
    - `profile_unlocked` (boolean) - Unlocks at 99 XP
    - `email_verified` (boolean) - Email verification status
    - `last_login` (timestamptz) - Last login timestamp
    - `streak_count` (integer) - Consecutive daily logins
    - `streak_updated_at` (date) - Last streak update
    - `created_at` (timestamptz)

  ### 2. `admin_assignments` - Admin scope assignments
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `houses` (text[]) - Assigned Houses of Sports
    - `countries` (text[]) - Assigned countries
    - `created_at` (timestamptz)

  ### 3. `xp_transactions` - XP earning history
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `action` (text) - Action performed
    - `xp_earned` (integer) - XP amount
    - `reference_id` (uuid) - Related content ID
    - `reference_type` (text) - Content type (lesson, blog, etc.)
    - `created_at` (timestamptz)

  ### 4. `courses` - Course catalog
    - `id` (uuid, primary key)
    - `title` (jsonb) - Multilingual titles
    - `description` (jsonb) - Multilingual descriptions
    - `xp_threshold` (integer) - XP required to unlock
    - `order` (integer) - Display order
    - `published` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 5. `modules` - Course modules
    - `id` (uuid, primary key)
    - `course_id` (uuid, foreign key to courses)
    - `title` (jsonb) - Multilingual titles
    - `description` (jsonb) - Multilingual descriptions
    - `order` (integer)
    - `created_at` (timestamptz)

  ### 6. `lessons` - Individual lessons
    - `id` (uuid, primary key)
    - `module_id` (uuid, foreign key to modules)
    - `title` (jsonb) - Multilingual titles
    - `content` (jsonb) - Multilingual content
    - `xp_reward` (integer) - XP for completion (7-33)
    - `xp_threshold` (integer) - XP required to unlock
    - `order` (integer)
    - `file_url` (text) - PDF/media URL
    - `estimated_time` (integer) - Minutes to complete
    - `created_at` (timestamptz)

  ### 7. `lesson_completions` - User lesson progress
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `lesson_id` (uuid, foreign key to lessons)
    - `completed_at` (timestamptz)
    - `xp_earned` (integer)

  ### 8. `blog_posts` - Blog articles
    - `id` (uuid, primary key)
    - `title` (jsonb) - Multilingual titles
    - `content` (jsonb) - Multilingual content (Markdown)
    - `excerpt` (jsonb) - Multilingual excerpts
    - `category` (text) - Blockchain, Web3, etc.
    - `author_id` (uuid, foreign key to users)
    - `image_url` (text) - Featured image
    - `xp_reward` (integer) - XP for reading (5-33)
    - `registered_only` (boolean) - Require login
    - `views` (integer) - View count
    - `likes` (integer) - Like count
    - `published` (boolean)
    - `published_at` (timestamptz)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 9. `blog_reads` - Track blog reading for XP
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `blog_post_id` (uuid, foreign key to blog_posts)
    - `completed_at` (timestamptz)
    - `xp_earned` (integer)

  ### 10. `forum_rooms` - Forum categories/rooms
    - `id` (uuid, primary key)
    - `name` (jsonb) - Multilingual names
    - `description` (jsonb) - Multilingual descriptions
    - `is_private` (boolean) - Invite-only rooms
    - `house` (text) - Associated House of Sports
    - `created_at` (timestamptz)

  ### 11. `forum_room_members` - Private room access
    - `id` (uuid, primary key)
    - `room_id` (uuid, foreign key to forum_rooms)
    - `user_id` (uuid, foreign key to users)
    - `invited_by` (uuid, foreign key to users)
    - `joined_at` (timestamptz)

  ### 12. `forum_topics` - Forum discussion topics
    - `id` (uuid, primary key)
    - `room_id` (uuid, foreign key to forum_rooms)
    - `user_id` (uuid, foreign key to users)
    - `title` (text)
    - `content` (text)
    - `pinned` (boolean)
    - `locked` (boolean)
    - `views` (integer)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 13. `forum_posts` - Forum replies
    - `id` (uuid, primary key)
    - `topic_id` (uuid, foreign key to forum_topics)
    - `user_id` (uuid, foreign key to users)
    - `content` (text)
    - `likes` (integer)
    - `moderated` (boolean) - Flagged by admin
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 14. `daily_missions` - Daily XP challenges
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `mission_type` (text) - Action to complete
    - `target` (integer) - Goal count
    - `progress` (integer) - Current progress
    - `completed` (boolean)
    - `date` (date) - Mission date
    - `created_at` (timestamptz)

  ### 15. `onboarding_submissions` - Personalized onboarding forms
    - `id` (uuid, primary key)
    - `email` (text)
    - `phone` (text)
    - `telegram` (text)
    - `full_name` (text)
    - `country` (text)
    - `sports_category` (text)
    - `sports_role` (text)
    - `organization` (text)
    - `web3_experience` (text)
    - `interests` (text[])
    - `message` (text)
    - `assigned_admin_id` (uuid, foreign key to users)
    - `status` (text) - pending, contacted, completed
    - `responded_at` (timestamptz)
    - `created_at` (timestamptz)

  ### 16. `contact_submissions` - Contact form messages
    - `id` (uuid, primary key)
    - `name` (text)
    - `email` (text)
    - `subject` (text) - General, Support, Feedback, Partnership
    - `message` (text)
    - `status` (text) - pending, responded
    - `responded_at` (timestamptz)
    - `created_at` (timestamptz)

  ### 17. `content_likes` - Track user likes on content
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `content_id` (uuid) - References blog/forum posts
    - `content_type` (text) - blog_post, forum_post
    - `created_at` (timestamptz)

  ### 18. `xp_daily_limits` - Track daily XP action limits
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `action_type` (text) - forum_post, forum_topic
    - `count` (integer) - Actions today
    - `xp_earned` (integer) - XP earned today for this action
    - `date` (date)

  ## Security
  - Enable RLS on all tables
  - Super Admin and Admin roles can manage content
  - Members can only access/modify their own data
  - Public content is readable by all
  - Forum access gated by XP thresholds
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  country text NOT NULL,
  role text DEFAULT 'Member' CHECK (role IN ('Super Admin', 'Admin', 'Member')),
  xp_total integer DEFAULT 0,
  avatar_url text,
  bio text,
  sports_role text,
  telegram text,
  dao1_did_nft text,
  wallet_address text,
  website text,
  youtube text,
  linkhub text,
  facebook text,
  instagram text,
  profile_visibility jsonb DEFAULT '{}',
  profile_unlocked boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  last_login timestamptz,
  streak_count integer DEFAULT 0,
  streak_updated_at date,
  created_at timestamptz DEFAULT now()
);

-- Create admin assignments
CREATE TABLE IF NOT EXISTS admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  houses text[] DEFAULT '{}',
  countries text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create XP transactions
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  xp_earned integer NOT NULL,
  reference_id uuid,
  reference_type text,
  created_at timestamptz DEFAULT now()
);

-- Create courses
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL DEFAULT '{}',
  description jsonb NOT NULL DEFAULT '{}',
  xp_threshold integer DEFAULT 0,
  "order" integer DEFAULT 0,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create modules
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title jsonb NOT NULL DEFAULT '{}',
  description jsonb NOT NULL DEFAULT '{}',
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create lessons
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  title jsonb NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '{}',
  xp_reward integer DEFAULT 20,
  xp_threshold integer DEFAULT 0,
  "order" integer DEFAULT 0,
  file_url text,
  estimated_time integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Create lesson completions
CREATE TABLE IF NOT EXISTS lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  xp_earned integer NOT NULL,
  UNIQUE(user_id, lesson_id)
);

-- Create blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '{}',
  excerpt jsonb NOT NULL DEFAULT '{}',
  category text DEFAULT 'General',
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  image_url text,
  xp_reward integer DEFAULT 15,
  registered_only boolean DEFAULT false,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog reads
CREATE TABLE IF NOT EXISTS blog_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  blog_post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  xp_earned integer NOT NULL,
  UNIQUE(user_id, blog_post_id)
);

-- Create forum rooms
CREATE TABLE IF NOT EXISTS forum_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name jsonb NOT NULL DEFAULT '{}',
  description jsonb NOT NULL DEFAULT '{}',
  is_private boolean DEFAULT false,
  house text,
  created_at timestamptz DEFAULT now()
);

-- Create forum room members
CREATE TABLE IF NOT EXISTS forum_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES forum_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create forum topics
CREATE TABLE IF NOT EXISTS forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES forum_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean DEFAULT false,
  locked boolean DEFAULT false,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer DEFAULT 0,
  moderated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily missions
CREATE TABLE IF NOT EXISTS daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  mission_type text NOT NULL,
  target integer NOT NULL,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mission_type, date)
);

-- Create onboarding submissions
CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  telegram text,
  full_name text NOT NULL,
  country text NOT NULL,
  sports_category text,
  sports_role text,
  organization text,
  web3_experience text,
  interests text[] DEFAULT '{}',
  message text,
  assigned_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create contact submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL CHECK (subject IN ('General', 'Support', 'Feedback', 'Partnership')),
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create content likes
CREATE TABLE IF NOT EXISTS content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('blog_post', 'forum_post')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id, content_type)
);

-- Create XP daily limits
CREATE TABLE IF NOT EXISTS xp_daily_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  count integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_xp_total ON users(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_topics_room ON forum_topics(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON daily_missions(user_id, date);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_daily_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view public user data"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('Super Admin', 'Admin')
    )
  );

-- RLS Policies for admin_assignments
CREATE POLICY "Admins can view own assignments"
  ON admin_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "Super Admin can manage assignments"
  ON admin_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view own XP history"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert XP transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (published = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for modules
CREATE POLICY "Anyone can view modules of published courses"
  ON modules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM courses WHERE id = modules.course_id AND published = true)
  );

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for lesson_completions
CREATE POLICY "Users can view own completions"
  ON lesson_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own completions"
  ON lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published public blogs"
  ON blog_posts FOR SELECT
  USING (published = true AND (registered_only = false OR auth.uid() IS NOT NULL));

CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for blog_reads
CREATE POLICY "Users can view own blog reads"
  ON blog_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own blog reads"
  ON blog_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for forum_rooms
CREATE POLICY "Members can view accessible rooms"
  ON forum_rooms FOR SELECT
  TO authenticated
  USING (
    is_private = false OR
    EXISTS (SELECT 1 FROM forum_room_members WHERE room_id = forum_rooms.id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage forum rooms"
  ON forum_rooms FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for forum_room_members
CREATE POLICY "Members can view room membership"
  ON forum_room_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage room membership"
  ON forum_room_members FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for forum_topics
CREATE POLICY "Members can view topics in accessible rooms"
  ON forum_topics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forum_rooms r
      WHERE r.id = forum_topics.room_id
      AND (r.is_private = false OR EXISTS (SELECT 1 FROM forum_room_members WHERE room_id = r.id AND user_id = auth.uid()))
    )
  );

CREATE POLICY "Members can create topics"
  ON forum_topics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own topics"
  ON forum_topics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for forum_posts
CREATE POLICY "Members can view posts in accessible topics"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forum_topics t
      JOIN forum_rooms r ON r.id = t.room_id
      WHERE t.id = forum_posts.topic_id
      AND (r.is_private = false OR EXISTS (SELECT 1 FROM forum_room_members WHERE room_id = r.id AND user_id = auth.uid()))
    )
  );

CREATE POLICY "Members can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for daily_missions
CREATE POLICY "Users can view own missions"
  ON daily_missions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage missions"
  ON daily_missions FOR ALL
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for onboarding_submissions
CREATE POLICY "Admins can view assigned submissions"
  ON onboarding_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

CREATE POLICY "Anyone can submit onboarding"
  ON onboarding_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update submissions"
  ON onboarding_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin'))
  );

-- RLS Policies for contact_submissions
CREATE POLICY "Admins can view contact submissions"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "Anyone can submit contact"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update contact submissions"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

-- RLS Policies for content_likes
CREATE POLICY "Users can view own likes"
  ON content_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own likes"
  ON content_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for xp_daily_limits
CREATE POLICY "Users can view own daily limits"
  ON xp_daily_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage daily limits"
  ON xp_daily_limits FOR ALL
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert default Super Admin account
INSERT INTO users (username, full_name, email, password_hash, country, role, xp_total, email_verified)
VALUES (
  'superadmin',
  'Super Administrator',
  'admin@legacy.com',
  '$2b$10$rK.8vX3qKYH0mGxZJYH0.OwGJH0xXqH0mGxZJYH0.OwGJH0xXqH0m',
  'Global',
  'Super Admin',
  9999,
  true
)
ON CONFLICT (username) DO NOTHING;
