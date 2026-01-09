-- House events for public/private areas
create table if not exists public.house_events (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  title_i18n jsonb not null default '{}'::jsonb,
  description_i18n jsonb not null default '{}'::jsonb,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  visibility text not null default 'members',
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.house_events.visibility is
  'members = private area only, public = pode aparecer na página principal.';

create index if not exists idx_house_events_house on public.house_events(house_id);
create index if not exists idx_house_events_start on public.house_events(start_at desc);
