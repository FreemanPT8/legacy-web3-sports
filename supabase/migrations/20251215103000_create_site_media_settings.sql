create table if not exists public.site_media_settings (
  section text not null primary key,
  asset_id uuid null references public.media_files (id) on delete set null,
  vertical_offset integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.update_site_media_settings_timestamp()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_site_media_settings_timestamp
  before insert or update on public.site_media_settings
  for each row
  execute function public.update_site_media_settings_timestamp();
