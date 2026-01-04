/*
  # Daily combo progress + mission metadata

  - Adds table `daily_combo_progress` to keep CET-based counters for glossary/blog/lesson usage and combo completion flags.
  - Adds `metadata` column to `daily_missions` so we can persist combo requirements and XP.
*/

-- Add metadata column to daily_missions to describe combos/rewards
ALTER TABLE daily_missions
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create daily_combo_progress table for accumulating consumption per day (CET)
CREATE TABLE IF NOT EXISTS daily_combo_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  combo_date date NOT NULL,
  glossary_count integer NOT NULL DEFAULT 0,
  blog_count integer NOT NULL DEFAULT 0,
  lesson_count integer NOT NULL DEFAULT 0,
  quick_completed boolean NOT NULL DEFAULT false,
  base_completed boolean NOT NULL DEFAULT false,
  serious_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, combo_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_combo_progress_user_date
  ON daily_combo_progress(user_id, combo_date);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_daily_combo_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_combo_progress_updated
  ON daily_combo_progress;

CREATE TRIGGER trg_daily_combo_progress_updated
  BEFORE UPDATE ON daily_combo_progress
  FOR EACH ROW EXECUTE FUNCTION update_daily_combo_progress_updated_at();

-- Enable RLS
ALTER TABLE daily_combo_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their combo progress"
  ON daily_combo_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their combo progress"
  ON daily_combo_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can modify their combo progress"
  ON daily_combo_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
