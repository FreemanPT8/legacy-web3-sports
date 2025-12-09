-- Add long streak tracking columns so we can support the 30-day bonus.
alter table public.users
  add column if not exists streak_long_count integer not null default 0,
  add column if not exists streak_long_updated_at date;
