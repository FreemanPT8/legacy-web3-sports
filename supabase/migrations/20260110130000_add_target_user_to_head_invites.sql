alter table public.house_head_invites
  add column if not exists target_user_id uuid references public.users(id);

create index if not exists idx_house_head_invites_target_user
  on public.house_head_invites(target_user_id);

-- Backfill helper: when email matches an existing admin user we can link it
update public.house_head_invites hhi
set target_user_id = u.id
from public.users u
where hhi.target_user_id is null
  and hhi.email is not null
  and lower(u.email) = lower(hhi.email);
