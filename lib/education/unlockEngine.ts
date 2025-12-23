import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
} from '@/lib/lesson-id';

const START_HERE_SLUG = 'comeca-aqui';
const CADETS_SLUG = 'cadets';
const JUVENILES_SLUG = 'juveniles';
const JUNIORS_SLUG = 'juniors';
const SENIORS_SLUG = 'seniors';

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
  curriculum?: any;
};

type RawLevel = {
  slug: string;
  order_index: number;
  title_i18n?: Record<string, string>;
  unlock_condition?: Record<string, any>;
  visibility_condition?: Record<string, any>;
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
): Promise<UnlockEngineResult> {
  if (!userId) {
    throw new Error('computeUnlockState: userId is required');
  }

  const [levelsResult, startCourseResult, coursesResult] = await Promise.all([
    db
      .from('academy_levels')
      .select('slug, order_index, title_i18n, unlock_condition, visibility_condition')
      .order('order_index', { ascending: true }),
    db
      .from('courses')
      .select('id, slug, title, curriculum, published')
      .eq('slug', START_HERE_SLUG)
      .maybeSingle(),
    db
      .from('courses')
      .select(
        'id, slug, title, published, academy_level_slug, is_required_in_level, is_start_course',
      )
      .eq('published', true),
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
    startCourseResult.data as Nullable<RawCourse>,
    userId,
  );

  const coursesByLevel = buildCoursesByLevel(
    publishedCourses,
    await fetchCourseCompletionSet(publishedCourses, userId),
  );

  const levelStates = computeLevelStates(levels, coursesByLevel, startHere);

  return {
    startHere,
    levels: levelStates,
    coursesByLevel,
  };
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
): Record<string, LevelCourseSummary[]> {
  return courses.reduce<Record<string, LevelCourseSummary[]>>((acc, course) => {
    if (!course.academy_level_slug) {
      return acc;
    }

    const levelSlug = course.academy_level_slug;
    if (!acc[levelSlug]) {
      acc[levelSlug] = [];
    }

    acc[levelSlug].push({
      id: course.id,
      slug: course.slug,
      title: resolveTitle(course.title),
      isRequired: course.is_required_in_level !== false,
      isStartCourse: Boolean(course.is_start_course),
      isCompleted: completedCourseIds.has(course.id),
    });

    return acc;
  }, {});
}

function computeLevelStates(
  levels: RawLevel[],
  coursesByLevel: Record<string, LevelCourseSummary[]>,
  startHere: StartHereState,
): AcademyLevelState[] {
  const result: AcademyLevelState[] = [];

  const cadetsProgress = computeLevelProgress(
    coursesByLevel[CADETS_SLUG] || [],
  );
  const juvenilesProgress = computeLevelProgress(
    coursesByLevel[JUVENILES_SLUG] || [],
  );
  const juniorsProgress = computeLevelProgress(
    coursesByLevel[JUNIORS_SLUG] || [],
  );
  const seniorsProgress = computeLevelProgress(
    coursesByLevel[SENIORS_SLUG] || [],
  );

  const cadetsUnlocked = startHere.isCompleted;
  const cadetsCompleted = cadetsProgress.isCompleted;

  const juvenilesUnlocked = cadetsCompleted;
  const juvenilesVisible = cadetsUnlocked;

  const juniorsVisible = juvenilesUnlocked;
  const seniorsVisible = juvenilesUnlocked;
  const juniorsUnlocked = juvenilesUnlocked;
  const seniorsUnlocked = juvenilesUnlocked;

  const overrides: Record<string, Partial<AcademyLevelState>> = {
    [CADETS_SLUG]: {
      isVisible: true,
      isUnlocked: cadetsUnlocked,
      lockedReason: cadetsUnlocked
        ? null
        : 'Completa o curso COMEÇA AQUI para desbloquear Cadetes.',
    },
    [JUVENILES_SLUG]: {
      isVisible: juvenilesVisible,
      isUnlocked: juvenilesUnlocked,
      lockedReason: juvenilesUnlocked
        ? null
        : 'Completa todos os cursos obrigatórios de Cadetes para desbloquear Juvenis.',
    },
    [JUNIORS_SLUG]: {
      isVisible: juniorsVisible,
      isUnlocked: juniorsUnlocked,
      lockedReason: juniorsUnlocked
        ? null
        : 'Desbloqueia o nível Juvenis para aceder aos Juniores.',
    },
    [SENIORS_SLUG]: {
      isVisible: seniorsVisible,
      isUnlocked: seniorsUnlocked,
      lockedReason: seniorsUnlocked
        ? null
        : 'Desbloqueia o nível Juvenis para aceder aos Séniors.',
    },
  };

  levels.forEach((level) => {
    const baseProgress = computeLevelProgress(
      coursesByLevel[level.slug] || [],
    );

    const override = overrides[level.slug] || {};
    const state: AcademyLevelState = {
      slug: level.slug,
      title: resolveTitle(level.title_i18n) || capitalize(level.slug),
      isVisible: override.isVisible ?? true,
      isUnlocked: override.isUnlocked ?? baseProgress.isUnlocked,
      isCompleted: baseProgress.isCompleted,
      progressPercent: baseProgress.progressPercent,
      lockedReason:
        override.lockedReason ??
        (baseProgress.isUnlocked ? null : 'Nível ainda não desbloqueado.'),
    };

    result.push(state);
  });

  // Ensure Juniores/Séniors statuses reused computed progress
  replaceState(result, CADETS_SLUG, cadetsProgress, overrides[CADETS_SLUG]);
  replaceState(result, JUVENILES_SLUG, juvenilesProgress, overrides[JUVENILES_SLUG]);
  replaceState(result, JUNIORS_SLUG, juniorsProgress, overrides[JUNIORS_SLUG]);
  replaceState(result, SENIORS_SLUG, seniorsProgress, overrides[SENIORS_SLUG]);

  return result;
}

function computeLevelProgress(
  courses: LevelCourseSummary[],
): {
  isUnlocked: boolean;
  isCompleted: boolean;
  progressPercent: number;
} {
  const required = courses.filter((course) => course.isRequired);
  const totalRequired = required.length;
  if (totalRequired === 0) {
    return {
      isUnlocked: false,
      isCompleted: false,
      progressPercent: 0,
    };
  }

  const completed = required.filter((course) => course.isCompleted).length;
  const progressPercent = Math.round((completed / totalRequired) * 100);

  return {
    isUnlocked: true,
    isCompleted: completed === totalRequired,
    progressPercent,
  };
}

function replaceState(
  states: AcademyLevelState[],
  slug: string,
  progress: { isUnlocked: boolean; isCompleted: boolean; progressPercent: number },
  override: Partial<AcademyLevelState> | undefined,
) {
  const index = states.findIndex((level) => level.slug === slug);
  if (index === -1) return;
  const current = states[index];
  states[index] = {
    ...current,
    isUnlocked: override?.isUnlocked ?? progress.isUnlocked,
    isCompleted: progress.isCompleted,
    progressPercent: progress.progressPercent,
    lockedReason: current.lockedReason,
  };
}

function resolveTitle(raw: any): string {
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
