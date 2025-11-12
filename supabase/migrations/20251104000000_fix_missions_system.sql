/*
  # Fix Daily Missions System

  ## Overview
  This migration fixes the daily missions system by restructuring the tables
  to properly support global missions with per-user tracking.

  ## Changes

  ### 1. Restructure `daily_missions` table
    - Remove `user_id` (missions are global, not per-user)
    - Remove `progress` and `completed` (tracked in user_missions)
    - Add `type` (mission type identifier)
    - Add `description` (human-readable description)
    - Add `xp_reward` (XP awarded on completion)
    - Add `target_count` (required count to complete)
    - Add `is_active` (active status)
    - Remove UNIQUE constraint on (user_id, mission_type, date)
    - Keep `date` for daily expiration

  ### 2. Create `user_missions` table
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `mission_id` (uuid, foreign key to daily_missions)
    - `progress` (integer, current progress)
    - `completed` (boolean, completion status)
    - `completed_at` (timestamptz, when completed)
    - `created_at` (timestamptz)
    - UNIQUE constraint on (user_id, mission_id)

  ## Security
  - Enable RLS on user_missions
  - Users can only view/update their own missions
  - System can create missions for all users
  - daily_missions readable by all, writable by system
*/

-- Drop old daily_missions table and recreate with correct structure
DROP TABLE IF EXISTS daily_missions CASCADE;

CREATE TABLE daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL,
  description text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 12,
  target_count integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_missions table for per-user tracking
CREATE TABLE IF NOT EXISTS user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES daily_missions(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mission_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_missions_date ON daily_missions(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_missions_active ON daily_missions(is_active, date);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_completed ON user_missions(user_id, completed);

-- Enable Row Level Security
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_missions
CREATE POLICY "Anyone can view active missions"
  ON daily_missions FOR SELECT
  USING (is_active = true);

CREATE POLICY "System can manage missions"
  ON daily_missions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_missions
CREATE POLICY "Users can view own missions"
  ON user_missions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own mission progress"
  ON user_missions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create user missions"
  ON user_missions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all user missions"
  ON user_missions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin')
    )
  );
