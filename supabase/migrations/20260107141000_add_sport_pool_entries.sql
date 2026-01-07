-- Track how users select sports during signup
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sport_selection_method text NOT NULL DEFAULT 'chosen'
    CHECK (sport_selection_method IN ('chosen', 'random_pool', 'suggested_pool'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS requires_sport_assignment boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sport_assignment_notes text;

-- Pool entries for accounts without a definitive sport/house
CREATE TABLE IF NOT EXISTS public.sport_pool_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pool_type text NOT NULL CHECK (pool_type IN ('no_sport', 'sport_pending', 'suggestion')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'dismissed')),
  sport_id uuid NULL REFERENCES public.sports(id),
  house_id uuid NULL REFERENCES public.houses_of_sports(id),
  country_code text NULL,
  suggested_sport_name text NULL,
  suggested_country_code text NULL,
  notes text NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz NULL,
  assigned_by uuid NULL REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS sport_pool_entries_status_idx
  ON public.sport_pool_entries (status, pool_type);

CREATE INDEX IF NOT EXISTS sport_pool_entries_sport_country_idx
  ON public.sport_pool_entries (sport_id, country_code)
  WHERE sport_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sport_pool_entries_suggested_idx
  ON public.sport_pool_entries (pool_type, suggested_sport_name)
  WHERE pool_type = 'suggestion';

CREATE INDEX IF NOT EXISTS sport_pool_entries_user_idx
  ON public.sport_pool_entries (user_id);
