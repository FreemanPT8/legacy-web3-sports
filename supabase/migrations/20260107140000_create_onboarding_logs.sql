-- Ensure enum exists for onboarding popup actions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_popup_action') THEN
    CREATE TYPE public.onboarding_popup_action AS ENUM ('delivered', 'primary', 'secondary', 'dismiss');
  END IF;
END
$$;

-- Runtime log of delivered / clicked pop-ups
CREATE TABLE IF NOT EXISTS public.onboarding_popup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id text NOT NULL,
  house_key text NOT NULL,
  action public.onboarding_popup_action NOT NULL,
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_popup_logs
  ADD CONSTRAINT IF NOT EXISTS onboarding_popup_logs_house_fkey
  FOREIGN KEY (house_key) REFERENCES public.houses_of_sports(house_key) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS onboarding_popup_logs_house_time_idx
  ON public.onboarding_popup_logs (house_key, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_popup_logs_popup_time_idx
  ON public.onboarding_popup_logs (popup_id, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_popup_logs_user_time_idx
  ON public.onboarding_popup_logs (user_id, created_at DESC);
