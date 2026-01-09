create table if not exists public.house_head_invites (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  email text,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  accepted_at timestamptz,
  accepted_by uuid references public.users(id),
  cancelled_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_house_head_invites_house on public.house_head_invites(house_id);
create index if not exists idx_house_head_invites_token on public.house_head_invites(token);
