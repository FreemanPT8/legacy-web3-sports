DROP POLICY IF EXISTS onboarding_global_ack_select_own ON public.onboarding_global_ack;
DROP POLICY IF EXISTS onboarding_global_ack_insert_own ON public.onboarding_global_ack;
DROP POLICY IF EXISTS onboarding_global_ack_update_own ON public.onboarding_global_ack;

ALTER TABLE public.onboarding_global_ack DISABLE ROW LEVEL SECURITY;
