import { supabase, supabaseAdmin } from './supabase';
import { getTodayCETDate } from './timezone';
import { awardXP } from './xp';
import { logger } from './logger';

const db = supabaseAdmin ?? supabase;

export type ComboEventType = 'lesson' | 'blog' | 'glossary';
export type ComboKey = 'quick' | 'base' | 'serious';

type ComboDefinition = {
  key: ComboKey;
  missionType: string;
  label: string;
  requirements: {
    glossary: number;
    blog: number;
    lesson: number;
  };
  xp: number;
};

const COMBO_DEFINITIONS: ComboDefinition[] = [
  {
    key: 'quick',
    missionType: 'combo_quick',
    label: 'Rota Basica',
    requirements: { glossary: 0, blog: 1, lesson: 1 },
    xp: 13,
  },
  {
    key: 'base',
    missionType: 'combo_base',
    label: 'Rota Base',
    requirements: { glossary: 2, blog: 1, lesson: 1 },
    xp: 21,
  },
  {
    key: 'serious',
    missionType: 'combo_serious',
    label: 'Rota Seria',
    requirements: { glossary: 5, blog: 2, lesson: 2 },
    xp: 47,
  },
];

type ComboProgressRow = {
  id: string;
  user_id: string;
  combo_date: string;
  glossary_count: number;
  blog_count: number;
  lesson_count: number;
  quick_completed: boolean;
  base_completed: boolean;
  serious_completed: boolean;
};

export type ComboProgressState = {
  glossary_count: number;
  blog_count: number;
  lesson_count: number;
  quick_completed: boolean;
  base_completed: boolean;
  serious_completed: boolean;
};

export type ComboMissionMeta = {
  xp: number;
  completed: boolean;
};

const BASE_PROGRESS_STATE: ComboProgressState = {
  glossary_count: 0,
  blog_count: 0,
  lesson_count: 0,
  quick_completed: false,
  base_completed: false,
  serious_completed: false,
};

const createEmptyProgress = (): ComboProgressState => ({
  ...BASE_PROGRESS_STATE,
});

type DailyMissionSummary = {
  id: string;
  type: string;
  xp_reward?: number | null;
};

async function ensureDailyMissionsForDate(
  comboDate: string,
): Promise<Map<string, DailyMissionSummary>> {
  const { data: existing } = await db
    .from('daily_missions')
    .select('id, type, xp_reward')
    .eq('date', comboDate)
    .eq('is_active', true);

  const existingMap = new Map<string, DailyMissionSummary>(
    (existing || []).map((row: DailyMissionSummary) => [row.type, row]),
  );

  const missing = COMBO_DEFINITIONS.filter(
    (combo) => !existingMap.has(combo.missionType),
  );

  if (missing.length > 0) {
    const { data: inserted } = await db
      .from('daily_missions')
      .insert(
        missing.map((combo) => ({
          date: comboDate,
          type: combo.missionType,
          description: combo.label,
          xp_reward: combo.xp,
          target_count: 1,
          is_active: true,
          metadata: {
            combo: combo.key,
            requirements: combo.requirements,
            xp: combo.xp,
          },
        })),
      )
      .select('id, type, xp_reward');

    (inserted || []).forEach((row: DailyMissionSummary) => {
      existingMap.set(row.type, row);
    });
  }

  return existingMap;
}

async function getComboProgress(
  userId: string,
  comboDate: string,
) {
  const { data } = await db
    .from('daily_combo_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('combo_date', comboDate)
    .maybeSingle();
  return data as ComboProgressRow | null;
}

async function upsertComboProgress(
  userId: string,
  comboDate: string,
  payload: Partial<ComboProgressRow>,
) {
  await db
    .from('daily_combo_progress')
    .upsert(
      {
        user_id: userId,
        combo_date: comboDate,
        ...payload,
      },
      { onConflict: 'user_id,combo_date' },
    );
}

async function ensureUserMission(
  userId: string,
  missionId: string,
) {
  const { data, error } = await db
    .from('user_missions')
    .select('id, completed')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .maybeSingle();

  if (error && (error as any).code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: inserted } = await db
    .from('user_missions')
    .insert({
      user_id: userId,
      mission_id: missionId,
      progress: 0,
      completed: false,
    })
    .select('id, completed')
    .maybeSingle();

  return inserted;
}

async function completeMission(
  userId: string,
  missionId: string,
  combo: ComboDefinition,
) {
  const mission = await ensureUserMission(userId, missionId);
  if (mission?.completed) {
    return;
  }

  await db
    .from('user_missions')
    .update({
      progress: 1,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('mission_id', missionId);

  await awardXP(
    userId,
    `Daily combo: ${combo.label}`,
    combo.xp,
    missionId,
    'daily_combo',
  );
}

async function resolveMissionId(
  missionType: string,
  comboDate: string,
) {
  const missionsMap = await ensureDailyMissionsForDate(comboDate);
  return missionsMap.get(missionType)?.id as string | undefined;
}

function meetsRequirements(
  combo: ComboDefinition,
  counts: { glossary: number; blog: number; lesson: number },
) {
  return (
    counts.glossary >= combo.requirements.glossary &&
    counts.blog >= combo.requirements.blog &&
    counts.lesson >= combo.requirements.lesson
  );
}

async function getActivityCountsForDate(
  userId: string,
  comboDate: string,
): Promise<{ glossary: number; blog: number; lesson: number }> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [
    { data: lessonRows, error: lessonError },
    { data: blogRows, error: blogError },
    { data: glossaryRows, error: glossaryError },
  ] = await Promise.all([
    db
      .from('lesson_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since),
    db
      .from('blog_reads')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since),
    db
      .from('glossary_term_reads')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since),
  ]);

  if (lessonError) logger.warn?.('combo activity lesson error', lessonError);
  if (blogError) logger.warn?.('combo activity blog error', blogError);
  if (glossaryError) logger.warn?.('combo activity glossary error', glossaryError);

  const isSameCETDay = (value?: string | null) =>
    value ? getTodayCETDate(new Date(value)) === comboDate : false;

  return {
    lesson: (lessonRows || []).filter((row: any) =>
      isSameCETDay(row?.completed_at),
    ).length,
    blog: (blogRows || []).filter((row: any) =>
      isSameCETDay(row?.completed_at),
    ).length,
    glossary: (glossaryRows || []).filter((row: any) =>
      isSameCETDay(row?.completed_at),
    ).length,
  };
}

export async function recordComboEvent(
  userId: string,
  event: ComboEventType,
) {
  try {
    const comboDate = getTodayCETDate();
    const existing = await getComboProgress(userId, comboDate);

    const newCounts = {
      glossary: (existing?.glossary_count ?? 0) + (event === 'glossary' ? 1 : 0),
      blog: (existing?.blog_count ?? 0) + (event === 'blog' ? 1 : 0),
      lesson: (existing?.lesson_count ?? 0) + (event === 'lesson' ? 1 : 0),
    };

    const completions = {
      quick: existing?.quick_completed ?? false,
      base: existing?.base_completed ?? false,
      serious: existing?.serious_completed ?? false,
    };

    const combosToAward: ComboDefinition[] = [];

    for (const combo of COMBO_DEFINITIONS) {
      if (completions[combo.key]) continue;
      if (meetsRequirements(combo, newCounts)) {
        combosToAward.push(combo);
        completions[combo.key] = true;
      }
    }

    await upsertComboProgress(userId, comboDate, {
      glossary_count: newCounts.glossary,
      blog_count: newCounts.blog,
      lesson_count: newCounts.lesson,
      quick_completed: completions.quick,
      base_completed: completions.base,
      serious_completed: completions.serious,
    });

    for (const combo of combosToAward) {
      const missionId = await resolveMissionId(combo.missionType, comboDate);
      if (!missionId) {
        logger.warn?.(`No mission found for ${combo.missionType} on ${comboDate}`);
        continue;
      }
      await completeMission(userId, missionId, combo);
    }
  } catch (error) {
    logger.error?.('recordComboEvent error', error);
  }
}

export async function getComboProgressForUser(userId: string): Promise<ComboProgressState> {
  const comboDate = getTodayCETDate();
  const [existing, activityCounts] = await Promise.all([
    getComboProgress(userId, comboDate),
    getActivityCountsForDate(userId, comboDate),
  ]);

  const mergedCounts = {
    glossary: Math.max(existing?.glossary_count ?? 0, activityCounts.glossary),
    blog: Math.max(existing?.blog_count ?? 0, activityCounts.blog),
    lesson: Math.max(existing?.lesson_count ?? 0, activityCounts.lesson),
  };

  const mergedCompletions: Record<ComboKey, boolean> = {
    quick: existing?.quick_completed ?? false,
    base: existing?.base_completed ?? false,
    serious: existing?.serious_completed ?? false,
  };

  for (const combo of COMBO_DEFINITIONS) {
    if (mergedCompletions[combo.key]) continue;
    if (meetsRequirements(combo, mergedCounts)) {
      mergedCompletions[combo.key] = true;
    }
  }

  const missionsMap = await ensureDailyMissionsForDate(comboDate);
  for (const combo of COMBO_DEFINITIONS) {
    if (!meetsRequirements(combo, mergedCounts)) continue;
    const missionId = missionsMap.get(combo.missionType)?.id;
    if (!missionId) continue;
    const mission = await ensureUserMission(userId, missionId);
    if (mission?.completed) continue;
    await completeMission(userId, missionId, combo);
    mergedCompletions[combo.key] = true;
  }

  const needsSync =
    !existing ||
    mergedCounts.glossary !== (existing?.glossary_count ?? 0) ||
    mergedCounts.blog !== (existing?.blog_count ?? 0) ||
    mergedCounts.lesson !== (existing?.lesson_count ?? 0) ||
    mergedCompletions.quick !== (existing?.quick_completed ?? false) ||
    mergedCompletions.base !== (existing?.base_completed ?? false) ||
    mergedCompletions.serious !== (existing?.serious_completed ?? false);

  if (needsSync) {
    await upsertComboProgress(userId, comboDate, {
      glossary_count: mergedCounts.glossary,
      blog_count: mergedCounts.blog,
      lesson_count: mergedCounts.lesson,
      quick_completed: mergedCompletions.quick,
      base_completed: mergedCompletions.base,
      serious_completed: mergedCompletions.serious,
    });
  }

  return {
    glossary_count: mergedCounts.glossary,
    blog_count: mergedCounts.blog,
    lesson_count: mergedCounts.lesson,
    quick_completed: mergedCompletions.quick,
    base_completed: mergedCompletions.base,
    serious_completed: mergedCompletions.serious,
  };
}

export const comboDefinitions = COMBO_DEFINITIONS;
