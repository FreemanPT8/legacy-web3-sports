-- Onboarding runtime storage for Houses of Sports

-- Ensure every House has a stable key aligned with the sport code
ALTER TABLE public.houses_of_sports
  ADD COLUMN IF NOT EXISTS house_key text;

UPDATE public.houses_of_sports hos
SET house_key = UPPER(
    COALESCE(
      house_key,
      (
        SELECT code
        FROM public.sports s
        WHERE s.id = hos.sport_id
        LIMIT 1
      )
    )
  )
WHERE house_key IS NULL;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN house_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS houses_of_sports_house_key_key
  ON public.houses_of_sports (house_key);

INSERT INTO public.houses_of_sports (sport_id, country_code, name_i18n, status, created_at, updated_at, house_key, is_public)
SELECT
  s.id,
  'GLOBAL',
  COALESCE(
    s.name_i18n,
    jsonb_build_object('en', CONCAT('House of ', COALESCE(s.code, 'Sport')))
  ),
  'in_development',
  now(),
  now(),
  UPPER(COALESCE(s.code, gen_random_uuid()::text)),
  true
FROM public.sports s
WHERE NOT EXISTS (
  SELECT 1 FROM public.houses_of_sports hos WHERE hos.sport_id = s.id
);

-- ------------------------------------------------------------------
-- Popups curated by Heads of House
CREATE TABLE IF NOT EXISTS public.onboarding_popups (
  id text PRIMARY KEY,
  house_key text NOT NULL,
  language text NULL,
  title text NOT NULL,
  body text NOT NULL,
  highlights text[] NOT NULL DEFAULT '{}',
  badge_label text NULL,
  primary_cta jsonb NULL,
  secondary_cta jsonb NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','published')),
  priority integer NOT NULL DEFAULT 0,
  copy_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_popups
  ADD CONSTRAINT IF NOT EXISTS onboarding_popups_house_fkey
  FOREIGN KEY (house_key) REFERENCES public.houses_of_sports(house_key) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS onboarding_popups_house_status_idx
  ON public.onboarding_popups (house_key, status);

CREATE INDEX IF NOT EXISTS onboarding_popups_priority_idx
  ON public.onboarding_popups (house_key, priority, updated_at DESC);

-- ------------------------------------------------------------------
-- Trigger metadata (XP / content completions)
CREATE TABLE IF NOT EXISTS public.onboarding_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id text NOT NULL REFERENCES public.onboarding_popups(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('xp','content')),
  xp_min integer NULL,
  content_type text NULL,
  content_id text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_triggers_popup_idx
  ON public.onboarding_triggers (popup_id);

-- ------------------------------------------------------------------
-- Per-user queue persisted by the onboarding engine
CREATE TABLE IF NOT EXISTS public.onboarding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  house_key text NULL,
  queue_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  queue_signature text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_queue
  ADD CONSTRAINT IF NOT EXISTS onboarding_queue_house_fkey
  FOREIGN KEY (house_key) REFERENCES public.houses_of_sports(house_key) ON DELETE CASCADE;

-- Allow a single record per (user, NULL house)
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_queue_user_default_idx
  ON public.onboarding_queue (user_id)
  WHERE house_key IS NULL;

-- Allow unique per explicit House
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_queue_user_house_idx
  ON public.onboarding_queue (user_id, house_key)
  WHERE house_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS onboarding_queue_updated_idx
  ON public.onboarding_queue (updated_at DESC);
