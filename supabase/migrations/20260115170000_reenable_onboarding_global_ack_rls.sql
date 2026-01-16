ALTER TABLE public.onboarding_global_ack ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding_global_ack'
      AND policyname = 'onboarding_global_ack_select_own'
  ) THEN
    CREATE POLICY onboarding_global_ack_select_own
      ON public.onboarding_global_ack
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding_global_ack'
      AND policyname = 'onboarding_global_ack_insert_own'
  ) THEN
    CREATE POLICY onboarding_global_ack_insert_own
      ON public.onboarding_global_ack
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding_global_ack'
      AND policyname = 'onboarding_global_ack_update_own'
  ) THEN
    CREATE POLICY onboarding_global_ack_update_own
      ON public.onboarding_global_ack
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
