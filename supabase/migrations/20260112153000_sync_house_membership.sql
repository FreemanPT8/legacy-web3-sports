-- Ensure governance status enum and defaults
DO 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'house_governance_status') THEN
    CREATE TYPE public.house_governance_status AS ENUM ('active','under_construction','development');
  END IF;
END ;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN governance_status DROP DEFAULT;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN governance_status TYPE public.house_governance_status
  USING (
    CASE lower(coalesce(governance_status, 'active'))
      WHEN 'under construction' THEN 'under_construction'::public.house_governance_status
      WHEN 'development' THEN 'development'::public.house_governance_status
      ELSE 'active'::public.house_governance_status
    END
  );

ALTER TABLE public.houses_of_sports
  ALTER COLUMN governance_status SET DEFAULT 'active';

UPDATE public.houses_of_sports
SET governance_status = 'active'
WHERE governance_status IS NULL;

ALTER TABLE public.houses_of_sports
  ALTER COLUMN monthly_capacity SET DEFAULT 150;

UPDATE public.houses_of_sports
SET monthly_capacity = 150
WHERE monthly_capacity IS NULL;

-- Stored helper to sync one user membership directly inside Postgres
CREATE OR REPLACE FUNCTION public.sync_user_house_membership_db(
  p_user_id uuid,
  p_sport_id uuid DEFAULT NULL,
  p_country_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS 
DECLARE
  v_user RECORD;
  v_country text;
  v_sport uuid;
  v_house uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id_required');
  END IF;

  SELECT id,
         primary_country_code,
         primary_sport_id,
         country,
         sport_id
    INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  v_country := upper(coalesce(p_country_code, v_user.primary_country_code, v_user.country));
  v_sport := coalesce(p_sport_id, v_user.primary_sport_id, v_user.sport_id);

  DELETE FROM public.user_houses
  WHERE user_id = p_user_id
    AND membership_role = 'MEMBER'
    AND (v_country IS NULL OR v_sport IS NULL);

  IF v_country IS NULL OR v_sport IS NULL THEN
    RETURN jsonb_build_object('success', true, 'house_id', NULL, 'reason', 'missing_context');
  END IF;

  SELECT id INTO v_house
  FROM public.houses_of_sports
  WHERE sport_id = v_sport
    AND country_code = v_country
  LIMIT 1;

  DELETE FROM public.user_houses
  WHERE user_id = p_user_id
    AND membership_role = 'MEMBER'
    AND (v_house IS NULL OR house_id <> v_house);

  IF v_house IS NULL THEN
    RETURN jsonb_build_object('success', true, 'house_id', NULL, 'reason', 'no_house_found');
  END IF;

  INSERT INTO public.user_houses (user_id, house_id, membership_role, assigned_via)
  VALUES (p_user_id, v_house, 'MEMBER', 'ADMIN_SYNC')
  ON CONFLICT (user_id, house_id, membership_role)
  DO UPDATE SET assigned_via = EXCLUDED.assigned_via;

  RETURN jsonb_build_object('success', true, 'house_id', v_house);
END;
;

COMMENT ON FUNCTION public.sync_user_house_membership_db IS 'Synchronizes one user membership with the matching House (used for bulk syncs).';

-- View with XP totals that includes Heads + synced members
CREATE OR REPLACE VIEW public.house_xp_totals AS
WITH member_stats AS (
  SELECT
    uh.house_id,
    COUNT(DISTINCT uh.user_id) AS member_count,
    COALESCE(SUM(u.xp_total), 0) AS member_xp
  FROM public.user_houses uh
  JOIN public.users u ON u.id = uh.user_id
  WHERE uh.membership_role = 'MEMBER'
    AND uh.removed_at IS NULL
  GROUP BY uh.house_id
),
head_stats AS (
  SELECT
    hh.house_id,
    COUNT(DISTINCT u.id) AS head_count,
    COALESCE(SUM(u.xp_total), 0) AS head_xp
  FROM public.house_heads hh
  JOIN public.admin_assignments aa ON aa.id = hh.admin_id
  JOIN public.users u ON u.id = aa.user_id
  GROUP BY hh.house_id
)
SELECT
  hos.id AS house_id,
  COALESCE(ms.member_count, 0) + COALESCE(hs.head_count, 0) AS member_count,
  COALESCE(ms.member_xp, 0) + COALESCE(hs.head_xp, 0) AS total_xp
FROM public.houses_of_sports hos
LEFT JOIN member_stats ms ON ms.house_id = hos.id
LEFT JOIN head_stats hs ON hs.house_id = hos.id;
