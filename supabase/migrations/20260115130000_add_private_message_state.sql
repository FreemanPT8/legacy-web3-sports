alter table public.house_private_messages
  add column if not exists sender_archived_at timestamp with time zone null,
  add column if not exists recipient_archived_at timestamp with time zone null,
  add column if not exists sender_deleted_at timestamp with time zone null,
  add column if not exists recipient_deleted_at timestamp with time zone null;
