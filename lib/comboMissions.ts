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
    label: 'Rota Rápida',
    requirements: { glossary: 3, blog: 1, lesson: 0 },
    xp: 15,
  },
  {
    key: 'base',
    missionType: 'combo_base',
    label: 'Rota Base',
    requirements: { glossary: 5, blog: 1, lesson: 1 },
    xp: 21,
  },
  {
    key: 'serious',
    missionType: 'combo_serious',
    label: 'Rota Séria',
    requirements: { glossary: 10, blog: 2, lesson: 2 },
    xp: 33,
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
  const { data } = await db
    .from('daily_missions')
    .select('id')
    .eq('type', missionType)
    .eq('date', comboDate)
    .eq('is_active', true)
    .maybeSingle();
  return data?.id as string | undefined;
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
  const existing = await getComboProgress(userId, comboDate);
  if (!existing) return createEmptyProgress();
  return {
    glossary_count: existing.glossary_count,
    blog_count: existing.blog_count,
    lesson_count: existing.lesson_count,
    quick_completed: existing.quick_completed,
    base_completed: existing.base_completed,
    serious_completed: existing.serious_completed,
  };
}

export const comboDefinitions = COMBO_DEFINITIONS;
