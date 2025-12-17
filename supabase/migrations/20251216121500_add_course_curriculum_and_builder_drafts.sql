-- Ensure tables and columns required by the course builder exist in production.

-- 1) Builder drafts storage (autosave for course/blog builders)
CREATE TABLE IF NOT EXISTS builder_drafts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

COMMENT ON TABLE builder_drafts IS 'Autosave payloads for the legacy builder (courses, blog posts, etc).';

-- 2) Extend courses with metadata columns used by the admin builder.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'beginner';

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS overview text;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS target_audience jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS special_requirements jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS seo jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS google_integrations jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS curriculum jsonb NOT NULL DEFAULT jsonb_build_object('topics', jsonb_build_array());

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS expire_at timestamptz;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES users(id) ON DELETE SET NULL;
