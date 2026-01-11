-- Allow onboarding flows (random assignment / sport suggestions) to insert users
-- before a concrete sport/House is available.
ALTER TABLE public.users
  ALTER COLUMN sport_id DROP NOT NULL;

-- keep foreign key constraint intact; no further changes needed because
-- primary_sport_id is already nullable.
