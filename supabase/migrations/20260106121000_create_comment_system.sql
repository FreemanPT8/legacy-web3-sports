/*
  # Comment system tables

  ## Overview
  - Introduces `content_comments` to store lesson, blog post, and house comments.
  - Adds `comment_reactions` with limited emoji reactions (positive, fire, negative).
  - Tracks per-user daily limits through `comment_daily_usage`.
  - Creates `comment_weekly_awards` to register weekly highlights (88 XP badge).
  - Adds helper triggers to keep aggregated reaction counters in sync.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('lesson', 'blog_post', 'house')),
  content_id uuid NOT NULL,
  house_id uuid REFERENCES houses_of_sports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 3 AND 4000),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'house')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  positive_count integer NOT NULL DEFAULT 0,
  fire_count integer NOT NULL DEFAULT 0,
  negative_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_comments_content
  ON content_comments (content_type, content_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_comments_house
  ON content_comments (house_id)
  WHERE house_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_comments_author
  ON content_comments (author_id);

CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES content_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji_type text NOT NULL CHECK (emoji_type IN ('positive', 'fire', 'negative')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reactions_unique
  ON comment_reactions (comment_id, user_id, emoji_type);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_day
  ON comment_reactions (user_id, created_at);

CREATE TABLE IF NOT EXISTS comment_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('comment', 'emoji_positive', 'emoji_fire', 'emoji_negative')),
  usage_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  used_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_daily_usage_user_action_date
  ON comment_daily_usage (user_id, action_type, usage_date);

CREATE TABLE IF NOT EXISTS comment_weekly_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES content_comments(id) ON DELETE CASCADE,
  winner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  reaction_points integer NOT NULL DEFAULT 0,
  awarded_xp integer NOT NULL DEFAULT 0,
  badge_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_weekly_awards_week
  ON comment_weekly_awards (week_start, week_end);

CREATE OR REPLACE FUNCTION update_comment_reaction_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE content_comments
      SET
        positive_count = positive_count + CASE WHEN NEW.emoji_type = 'positive' THEN 1 ELSE 0 END,
        fire_count = fire_count + CASE WHEN NEW.emoji_type = 'fire' THEN 1 ELSE 0 END,
        negative_count = negative_count + CASE WHEN NEW.emoji_type = 'negative' THEN 1 ELSE 0 END,
        updated_at = timezone('utc', now())
      WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content_comments
      SET
        positive_count = GREATEST(positive_count - CASE WHEN OLD.emoji_type = 'positive' THEN 1 ELSE 0 END, 0),
        fire_count = GREATEST(fire_count - CASE WHEN OLD.emoji_type = 'fire' THEN 1 ELSE 0 END, 0),
        negative_count = GREATEST(negative_count - CASE WHEN OLD.emoji_type = 'negative' THEN 1 ELSE 0 END, 0),
        updated_at = timezone('utc', now())
      WHERE id = OLD.comment_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.emoji_type = OLD.emoji_type THEN
      RETURN NEW;
    END IF;

    UPDATE content_comments
      SET
        positive_count = positive_count
          + CASE WHEN NEW.emoji_type = 'positive' THEN 1 ELSE 0 END
          - CASE WHEN OLD.emoji_type = 'positive' THEN 1 ELSE 0 END,
        fire_count = fire_count
          + CASE WHEN NEW.emoji_type = 'fire' THEN 1 ELSE 0 END
          - CASE WHEN OLD.emoji_type = 'fire' THEN 1 ELSE 0 END,
        negative_count = negative_count
          + CASE WHEN NEW.emoji_type = 'negative' THEN 1 ELSE 0 END
          - CASE WHEN OLD.emoji_type = 'negative' THEN 1 ELSE 0 END,
        updated_at = timezone('utc', now())
      WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_comment_reactions_counter_insert ON comment_reactions;
DROP TRIGGER IF EXISTS trg_comment_reactions_counter_delete ON comment_reactions;
DROP TRIGGER IF EXISTS trg_comment_reactions_counter_update ON comment_reactions;

CREATE TRIGGER trg_comment_reactions_counter_insert
AFTER INSERT ON comment_reactions
FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_counts();

CREATE TRIGGER trg_comment_reactions_counter_delete
AFTER DELETE ON comment_reactions
FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_counts();

CREATE TRIGGER trg_comment_reactions_counter_update
AFTER UPDATE ON comment_reactions
FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_counts();

ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_weekly_awards ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN ('achievement', 'forum', 'course', 'xp', 'system', 'mission', 'comment'));

DELETE FROM achievement_badges WHERE slug = 'forum-playmaker';

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
) VALUES (
  'comment-weekly-top',
  jsonb_build_object('pt', '🔥 Comentário da Semana', 'en', '🔥 Comment of the Week', 'es', '🔥 Comentario de la Semana'),
  jsonb_build_object(
    'pt', 'Ganha o destaque semanal ao liderar as interações públicas em lições e blog posts.',
    'en', 'Lead the public comment board for the week inside lessons or blog posts.',
    'es', 'Lidera los comentarios públicos de la semana dentro de lecciones o posts.'
  ),
  'community',
  'icon-comment-weekly',
  '#f97316',
  jsonb_build_object('type', 'comment_weekly_top'),
  0,
  'legendary'
) ON CONFLICT (slug) DO NOTHING;

CREATE POLICY "Comments readable by authenticated members"
  ON content_comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      visibility = 'public'
      OR author_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
      )
      OR (
        visibility = 'house'
        AND house_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM user_houses uh
          WHERE uh.house_id = content_comments.house_id
            AND uh.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members with XP can create comments"
  ON content_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = author_id AND u.xp_total >= 369
    )
    AND (
      visibility = 'public'
      OR (
        visibility = 'house'
        AND house_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM user_houses uh
          WHERE uh.house_id = content_comments.house_id
            AND uh.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authors and admins can update comments"
  ON content_comments
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
    )
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Authors and admins can delete comments"
  ON content_comments
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
    )
  );

CREATE POLICY "Reactions readable by authenticated members"
  ON comment_reactions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM content_comments c
      WHERE c.id = comment_id
        AND (
          c.visibility = 'public'
          OR c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
          )
          OR (
            c.visibility = 'house'
            AND c.house_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM user_houses uh
              WHERE uh.house_id = c.house_id
                AND uh.user_id = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "Members with XP can react"
  ON comment_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = user_id AND u.xp_total >= 369
    )
    AND EXISTS (
      SELECT 1
      FROM content_comments c
      WHERE c.id = comment_id
        AND (
          c.visibility = 'public'
          OR c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
          )
          OR (
            c.visibility = 'house'
            AND c.house_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM user_houses uh
              WHERE uh.house_id = c.house_id
                AND uh.user_id = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "Owners can manage their reactions"
  ON comment_reactions
  FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin')
  ));

CREATE POLICY "Own reaction updates"
  ON comment_reactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usage readable by owner"
  ON comment_daily_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usage upsert by owner"
  ON comment_daily_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usage update by owner"
  ON comment_daily_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Weekly awards readable by authenticated"
  ON comment_weekly_awards
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMIT;
