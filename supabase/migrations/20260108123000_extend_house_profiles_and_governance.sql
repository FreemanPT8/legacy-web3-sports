-- Extend house profiles with structured sections
alter table public.house_profiles
  add column if not exists mission_i18n jsonb not null default '{}'::jsonb,
  add column if not exists limits_i18n jsonb not null default '{}'::jsonb,
  add column if not exists audience_fit jsonb not null default '{}'::jsonb,
  add column if not exists support_model_i18n jsonb not null default '{}'::jsonb,
  add column if not exists cta_i18n jsonb not null default '{}'::jsonb,
  add column if not exists head_manifesto_i18n jsonb not null default '{}'::jsonb,
  add column if not exists culture_i18n jsonb not null default '{}'::jsonb;

comment on column public.house_profiles.mission_i18n is
  'House mission and scope, localized.';
comment on column public.house_profiles.limits_i18n is
  'Statements describing what the House does not cover.';
comment on column public.house_profiles.audience_fit is
  'JSON object with keys "for" and "not_for" (arrays of strings).';
comment on column public.house_profiles.support_model_i18n is
  'Description of how the guidance works (async/sync/expectations).';
comment on column public.house_profiles.cta_i18n is
  'CTA labels, helper text, checkbox copy.';
comment on column public.house_profiles.head_manifesto_i18n is
  'Short manifesto from the Head of House.';
comment on column public.house_profiles.culture_i18n is
  'Principles and values highlighted in the private area.';

-- Extend houses_of_sports with governance data
alter table public.houses_of_sports
  add column if not exists monthly_capacity integer,
  add column if not exists support_mode text check (
    support_mode is null or support_mode in ('async', 'sync', 'hybrid')
  ),
  add column if not exists governance_status text not null default 'active';

comment on column public.houses_of_sports.monthly_capacity is
  'Maximum number of guided users per month (null = unlimited).';
comment on column public.houses_of_sports.support_mode is
  'Operational mode: async / sync / hybrid.';
comment on column public.houses_of_sports.governance_status is
  'Operational flag to pause/limit/review Houses independently of marketing status.';

-- Terms accepted by Heads of House
create table if not exists public.house_head_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_house_head_terms_house on public.house_head_terms(house_id);
create index if not exists idx_house_head_terms_user on public.house_head_terms(user_id);

-- House history / audit log
create table if not exists public.house_history (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id)
);

create index if not exists idx_house_history_house on public.house_history(house_id);

-- Internal notes
create table if not exists public.house_notes (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_house_notes_house on public.house_notes(house_id);

-- Alerting system
create table if not exists public.house_alerts (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  type text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

create index if not exists idx_house_alerts_house on public.house_alerts(house_id);
create index if not exists idx_house_alerts_status on public.house_alerts(status);

-- Join requests generated from the public CTA
create table if not exists public.house_join_requests (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

create index if not exists idx_house_join_requests_house on public.house_join_requests(house_id);
create index if not exists idx_house_join_requests_status on public.house_join_requests(status);
