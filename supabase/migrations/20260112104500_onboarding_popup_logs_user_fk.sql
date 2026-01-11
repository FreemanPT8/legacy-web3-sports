-- Allow deleting users even if they have onboarding popup logs.
ALTER TABLE public.onboarding_popup_logs
  DROP CONSTRAINT IF EXISTS onboarding_popup_logs_user_id_fkey;

ALTER TABLE public.onboarding_popup_logs
  ADD CONSTRAINT onboarding_popup_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
