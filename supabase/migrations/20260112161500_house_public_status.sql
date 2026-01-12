-- Ensure houses_of_sports.status uses an enum with the public lifecycle states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'house_public_status') THEN
    CREATE TYPE public.house_public_status AS ENUM ('development', 'under_construction', 'active');
  END IF;
END $$;

-- Normalise existing values before altering the column
UPDATE public.houses_of_sports
SET status = CASE lower(coalesce(status, 'development'))
  WHEN 'active' THEN 'active'
  WHEN 'under construction' THEN 'under_construction'
  WHEN 'under_construction' THEN 'under_construction'
  WHEN 'building' THEN 'under_construction'
  WHEN 'preview' THEN 'development'
  ELSE 'development'
END;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN status TYPE public.house_public_status
USING (
  CASE lower(coalesce(status, 'development'))
    WHEN 'active' THEN 'active'::public.house_public_status
    WHEN 'under construction' THEN 'under_construction'::public.house_public_status
    WHEN 'under_construction' THEN 'under_construction'::public.house_public_status
    ELSE 'development'::public.house_public_status
  END
);

ALTER TABLE public.houses_of_sports
  ALTER COLUMN status SET DEFAULT 'development';
