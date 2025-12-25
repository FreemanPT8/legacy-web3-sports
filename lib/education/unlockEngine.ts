import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
} from '@/lib/lesson-id';
import {
  START_HERE_SLUG,
  START_HERE_FALLBACK_ID,
  evaluateUnlockCondition,
  type UnlockCondition,
  type UnlockConditionContext,
} from '@/lib/education/unlockLogic';

const db = supabaseAdmin ?? supabase;

type Nullable<T> = T | null | undefined;

type RawCourse = {
  id: string;
  slug: string | null;
  title: any;
  published: boolean | null;
  academy_level_slug: string | null;
  is_required_in_level: boolean | null;
  is_start_course: boolean | null;
  academy_path_order?: number | null;
  curriculum?: any;
};

type RawLevel = {
  slug: string;
  order_index: number;
  title_i18n?: Record<string, string>;
  unlock_condition?: Record<string, any>;
  visibility_condition?: Record<string, any>;
  min_xp?: number | null;
  max_xp?: number | null;
  accent_color?: string | null;
  badge_icon?: string | null;
  short_label?: string | null;
};

export type LevelCourseSummary = {
  id: string;
  slug: string | null;
  title: string;
  isRequired: boolean;
  isStartCourse: boolean;
  isCompleted: boolean;
};

export type AcademyLevelState = {
  slug: string;
  title: string;
  shortLabel?: string | null;
  accentColor?: string | null;
  minXp?: number | null;
  maxXp?: number | null;
  isVisible: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  progressPercent: number;
  lockedReason: string | null;
};

export type StartHereState = {
  courseId: string | null;
  slug: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  isCompleted: boolean;
  missingLessons: number;
};

export type UnlockEngineResult = {
  startHere: StartHereState;
  levels: AcademyLevelState[];
  coursesByLevel: Record<string, LevelCourseSummary[]>;
};

export async function computeUnlockState(
  userId: string,
  options?: { xpTotal?: number },
): Promise<UnlockEngineResult> {
  if (!userId) {
    throw new Error('computeUnlockState: userId is required');
  }

  const [levelsResult, startCourseRecord, coursesResult, xpTotal] = await Promise.all([
    db
      .from('academy_levels')
      .select(
        'slug, order_index, title_i18n, unlock_condition, visibility_condition, min_xp, max_xp, accent_color, badge_icon, short_label',
      )
      .order('order_index', { ascending: true }),
    fetchStartCourseRecord(),
    db
      .from('courses')
      .select(
        'id, slug, title, published, academy_level_slug, is_required_in_level, is_start_course, academy_path_order, curriculum',
      )
      .eq('published', true)
      .order('academy_level_slug', { ascending: true })
      .order('academy_path_order', { ascending: true }),
    resolveUserXpTotal(userId, options?.xpTotal),
  ]);

  if (levelsResult.error) {
    throw new Error(`Failed to load academy levels: ${levelsResult.error.message}`);
  }
  if (coursesResult.error) {
    throw new Error(`Failed to load courses: ${coursesResult.error.message}`);
  }

  const levels = (levelsResult.data || []) as RawLevel[];
  const publishedCourses = (coursesResult.data || []) as RawCourse[];

  const startHere = await computeStartHereState(
    startCourseRecord,
    userId,
  );

  const completedCourses = await fetchCourseCompletionSet(publishedCourses, userId);
  const { coursesByLevel, courseCompletionBySlug } = buildCoursesByLevel(
    publishedCourses,
    completedCourses,
  );

  const levelStates = computeLevelStates(
    levels,
    coursesByLevel,
    startHere,
    xpTotal,
    courseCompletionBySlug,
  );

  return {
    startHere,
    levels: levelStates,
    coursesByLevel,
  };
}

async function fetchStartCourseRecord(): Promise<RawCourse | null> {
  try {
    const slugResult = await db
      .from('courses')
      .select('id, slug, title, curriculum, published')
      .eq('slug', START_HERE_SLUG)
      .maybeSingle();

    if (slugResult.data) {
      return slugResult.data as RawCourse;
    }

    if (slugResult.error) {
      console.warn('fetchStartCourseRecord: failed to load start course by slug', slugResult.error);
    }

    const idResult = await db
      .from('courses')
      .select('id, slug, title, curriculum, published')
      .eq('id', START_HERE_FALLBACK_ID)
      .maybeSingle();

    if (idResult.data) {
      console.warn('fetchStartCourseRecord: using fallback course id for start course.');
      return idResult.data as RawCourse;
    }

    if (idResult.error) {
      console.warn('fetchStartCourseRecord: failed to load start course by fallback id', idResult.error);
    }

    const fallbackResult = await db
      .from('courses')
      .select('id, slug, title, curriculum, published')
      .eq('is_start_course', true)
      .order('created_at', { ascending: true })
      .maybeSingle();

    if (fallbackResult.data) {
      console.warn('fetchStartCourseRecord: START_HERE not found by slug/id, using first course flagged as start.');
      return fallbackResult.data as RawCourse;
    }

    if (fallbackResult.error) {
      console.error('fetchStartCourseRecord: failed to load fallback start course', fallbackResult.error);
    }
  } catch (error) {
    console.error('fetchStartCourseRecord error:', error);
  }
  return null;
}

async function computeStartHereState(
  course: Nullable<RawCourse>,
  userId: string,
): Promise<StartHereState> {
  if (!course || !course.id) {
    return {
      courseId: null,
      slug: START_HERE_SLUG,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      isCompleted: false,
      missingLessons: 0,
    };
  }

  const lessonIds = extractLessonIds(course.curriculum);
  if (lessonIds.length === 0) {
    return {
      courseId: course.id,
      slug: course.slug || START_HERE_SLUG,
      totalLessons: 0,
      completedLessons: 0,
      progressPercent: 0,
      isCompleted: false,
      missingLessons: 0,
    };
  }

  const variantSet = new Set<string>();
  lessonIds.forEach((lessonId) => {
    buildLessonIdVariants(lessonId).forEach((variant) => {
      if (variant) {
        variantSet.add(variant);
      }
    });
    const normalized = normalizeLessonIdForStorage(lessonId);
    if (normalized) {
      variantSet.add(normalized);
    }
  });

  let completedLessons = 0;
  if (variantSet.size > 0) {
    const { data, error } = await db
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId)
      .in('lesson_id', Array.from(variantSet));

    if (error) {
      console.error('computeUnlockState: failed to load lesson completions', error);
    } else {
      const normalizedCompleted = new Set(
        (data || [])
          .map((row: any) => row.lesson_id)
          .filter(Boolean)
          .map((lid: string) => normalizeLessonIdForStorage(lid) || lid),
      );
      completedLessons = lessonIds.filter((id) => {
        const normalized = normalizeLessonIdForStorage(id) || id;
        return normalizedCompleted.has(normalized);
      }).length;
    }
  }

  const totalLessons = lessonIds.length;
  const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    courseId: course.id,
    slug: course.slug || START_HERE_SLUG,
    totalLessons,
    completedLessons,
    progressPercent,
    isCompleted,
    missingLessons: Math.max(totalLessons - completedLessons, 0),
  };
}

function extractLessonIds(curriculum: any): string[] {
  if (!curriculum || typeof curriculum !== 'object') return [];
  const topics: any[] = Array.isArray(curriculum?.topics) ? curriculum.topics : [];
  return topics.flatMap((topic: any) => {
    if (!Array.isArray(topic?.lessons)) return [];
    return topic.lessons
      .map((lesson: any, lessonIndex: number) => {
        if (lesson?.id) return lesson.id;
        const moduleId = topic?.id || 'topic';
        return `${moduleId}-lesson-${lessonIndex + 1}`;
      })
      .filter(Boolean);
  });
}

async function fetchCourseCompletionSet(
  courses: RawCourse[],
  userId: string,
): Promise<Set<string>> {
  const courseIds = courses
    .filter((course) => course.id)
    .map((course) => course.id);

  if (courseIds.length === 0) {
    return new Set();
  }

  const { data, error } = await db
    .from('course_completions')
    .select('course_id')
    .eq('user_id', userId)
    .in('course_id', courseIds);

  if (error) {
    console.error('computeUnlockState: failed to load course completions', error);
    return new Set();
  }

  return new Set((data || []).map((row: any) => row.course_id).filter(Boolean));
}

function buildCoursesByLevel(
  courses: RawCourse[],
  completedCourseIds: Set<string>,
): {
  coursesByLevel: Record<string, LevelCourseSummary[]>;
  courseCompletionBySlug: Record<string, boolean>;
} {
  return courses.reduce<{
    coursesByLevel: Record<string, LevelCourseSummary[]>;
    courseCompletionBySlug: Record<string, boolean>;
  }>(
    (acc, course) => {
      const normalizedLevelSlug = normalizeCourseLevelSlug(course);
      if (!normalizedLevelSlug) {
        return acc;
      }

      if (!acc.coursesByLevel[normalizedLevelSlug]) {
        acc.coursesByLevel[normalizedLevelSlug] = [];
      }

      const summary: LevelCourseSummary = {
        id: course.id,
        slug: course.slug,
        title: resolveTitle(course.title),
        isRequired: course.is_required_in_level !== false,
        isStartCourse: Boolean(course.is_start_course),
        isCompleted: completedCourseIds.has(course.id),
      };

      acc.coursesByLevel[normalizedLevelSlug].push(summary);
      if (course.slug) {
        acc.courseCompletionBySlug[course.slug] = summary.isCompleted;
      }

      return acc;
    },
    {
      coursesByLevel: {},
      courseCompletionBySlug: {},
    },
  );
}

function computeLevelStates(
  levels: RawLevel[],
  coursesByLevel: Record<string, LevelCourseSummary[]>,
  startHere: StartHereState,
  xpTotal: number,
  courseCompletionBySlug: Record<string, boolean>,
): AcademyLevelState[] {
  const result: AcademyLevelState[] = [];
  const levelStatuses: UnlockConditionContext['levelStatuses'] = {};

  levels.forEach((level) => {
    const levelCourses = coursesByLevel[level.slug] || [];
    const progress = computeLevelProgress(levelCourses);

    const context: UnlockConditionContext = {
      xpTotal,
      startHereCompleted: startHere.isCompleted,
      courseCompletionBySlug,
      levelStatuses,
    };

    const isVisible = evaluateUnlockCondition(level.visibility_condition, context);
    const conditionMet = evaluateUnlockCondition(level.unlock_condition, context);
    const xpRequirementMet =
      typeof level.min_xp === 'number' ? xpTotal >= level.min_xp : true;

    const isUnlocked = xpRequirementMet && conditionMet;
    const lockedReason = isUnlocked
      ? null
      : buildLockedReason(level, {
          xpRequirementMet,
          conditionMet,
          condition: level.unlock_condition,
        });

    const state: AcademyLevelState = {
      slug: level.slug,
      title: resolveTitle(level.title_i18n) || capitalize(level.slug),
      shortLabel: level.short_label || null,
      accentColor: level.accent_color || null,
      minXp: typeof level.min_xp === 'number' ? level.min_xp : null,
      maxXp: typeof level.max_xp === 'number' ? level.max_xp : null,
      isVisible,
      isUnlocked,
      isCompleted: progress.isCompleted,
      progressPercent: progress.progressPercent,
      lockedReason: isVisible ? lockedReason : 'Nivel ainda indisponivel.',
    };

    result.push(state);
    levelStatuses[level.slug] = {
      isUnlocked: state.isUnlocked,
      isCompleted: state.isCompleted,
    };
  });

  return result;
}

function computeLevelProgress(
  courses: LevelCourseSummary[],
): {
  isCompleted: boolean;
  progressPercent: number;
  totalRequired: number;
  completedRequired: number;
} {
  const required = courses.filter((course) => course.isRequired);
  const totalRequired = required.length;

  if (totalRequired === 0) {
    return {
      isCompleted: false,
      progressPercent: 0,
      totalRequired: 0,
      completedRequired: 0,
    };
  }

  const completedRequired = required.filter((course) => course.isCompleted).length;
  const progressPercent = Math.round((completedRequired / totalRequired) * 100);

  return {
    isCompleted: completedRequired === totalRequired,
    progressPercent,
    totalRequired,
    completedRequired,
  };
}

function buildLockedReason(
  level: RawLevel,
  details: {
    xpRequirementMet: boolean;
    conditionMet: boolean;
    condition: UnlockCondition;
  },
): string | null {
  if (!details.xpRequirementMet) {
    const target = level.min_xp ?? (details.condition as any)?.min_xp ?? 0;
    if (target > 0) {
      return `Alcanca ${target} XP para desbloquear este nivel.`;
    }
    return 'Ganha mais XP para desbloquear este nivel.';
  }

  if (details.conditionMet) {
    return 'Nivel ainda nao desbloqueado.';
  }

  const condition = details.condition;
  switch (condition?.type) {
    case 'course_completed':
      if (condition.course_slug === START_HERE_SLUG) {
        return 'Completa o curso COMECA AQUI para desbloquear este nivel.';
      }
      return 'Completa o curso obrigatorio para desbloquear este nivel.';
    case 'academy_level_completed':
      return 'Conclui o nivel anterior para avancar.';
    case 'academy_level_unlocked':
      return 'Desbloqueia o nivel anterior para aceder a este conteudo.';
    case 'xp_threshold': {
      const required = condition.min_xp ?? level.min_xp ?? 0;
      return required > 0
        ? `Alcanca ${required} XP para desbloquear este nivel.`
        : 'Ganha mais XP para desbloquear este nivel.';
    }
    default:
      return 'Nivel ainda nao desbloqueado.';
  }
}

const START_LEVEL_SLUG = 'novato';

function normalizeCourseLevelSlug(course: RawCourse): string | null {
  const directSlug = typeof course.academy_level_slug === 'string'
    ? course.academy_level_slug.trim()
    : '';
  if (directSlug.length > 0) {
    return directSlug;
  }

  const metadataSlugRaw =
    typeof course.curriculum?.metadata?.academyLevelSlug === 'string'
      ? course.curriculum.metadata.academyLevelSlug
      : null;

  const metadataSlug = metadataSlugRaw ? metadataSlugRaw.trim() : '';
  if (metadataSlug.length > 0) {
    return metadataSlug;
  }

  if (course.is_start_course) {
    return START_LEVEL_SLUG;
  }

  return null;
}

async function resolveUserXpTotal(
  userId: string,
  provided?: number,
): Promise<number> {
  if (typeof provided === 'number' && Number.isFinite(provided)) {
    return provided;
  }

  const { data, error } = await db
    .from('users')
    .select('xp_total')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Failed to resolve XP total for user');
  }

  return data.xp_total ?? 0;
}

export function resolveTitle(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  const preferredOrder = ['pt', 'en', 'es', 'fr', 'it'];
  for (const key of preferredOrder) {
    if (typeof raw[key] === 'string' && raw[key].trim().length > 0) {
      return raw[key];
    }
  }
  const firstValue = Object.values(raw).find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  return typeof firstValue === 'string' ? firstValue : '';
}

function capitalize(slug: string): string {
  if (!slug) return '';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
