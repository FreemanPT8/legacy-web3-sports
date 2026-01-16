-- Backfill user_houses for already-assigned sport_pool_entries
INSERT INTO public.user_houses (user_id, house_id, membership_role, assigned_via, source)
SELECT
  spe.user_id,
  spe.house_id,
  'MEMBER',
  'pool-auto',
  'AUTO'
FROM public.sport_pool_entries spe
WHERE spe.pool_type = 'sport_pending'
  AND spe.status = 'assigned'
  AND spe.house_id IS NOT NULL
ON CONFLICT (user_id, house_id, membership_role) DO NOTHING;

UPDATE public.users u
SET requires_sport_assignment = false,
    sport_assignment_notes = null
WHERE u.requires_sport_assignment = true
  AND EXISTS (
    SELECT 1
    FROM public.sport_pool_entries spe
    WHERE spe.pool_type = 'sport_pending'
      AND spe.status = 'assigned'
      AND spe.user_id = u.id
  );
