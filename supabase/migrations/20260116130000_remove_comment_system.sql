-- Remove comment system tables and notification type

DROP TRIGGER IF EXISTS trg_comment_reactions_counter_insert ON comment_reactions;
DROP TRIGGER IF EXISTS trg_comment_reactions_counter_delete ON comment_reactions;
DROP TRIGGER IF EXISTS trg_comment_reactions_counter_update ON comment_reactions;

DROP FUNCTION IF EXISTS update_comment_reaction_counts();

DROP TABLE IF EXISTS comment_weekly_awards;
DROP TABLE IF EXISTS comment_reactions;
DROP TABLE IF EXISTS comment_daily_usage;
DROP TABLE IF EXISTS content_comments;

DELETE FROM user_badges WHERE badge_slug = 'comment-weekly-top';
DELETE FROM achievement_badges WHERE slug = 'comment-weekly-top';
DELETE FROM notifications WHERE type = 'comment';

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'achievement',
      'course',
      'xp',
      'system',
      'mission',
      'head_invite',
      'head_promo'
    )
  );
