CREATE TABLE IF NOT EXISTS public.onboarding_global_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  house_key text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_global_ack_user_house_idx
  ON public.onboarding_global_ack (user_id, house_key);

CREATE INDEX IF NOT EXISTS onboarding_global_ack_house_idx
  ON public.onboarding_global_ack (house_key);
