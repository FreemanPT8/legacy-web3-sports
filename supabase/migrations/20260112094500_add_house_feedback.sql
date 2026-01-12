create table if not exists public.house_feedback (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses_of_sports(id) on delete cascade,
  reporter_user_id uuid references public.users(id) on delete set null,
  resolved_by uuid references public.users(id) on delete set null,
  source text not null default 'manual',
  category text,
  sentiment text not null default 'neutral',
  severity text not null default 'low',
  status text not null default 'open',
  summary text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.house_feedback is
  'Centraliza feedback qualitativo (elogios, incidentes, alertas culturais) por House.';
comment on column public.house_feedback.source is 'Origem do registo (manual, onboarding, alerta, etc).';
comment on column public.house_feedback.sentiment is 'positive / neutral / negative.';
comment on column public.house_feedback.severity is 'low / medium / high / critical.';
comment on column public.house_feedback.status is 'open / reviewing / closed.';

create index if not exists idx_house_feedback_house on public.house_feedback(house_id);
create index if not exists idx_house_feedback_status on public.house_feedback(status);
create index if not exists idx_house_feedback_sentiment on public.house_feedback(sentiment);
