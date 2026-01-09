alter table public.houses_of_sports
  add column if not exists is_exemplar boolean not null default false;

comment on column public.houses_of_sports.is_exemplar is
  'Flag set by governance to destacar Houses com desempenho exemplar.';
