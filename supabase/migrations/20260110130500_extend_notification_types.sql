alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'achievement',
      'forum',
      'course',
      'xp',
      'system',
      'mission',
      'head_invite',
      'head_promo'
    )
  );
