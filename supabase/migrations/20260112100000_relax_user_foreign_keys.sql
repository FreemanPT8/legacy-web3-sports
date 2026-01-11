-- Allow deleting user accounts even when referenced by governance tables.
-- Most relationships only need to keep historical context, so we set them to
-- NULL when the originating user is removed.

-- house_history.created_by -> SET NULL
ALTER TABLE public.house_history
  DROP CONSTRAINT IF EXISTS house_history_created_by_fkey;
ALTER TABLE public.house_history
  ADD CONSTRAINT house_history_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- house_alerts.resolved_by -> SET NULL
ALTER TABLE public.house_alerts
  DROP CONSTRAINT IF EXISTS house_alerts_resolved_by_fkey;
ALTER TABLE public.house_alerts
  ADD CONSTRAINT house_alerts_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- house_join_requests.resolved_by -> SET NULL
ALTER TABLE public.house_join_requests
  DROP CONSTRAINT IF EXISTS house_join_requests_resolved_by_fkey;
ALTER TABLE public.house_join_requests
  ADD CONSTRAINT house_join_requests_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- house_feedback.reported_by -> SET NULL
ALTER TABLE public.house_feedback
  DROP CONSTRAINT IF EXISTS house_feedback_reported_by_fkey;
ALTER TABLE public.house_feedback
  ADD CONSTRAINT house_feedback_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- sport_pool_entries.assigned_by -> SET NULL
ALTER TABLE public.sport_pool_entries
  DROP CONSTRAINT IF EXISTS sport_pool_entries_assigned_by_fkey;
ALTER TABLE public.sport_pool_entries
  ADD CONSTRAINT sport_pool_entries_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- house_head_invites.* user references -> SET NULL
ALTER TABLE public.house_head_invites
  DROP CONSTRAINT IF EXISTS house_head_invites_created_by_fkey;
ALTER TABLE public.house_head_invites
  ADD CONSTRAINT house_head_invites_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.house_head_invites
  DROP CONSTRAINT IF EXISTS house_head_invites_accepted_by_fkey;
ALTER TABLE public.house_head_invites
  ADD CONSTRAINT house_head_invites_accepted_by_fkey
    FOREIGN KEY (accepted_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.house_head_invites
  DROP CONSTRAINT IF EXISTS house_head_invites_target_user_id_fkey;
ALTER TABLE public.house_head_invites
  ADD CONSTRAINT house_head_invites_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
