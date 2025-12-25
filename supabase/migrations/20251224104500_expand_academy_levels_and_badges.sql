-- Migration: Expand academy level metadata and introduce badge tracking

-- 1) Add XP metadata and visual fields to academy levels
ALTER TABLE academy_levels
  ADD COLUMN IF NOT EXISTS min_xp integer NOT NULL DEFAULT 0;

ALTER TABLE academy_levels
  ADD COLUMN IF NOT EXISTS max_xp integer;

ALTER TABLE academy_levels
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#00efd5';

ALTER TABLE academy_levels
  ADD COLUMN IF NOT EXISTS badge_icon text;

ALTER TABLE academy_levels
  ADD COLUMN IF NOT EXISTS short_label text;

-- 2) Ensure courses expose language flags and prerequisite tracking
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS available_languages text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS primary_language text DEFAULT 'pt';

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS prerequisite_course_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS academy_path_order integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_courses_academy_path
  ON courses(academy_level_slug, academy_path_order);

-- 3) Badges catalogue and user <> badge relationship
CREATE TABLE IF NOT EXISTS achievement_badges (
  slug text PRIMARY KEY,
  title_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'xp',
  icon text,
  accent_color text DEFAULT '#00efd5',
  unlock_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_bonus integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug text NOT NULL REFERENCES achievement_badges(slug) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, badge_slug)
);

ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are public"
  ON achievement_badges FOR SELECT
  USING (true);

CREATE POLICY "Admins manage badges"
  ON achievement_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Users read their badges"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their badges"
  ON user_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage user badges"
  ON user_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'Admin')
    )
  );

-- 4) Seed XP-based academy levels (Cadete through Lenda)
WITH levels AS (
  SELECT *
  FROM (VALUES
    (
      'cadets',
      1,
      jsonb_build_object('pt', 'Cadete', 'en', 'Cadet', 'es', 'Cadete'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 0),
      jsonb_build_object('type', 'always'),
      0,
      98,
      '#07f2c7',
      'icon-cadet',
      'Cadete'
    ),
    (
      'infantil',
      2,
      jsonb_build_object('pt', 'Infantil', 'en', 'Youth', 'es', 'Infantil'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 99),
      jsonb_build_object('type', 'always'),
      99,
      368,
      '#4dd2ff',
      'icon-infantil',
      'Infantil'
    ),
    (
      'juveniles',
      3,
      jsonb_build_object('pt', 'Juvenil', 'en', 'Juvenile', 'es', 'Juvenil'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 369),
      jsonb_build_object('type', 'always'),
      369,
      999,
      '#6ee7ff',
      'icon-juvenil',
      'Juvenil'
    ),
    (
      'juniors',
      4,
      jsonb_build_object('pt', 'Junior', 'en', 'Junior', 'es', 'Junior'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 1000),
      jsonb_build_object('type', 'always'),
      1000,
      2221,
      '#8b5cf6',
      'icon-junior',
      'Junior'
    ),
    (
      'seniors',
      5,
      jsonb_build_object('pt', 'Senior', 'en', 'Senior', 'es', 'Senior'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 2222),
      jsonb_build_object('type', 'always'),
      2222,
      3332,
      '#f59e0b',
      'icon-senior',
      'Senior'
    ),
    (
      'hall-of-fame',
      6,
      jsonb_build_object('pt', 'Hall da Fama', 'en', 'Hall of Fame', 'es', 'Salon de la Fama'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 3333),
      jsonb_build_object('type', 'always'),
      3333,
      4999,
      '#fbbf24',
      'icon-hall',
      'Hall'
    ),
    (
      'master',
      7,
      jsonb_build_object('pt', 'Master', 'en', 'Master', 'es', 'Master'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 5000),
      jsonb_build_object('type', 'always'),
      5000,
      9999,
      '#ef4444',
      'icon-master',
      'Master'
    ),
    (
      'legend',
      8,
      jsonb_build_object('pt', 'Lenda', 'en', 'Legend', 'es', 'Leyenda'),
      jsonb_build_object('type', 'xp_threshold', 'min_xp', 10000),
      jsonb_build_object('type', 'always'),
      10000,
      NULL,
      '#f472b6',
      'icon-legend',
      'Lenda'
    )
  ) AS t(
    slug,
    order_index,
    title_i18n,
    unlock_condition,
    visibility_condition,
    min_xp,
    max_xp,
    accent_color,
    badge_icon,
    short_label
  )
)
INSERT INTO academy_levels (
  slug,
  order_index,
  title_i18n,
  unlock_condition,
  visibility_condition,
  min_xp,
  max_xp,
  accent_color,
  badge_icon,
  short_label
)
SELECT
  slug,
  order_index,
  title_i18n,
  unlock_condition,
  visibility_condition,
  min_xp,
  max_xp,
  accent_color,
  badge_icon,
  short_label
FROM levels
ON CONFLICT (slug) DO UPDATE
SET
  order_index = EXCLUDED.order_index,
  title_i18n = EXCLUDED.title_i18n,
  unlock_condition = EXCLUDED.unlock_condition,
  visibility_condition = EXCLUDED.visibility_condition,
  min_xp = EXCLUDED.min_xp,
  max_xp = EXCLUDED.max_xp,
  accent_color = EXCLUDED.accent_color,
  badge_icon = EXCLUDED.badge_icon,
  short_label = EXCLUDED.short_label;

-- 5) Ensure "Comeca Aqui" course metadata reflects tri-language requirement
UPDATE courses
SET
  is_start_course = true,
  is_required_in_level = true,
  academy_level_slug = 'cadets',
  available_languages = ARRAY['pt', 'es', 'en']::text[],
  primary_language = 'pt',
  academy_path_order = 0
WHERE slug = 'comeca-aqui';

-- 6) Seed baseline achievement badges
INSERT INTO achievement_badges (
  slug,
  title_i18n,
  description_i18n,
  category,
  icon,
  accent_color,
  unlock_condition,
  xp_bonus,
  badge_tier
) VALUES
  (
    'start-here-complete',
    jsonb_build_object('pt', 'Primeiro Sprint', 'en', 'First Sprint', 'es', 'Primer Sprint'),
    jsonb_build_object('pt', 'Completa o curso COMECA AQUI em qualquer idioma.', 'en', 'Finish the START HERE course in any language.', 'es', 'Completa el curso EMPIEZA AQUI en cualquier idioma.'),
    'education',
    'icon-sprint',
    '#0ea5e9',
    jsonb_build_object('type', 'course_completed', 'course_slug', 'comeca-aqui'),
    25,
    'rare'
  ),
  (
    'forum-playmaker',
    jsonb_build_object('pt', 'Playmaker', 'en', 'Playmaker', 'es', 'Playmaker'),
    jsonb_build_object('pt', 'Partilha a tua primeira participacao no forum.', 'en', 'Post your first contribution in the forum.', 'es', 'Comparte tu primer aporte en el foro.'),
    'community',
    'icon-forum',
    '#d946ef',
    jsonb_build_object('type', 'forum_post_count', 'min', 1),
    15,
    'uncommon'
  ),
  (
    'streak-7',
    jsonb_build_object('pt', 'Foco 7x7', 'en', 'Seven Day Focus', 'es', 'Enfoque 7x7'),
    jsonb_build_object('pt', 'Mantem uma sequencia de 7 dias a ganhar XP.', 'en', 'Maintain a seven-day XP streak.', 'es', 'Manten una racha de XP de siete dias.'),
    'streak',
    'icon-streak',
    '#f97316',
    jsonb_build_object('type', 'streak_days', 'days', 7),
    50,
    'rare'
  )
ON CONFLICT (slug) DO UPDATE
SET
  title_i18n = EXCLUDED.title_i18n,
  description_i18n = EXCLUDED.description_i18n,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  accent_color = EXCLUDED.accent_color,
  unlock_condition = EXCLUDED.unlock_condition,
  xp_bonus = EXCLUDED.xp_bonus;
