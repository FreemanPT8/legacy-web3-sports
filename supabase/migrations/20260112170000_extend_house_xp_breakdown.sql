-- Atualiza a view house_xp_totals para expor XP separado por Head, moderadores e membros.
CREATE OR REPLACE VIEW public.house_xp_totals AS
WITH member_stats AS (
  SELECT
    uh.house_id,
    COUNT(DISTINCT uh.user_id) AS member_count,
    COALESCE(SUM(u.xp_total), 0)::bigint AS member_xp
  FROM public.user_houses uh
  JOIN public.users u ON u.id = uh.user_id
  WHERE uh.membership_role = 'MEMBER'
    AND uh.removed_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.house_moderators hm
      WHERE hm.house_id = uh.house_id
        AND hm.user_id = uh.user_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.house_heads hh
      JOIN public.admin_assignments aa ON aa.id = hh.admin_id
      WHERE hh.house_id = uh.house_id
        AND aa.user_id = uh.user_id
    )
  GROUP BY uh.house_id
),
head_stats AS (
  SELECT
    hh.house_id,
    COUNT(DISTINCT u.id) AS head_count,
    COALESCE(SUM(u.xp_total), 0)::bigint AS head_xp
  FROM public.house_heads hh
  JOIN public.admin_assignments aa ON aa.id = hh.admin_id
  JOIN public.users u ON u.id = aa.user_id
  GROUP BY hh.house_id
),
moderator_stats AS (
  SELECT
    hm.house_id,
    COUNT(DISTINCT hm.user_id) AS moderator_count,
    COALESCE(SUM(u.xp_total), 0)::bigint AS moderator_xp
  FROM public.house_moderators hm
  JOIN public.users u ON u.id = hm.user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.house_heads hh
    JOIN public.admin_assignments aa ON aa.id = hh.admin_id
    WHERE hh.house_id = hm.house_id
      AND aa.user_id = hm.user_id
  )
  GROUP BY hm.house_id
)
SELECT
  hos.id AS house_id,
  COALESCE(ms.member_count, 0) + COALESCE(hs.head_count, 0) + COALESCE(mods.moderator_count, 0) AS member_count,
  COALESCE(ms.member_count, 0) AS member_only_count,
  COALESCE(hs.head_count, 0) AS head_count,
  COALESCE(mods.moderator_count, 0) AS moderator_count,
  COALESCE(ms.member_xp, 0) + COALESCE(hs.head_xp, 0) + COALESCE(mods.moderator_xp, 0) AS total_xp,
  COALESCE(ms.member_xp, 0) AS member_xp,
  COALESCE(hs.head_xp, 0) AS head_xp,
  COALESCE(mods.moderator_xp, 0) AS moderator_xp
FROM public.houses_of_sports hos
LEFT JOIN member_stats ms ON ms.house_id = hos.id
LEFT JOIN head_stats hs ON hs.house_id = hos.id
LEFT JOIN moderator_stats mods ON mods.house_id = hos.id;
