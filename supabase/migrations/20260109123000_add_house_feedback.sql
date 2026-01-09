-- Feedback qualitativo por house
create table if not exists public.house_feedback (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  source text not null,
  category text,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  summary text not null,
  details text,
  reported_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.house_feedback is 'Feedback de utilizadores, moderadores ou heads para cada House.';
comment on column public.house_feedback.source is 'Origem do feedback (member, head, admin, monitor).';

create index if not exists idx_house_feedback_house on public.house_feedback(house_id);
create index if not exists idx_house_feedback_status on public.house_feedback(status);
