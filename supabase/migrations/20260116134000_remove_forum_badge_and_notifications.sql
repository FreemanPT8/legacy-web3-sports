-- Remove forum badge and notification type

DELETE FROM user_badges WHERE badge_slug = 'forum-playmaker';
DELETE FROM achievement_badges WHERE slug = 'forum-playmaker';
DELETE FROM notifications WHERE type = 'forum';

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
