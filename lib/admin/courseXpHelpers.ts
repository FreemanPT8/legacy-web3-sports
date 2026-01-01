import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildLessonIdVariants,
  normalizeLessonIdForStorage,
} from '@/lib/lesson-id';

type JsonLike = string | Record<string, any> | null | undefined;

export type CourseLike = {
  id: string;
  curriculum?: {
    topics?: any[];
  };
};

export type LessonMeta = {
  courseId: string;
  lessonId: string;
  normalizedId: string;
  lessonTitle: string;
  moduleTitle: string | null;
};

export type LessonCompletionEntry = {
  lesson_id: string;
  xp_earned: number | null;
  user_id: string;
  completed_at: string;
};

export type CourseCompletionEntry = {
  course_id: string;
  xp_earned: number | null;
  user_id: string;
  completed_at: string;
};

const LANGUAGE_PRIORITY = ['pt', 'en', 'es', 'fr', 'it', 'de'];

export function resolveMultilingualText(value: JsonLike): string {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    for (const key of LANGUAGE_PRIORITY) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
  }
  return '';
}

export function extractLessonContext(courses: CourseLike[]) {
  const lessonIdSet = new Set<string>();
  const lessonToCourse: Record<string, string> = {};
  const lessonMeta: Record<string, LessonMeta> = {};

  courses.forEach((course) => {
    const topics: any[] = Array.isArray(course.curriculum?.topics)
      ? course.curriculum!.topics || []
      : [];

    topics.forEach((topic: any, topicIndex: number) => {
      const moduleId = topic?.id || `topic-${topicIndex + 1}`;
      const moduleTitle =
        resolveMultilingualText(topic?.title) || `Tópico ${topicIndex + 1}`;
      const lessons: any[] = Array.isArray(topic?.lessons)
        ? topic.lessons
        : [];

      lessons.forEach((lesson: any, lessonIndex: number) => {
        const lessonId =
          lesson?.id || `${moduleId}-lesson-${lessonIndex + 1}`;
        const normalizedId =
          normalizeLessonIdForStorage(lessonId) || lessonId;
        const lessonTitle =
          resolveMultilingualText(lesson?.title) ||
          `Lição ${lessonIndex + 1}`;

        const meta: LessonMeta = {
          courseId: course.id,
          lessonId,
          normalizedId,
          lessonTitle,
          moduleTitle: moduleTitle || null,
        };

        const registerVariant = (variant?: string | null) => {
          if (!variant) return;
          const key = variant.trim();
          if (!key) return;
          lessonIdSet.add(key);
          lessonToCourse[key] = course.id;
          lessonMeta[key] = meta;
        };

        registerVariant(lessonId);
        registerVariant(normalizedId);
        buildLessonIdVariants(lessonId).forEach(registerVariant);
      });
    });
  });

  return {
    lessonIds: Array.from(lessonIdSet),
    lessonToCourse,
    lessonMeta,
  };
}

export async function fetchCourseXpData(
  db: SupabaseClient,
  courseIds: string[],
  lessonIds: string[],
  lessonCourseLookup: Record<string, string>,
) {
  const xpByCourse: Record<string, number> = {};
  const completionCountMap: Record<string, number> = {};
  let lessonCompletions: LessonCompletionEntry[] = [];
  let courseCompletions: CourseCompletionEntry[] = [];

  if (lessonIds.length > 0) {
    const { data, error } = await db
      .from('lesson_completions')
      .select('lesson_id, xp_earned, user_id, completed_at')
      .in('lesson_id', lessonIds);

    if (error) {
      throw new Error('Failed to load lesson completions');
    }

    lessonCompletions = data || [];

    lessonCompletions.forEach((row) => {
      const lessonId = row.lesson_id;
      const normalized = normalizeLessonIdForStorage(lessonId) || lessonId;
      const courseId =
        lessonCourseLookup[lessonId] || lessonCourseLookup[normalized];
      if (!courseId) return;
      const xp = Number(row.xp_earned) || 0;
      xpByCourse[courseId] = (xpByCourse[courseId] || 0) + xp;
    });
  }

  if (courseIds.length > 0) {
    const { data, error } = await db
      .from('course_completions')
      .select('course_id, xp_earned, user_id, completed_at')
      .in('course_id', courseIds);

    if (error) {
      throw new Error('Failed to load course completions');
    }

    courseCompletions = data || [];

    courseCompletions.forEach((row) => {
      const courseId = row.course_id;
      if (!courseId) return;
      const xp = Number(row.xp_earned) || 0;
      xpByCourse[courseId] = (xpByCourse[courseId] || 0) + xp;
      completionCountMap[courseId] = (completionCountMap[courseId] || 0) + 1;
    });
  }

  return {
    xpByCourse,
    completionCountMap,
    lessonCompletions,
    courseCompletions,
  };
}
