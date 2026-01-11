-- Allow deleting users that were linked to onboarding submissions.
ALTER TABLE public.onboarding_submissions
  DROP CONSTRAINT IF EXISTS onboarding_submissions_user_id_fkey;

ALTER TABLE public.onboarding_submissions
  ADD CONSTRAINT onboarding_submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
