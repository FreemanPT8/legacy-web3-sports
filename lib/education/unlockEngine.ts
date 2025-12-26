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
  description?: any;
  published: boolean | null;
  academy_level_slug: string | null;
  is_required_in_level: boolean | null;
  is_start_course: boolean | null;
  academy_path_order?: number | null;
  curriculum?: any;
  seo?: any;
  available_languages?: string[] | null;
  primary_language?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  xp_reward?: number | null;
  xp_reward_on_complete?: number | null;
  xp_threshold?: number | null;
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

type LoadedLevelsPayload = {
  data: RawLevel[];
};

export type LevelCourseSummary = {
  id: string;
  slug: string | null;
  title: string;
  isRequired: boolean;
  isStartCourse: boolean;
  isCompleted: boolean;
  coverImageUrl?: string | null;
  description?: string;
  availableLanguages?: string[];
  modulesCount?: number;
  lessonsCount?: number;
  totalXp?: number;
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

async function loadAcademyLevels(): Promise<LoadedLevelsPayload> {
  const detailedSelect =
    'slug, order_index, title_i18n, unlock_condition, visibility_condition, min_xp, max_xp, accent_color, badge_icon, short_label';
  const detailed = await db
    .from('academy_levels')
    .select(detailedSelect)
    .order('order_index', { ascending: true });

  if (!detailed.error) {
    return {
      data: applyLevelFallbacks((detailed.data || []) as RawLevel[]),
    };
  }

  if (isMissingLevelColumnError(detailed.error)) {
    const legacy = await db
      .from('academy_levels')
      .select('slug, order_index, title_i18n, unlock_condition, visibility_condition')
      .order('order_index', { ascending: true });

    if (legacy.error) {
      throw new Error(`Failed to load academy levels: ${legacy.error.message}`);
    }

    return {
      data: applyLevelFallbacks((legacy.data || []) as RawLevel[]),
    };
  }

  throw new Error(`Failed to load academy levels: ${detailed.error.message}`);
}

async function loadCoursesForUnlock(): Promise<{ data: RawCourse[] }> {
  const filters = ['published.eq.true', 'is_start_course.eq.true', `id.eq.${START_HERE_FALLBACK_ID}`].join(',');
  const detailedSelect =
    'id, title, description, published, academy_level_slug, is_required_in_level, is_start_course, academy_path_order, curriculum, seo, available_languages, primary_language, image_url, thumbnail_url, xp_reward, xp_reward_on_complete, xp_threshold';

  const detailed = await db
    .from('courses')
    .select(detailedSelect)
    .or(filters)
    .order('academy_level_slug', { ascending: true })
    .order('academy_path_order', { ascending: true });

  if (!detailed.error) {
    return { data: (detailed.data || []) as RawCourse[] };
  }

  if (isMissingCourseColumnError(detailed.error)) {
    const fallback = await db
      .from('courses')
      .select(
        'id, title, published, academy_level_slug, is_required_in_level, is_start_course, curriculum',
      )
      .or(filters)
      .order('academy_level_slug', { ascending: true })
      .order('created_at', { ascending: true });

    if (fallback.error) {
      throw new Error(`Failed to load courses: ${fallback.error.message}`);
    }

    return { data: (fallback.data || []) as RawCourse[] };
  }

  throw new Error(`Failed to load courses: ${detailed.error.message}`);
}

export async function computeUnlockState(
  userId: string,
  options?: { xpTotal?: number },
): Promise<UnlockEngineResult> {
  if (!userId) {
    throw new Error('computeUnlockState: userId is required');
  }

  const [levelsPayload, startCourseRecord, coursesPayload, xpTotal] = await Promise.all([
    loadAcademyLevels(),
    fetchStartCourseRecord(),
    loadCoursesForUnlock(),
    resolveUserXpTotal(userId, options?.xpTotal),
  ]);

  const levels = levelsPayload.data as RawLevel[];
  const publishedCourses = (coursesPayload.data as RawCourse[]).map(
    attachCourseSlug,
  );

  const startHere = await computeStartHereState(
    startCourseRecord ? attachCourseSlug(startCourseRecord) : null,
    userId,
  );

  const completedCourses = await fetchCourseCompletionSet(publishedCourses, userId);
  const fallbackStartLevelSlug = levels[0]?.slug || START_LEVEL_SLUG;
  const { coursesByLevel, courseCompletionBySlug } = buildCoursesByLevel(
    publishedCourses,
    completedCourses,
    fallbackStartLevelSlug,
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
    const idResult = await db
      .from('courses')
      .select('id, title, curriculum, published, seo')
      .eq('id', START_HERE_FALLBACK_ID)
      .maybeSingle();

    if (idResult.data) {
      return idResult.data as RawCourse;
    }

    if (idResult.error) {
      console.warn('fetchStartCourseRecord: failed to load start course by fallback id', idResult.error);
    }

    const fallbackResult = await db
      .from('courses')
      .select('id, title, curriculum, published, seo')
      .eq('is_start_course', true)
      .order('created_at', { ascending: true })
      .maybeSingle();

    if (fallbackResult.data) {
      console.warn('fetchStartCourseRecord: START_HERE not found by id, using first course flagged as start.');
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
  fallbackStartLevelSlug: string,
): {
  coursesByLevel: Record<string, LevelCourseSummary[]>;
  courseCompletionBySlug: Record<string, boolean>;
} {
  return courses.reduce<{
    coursesByLevel: Record<string, LevelCourseSummary[]>;
    courseCompletionBySlug: Record<string, boolean>;
  }>(
    (acc, course) => {
      const normalizedLevelSlug = normalizeCourseLevelSlug(course, fallbackStartLevelSlug);
      if (!normalizedLevelSlug) {
        return acc;
      }

      if (!acc.coursesByLevel[normalizedLevelSlug]) {
        acc.coursesByLevel[normalizedLevelSlug] = [];
      }

      const resolvedSlug = resolveCourseSlug(course);
      const meta = buildCourseMetaSummary(course);
      const summary: LevelCourseSummary = {
        id: course.id,
        slug: resolvedSlug,
        title: resolveTitle(course.title),
        isRequired: course.is_required_in_level !== false,
        isStartCourse: Boolean(course.is_start_course),
        isCompleted: completedCourseIds.has(course.id),
        coverImageUrl: meta.coverImageUrl,
        description: meta.description,
        availableLanguages: meta.availableLanguages,
        modulesCount: meta.modulesCount,
        lessonsCount: meta.lessonsCount,
        totalXp: meta.totalXp,
      };

      acc.coursesByLevel[normalizedLevelSlug].push(summary);
      if (resolvedSlug) {
        acc.courseCompletionBySlug[resolvedSlug] = summary.isCompleted;
      }
      if (course.id) {
        acc.courseCompletionBySlug[course.id] = summary.isCompleted;
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
const LEVEL_SLUG_ALIASES: Record<string, string> = {
  novato: 'cadets',
};
const LEGACY_LEVEL_METADATA: Record<
  string,
  {
    minXp: number;
    maxXp: number | null;
    shortLabel?: string;
  }
> = {
  cadets: { minXp: 0, maxXp: 98, shortLabel: 'Cadete' },
  infantil: { minXp: 99, maxXp: 368, shortLabel: 'Infantil' },
  juveniles: { minXp: 369, maxXp: 999, shortLabel: 'Juvenil' },
  juniors: { minXp: 1000, maxXp: 2221, shortLabel: 'Junior' },
  seniors: { minXp: 2222, maxXp: 3332, shortLabel: 'Sénior' },
  'hall-of-fame': { minXp: 3333, maxXp: 4999, shortLabel: 'Hall da Fama' },
  master: { minXp: 5000, maxXp: 9999, shortLabel: 'Master' },
  legend: { minXp: 10000, maxXp: null, shortLabel: 'Lenda' },
};

function normalizeCourseLevelSlug(
  course: RawCourse,
  fallbackStartLevelSlug: string = START_LEVEL_SLUG,
): string | null {
  const directSlug =
    typeof course.academy_level_slug === 'string'
      ? course.academy_level_slug.trim()
      : '';
  if (directSlug.length > 0) {
    return LEVEL_SLUG_ALIASES[directSlug] || directSlug;
  }

  const metadataSlugRaw =
    typeof course.curriculum?.metadata?.academyLevelSlug === 'string'
      ? course.curriculum.metadata.academyLevelSlug
      : null;

  const metadataSlug = metadataSlugRaw ? metadataSlugRaw.trim() : '';
  if (metadataSlug.length > 0) {
    return LEVEL_SLUG_ALIASES[metadataSlug] || metadataSlug;
  }

  const isStart =
    course.is_start_course ||
    resolveCourseSlug(course) === START_HERE_SLUG ||
    course.id === START_HERE_FALLBACK_ID;

  if (isStart) {
    return fallbackStartLevelSlug || START_LEVEL_SLUG;
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

type CourseMetaSummary = {
  coverImageUrl?: string | null;
  description?: string;
  availableLanguages?: string[];
  modulesCount?: number;
  lessonsCount?: number;
  totalXp?: number;
};

function buildCourseMetaSummary(course: RawCourse): CourseMetaSummary {
  const description = extractCourseDescription(course);
  const coverImageUrl = resolveCourseCoverImage(course);
  const availableLanguages = resolveCourseLanguages(course);
  const structure = summarizeCourseStructure(course);

  return {
    coverImageUrl,
    description,
    availableLanguages,
    modulesCount: structure.modulesCount,
    lessonsCount: structure.lessonsCount,
    totalXp: structure.totalXp,
  };
}

function resolveCourseCoverImage(course: RawCourse): string | null {
  const metadataCover = course.curriculum?.metadata?.coverAsset;
  if (metadataCover && typeof metadataCover === 'object' && typeof metadataCover.url === 'string') {
    return metadataCover.url;
  }
  if (typeof course.curriculum?.metadata?.coverImage === 'string') {
    return course.curriculum.metadata.coverImage;
  }
  if (typeof metadataCover === 'string') {
    return metadataCover;
  }
  if (typeof course.image_url === 'string' && course.image_url.trim().length > 0) {
    return course.image_url;
  }
  if (typeof course.thumbnail_url === 'string' && course.thumbnail_url.trim().length > 0) {
    return course.thumbnail_url;
  }
  if (typeof course.seo?.ogImageUrl === 'string') {
    return course.seo.ogImageUrl;
  }
  if (typeof course.seo?.coverImageUrl === 'string') {
    return course.seo.coverImageUrl;
  }
  return null;
}

function extractCourseDescription(course: RawCourse): string | undefined {
  const rawDescription =
    course.description ||
    course.curriculum?.metadata?.summary ||
    course.curriculum?.metadata?.description;
  const resolved = resolveTitle(rawDescription);
  const clean = stripHtml(resolved);
  return clean.length > 0 ? clean : undefined;
}

function stripHtml(value: string): string {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveCourseLanguages(course: RawCourse): string[] | undefined {
  if (Array.isArray(course.available_languages) && course.available_languages.length > 0) {
    return course.available_languages;
  }
  if (Array.isArray(course.curriculum?.metadata?.availableLanguages)) {
    return course.curriculum.metadata.availableLanguages;
  }
  if (typeof course.primary_language === 'string' && course.primary_language.trim().length > 0) {
    return [course.primary_language];
  }
  return undefined;
}

function summarizeCourseStructure(course: RawCourse): {
  modulesCount?: number;
  lessonsCount?: number;
  totalXp?: number;
} {
  const topics: any[] = Array.isArray(course.curriculum?.topics) ? course.curriculum.topics : [];
  let lessonsCount = 0;
  let lessonsXp = 0;
  let moduleBonus = 0;

  topics.forEach((topic) => {
    const lessons = Array.isArray(topic?.lessons) ? topic.lessons : [];
    lessonsCount += lessons.length;
    lessonsXp += lessons.reduce((sum: number, lesson: any) => sum + getLessonReward(lesson), 0);
    moduleBonus += getModuleBonus(topic);
  });

  const courseBonus = getCourseBonus(course);
  const aggregateXp = lessonsXp + moduleBonus + courseBonus;
  const totalXp =
    aggregateXp > 0
      ? aggregateXp
      : typeof course.xp_reward === 'number'
        ? course.xp_reward
        : typeof course.curriculum?.metadata?.xpReward === 'number'
          ? course.curriculum.metadata.xpReward
          : undefined;

  return {
    modulesCount: topics.length > 0 ? topics.length : undefined,
    lessonsCount: lessonsCount > 0 ? lessonsCount : undefined,
    totalXp,
  };
}

function getLessonReward(lesson: any): number {
  if (!lesson) return 0;
  if (typeof lesson.xp_reward === 'number') return lesson.xp_reward;
  if (typeof lesson.xpReward === 'number') return lesson.xpReward;
  return 0;
}

function getModuleBonus(module: any): number {
  if (!module) return 0;
  if (typeof module.xp_reward === 'number') return module.xp_reward;
  if (typeof module.xpReward === 'number') return module.xpReward;
  if (typeof module.metadata?.xpReward === 'number') return module.metadata.xpReward;
  return 0;
}

function getCourseBonus(course: RawCourse): number {
  if (!course) return 0;
  if (typeof course.xp_reward_on_complete === 'number') return course.xp_reward_on_complete;
  if (typeof course.curriculum?.metadata?.xpReward === 'number') {
    return course.curriculum.metadata.xpReward;
  }
  if (typeof course.xp_reward === 'number') return course.xp_reward;
  return 0;
}

function attachCourseSlug(course: RawCourse): RawCourse {
  if (!course) return course;
  const slug = resolveCourseSlug(course);
  return {
    ...course,
    slug,
  };
}

export function resolveCourseSlug(course: RawCourse): string | null {
  if (!course) return null;

  const rawCandidates = [
    typeof course.slug === 'string' ? course.slug : null,
    typeof course.curriculum?.metadata?.seo?.slug === 'string'
      ? course.curriculum.metadata.seo.slug
      : null,
    typeof course.curriculum?.metadata?.slug === 'string'
      ? course.curriculum.metadata.slug
      : null,
    typeof course.seo?.slug === 'string' ? course.seo.slug : null,
  ];

  for (const candidate of rawCandidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (value.length > 0) {
      return value;
    }
  }

  if (
    course.is_start_course ||
    course.id === START_HERE_FALLBACK_ID ||
    course.curriculum?.metadata?.isStartCourse
  ) {
    return START_HERE_SLUG;
  }

  return course.id || null;
}

function applyLevelFallbacks(levels: RawLevel[]): RawLevel[] {
  return levels.map((level) => {
    const fallback = LEGACY_LEVEL_METADATA[level.slug];
    const defaultLabel =
      fallback?.shortLabel ||
      (level.short_label ||
        (level.slug ? level.slug.charAt(0).toUpperCase() + level.slug.slice(1) : ''));
    const resolvedMin =
      typeof level.min_xp === 'number'
        ? level.min_xp
        : fallback?.minXp ?? null;
    const resolvedMax =
      typeof level.max_xp === 'number'
        ? level.max_xp
        : fallback?.maxXp ?? null;

    const localizedTitle =
      level.title_i18n ||
      (defaultLabel
        ? {
            pt: defaultLabel,
            es: defaultLabel,
            en: defaultLabel,
          }
        : undefined);

    return {
      ...level,
      min_xp: resolvedMin,
      max_xp: resolvedMax,
      short_label:
        level.short_label && level.short_label.trim().length > 0
          ? level.short_label
          : fallback?.shortLabel || level.short_label || null,
      title_i18n: localizedTitle,
    };
  });
}

function isMissingLevelColumnError(error: { message?: string } | null): boolean {
  const message = error?.message;
  if (!message) return false;
  const tokens = ['min_xp', 'max_xp', 'accent_color', 'badge_icon', 'short_label'];
  return tokens.some((token) =>
    message.includes(`column academy_levels.${token} does not exist`),
  );
}

function isMissingCourseColumnError(error: { message?: string } | null): boolean {
  const message = error?.message;
  if (!message) return false;
  const tokens = ['academy_path_order', 'seo', 'is_required_in_level'];
  return tokens.some((token) =>
    message.includes(`column courses.${token} does not exist`),
  );
}
