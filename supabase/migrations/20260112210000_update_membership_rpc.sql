-- Keep sync_user_house_membership_db aligned with app logic (expects unique sport/country pairs)
CREATE OR REPLACE FUNCTION public.sync_user_house_membership_db(
  p_user_id uuid,
  p_sport_id uuid DEFAULT NULL,
  p_country_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
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
    AND upper(country_code) = v_country
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
$$;

COMMENT ON FUNCTION public.sync_user_house_membership_db IS
  'Synchronizes one user membership with the matching House. Requires a unique (sport_id,country_code) pair created upstream.';
