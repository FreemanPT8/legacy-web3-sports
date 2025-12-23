-- Migration: Add academy level grouping tables and state tracking

-- A) Academy levels catalogue
CREATE TABLE IF NOT EXISTS academy_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  order_index integer NOT NULL,
  title_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlock_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- B) Extend courses with level association metadata
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS academy_level_slug text;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_start_course boolean NOT NULL DEFAULT false;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_required_in_level boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_courses_academy_level_slug
  ON courses(academy_level_slug);

CREATE INDEX IF NOT EXISTS idx_courses_is_start_course
  ON courses(is_start_course);

-- C) User <> academy level state tracking
CREATE TABLE IF NOT EXISTS user_academy_level_state (
  user_id uuid NOT NULL,
  academy_level_slug text NOT NULL,
  is_visible boolean NOT NULL DEFAULT false,
  is_unlocked boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  progress_percent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, academy_level_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_academy_level_state_user
  ON user_academy_level_state(user_id);

CREATE INDEX IF NOT EXISTS idx_user_academy_level_state_level
  ON user_academy_level_state(academy_level_slug);

-- D) Seed default academy levels
INSERT INTO academy_levels (
  slug,
  order_index,
  title_i18n,
  unlock_condition,
  visibility_condition
)
VALUES
  (
    'cadets',
    1,
    jsonb_build_object('pt', 'Cadetes', 'en', 'Cadets', 'es', 'Cadetes'),
    jsonb_build_object('type', 'course_completed', 'course_slug', 'comeca-aqui'),
    jsonb_build_object('type', 'always')
  ),
  (
    'juveniles',
    2,
    jsonb_build_object('pt', 'Juvenis', 'en', 'Juveniles', 'es', 'Juveniles'),
    jsonb_build_object('type', 'academy_level_completed', 'level_slug', 'cadets'),
    jsonb_build_object('type', 'always')
  ),
  (
    'juniors',
    3,
    jsonb_build_object('pt', 'Juniores', 'en', 'Juniors', 'es', 'Juniores'),
    jsonb_build_object('type', 'academy_level_unlocked', 'level_slug', 'juveniles'),
    jsonb_build_object('type', 'academy_level_unlocked', 'level_slug', 'juveniles')
  ),
  (
    'seniors',
    4,
    jsonb_build_object('pt', 'Séniors', 'en', 'Seniors', 'es', 'Séniors'),
    jsonb_build_object('type', 'academy_level_unlocked', 'level_slug', 'juveniles'),
    jsonb_build_object('type', 'academy_level_unlocked', 'level_slug', 'juveniles')
  )
ON CONFLICT (slug) DO UPDATE
SET
  order_index = EXCLUDED.order_index,
  title_i18n = EXCLUDED.title_i18n,
  unlock_condition = EXCLUDED.unlock_condition,
  visibility_condition = EXCLUDED.visibility_condition;
