ALTER TABLE public.onboarding_global_ack ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_global_ack_select_own
  ON public.onboarding_global_ack
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY onboarding_global_ack_insert_own
  ON public.onboarding_global_ack
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY onboarding_global_ack_update_own
  ON public.onboarding_global_ack
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
