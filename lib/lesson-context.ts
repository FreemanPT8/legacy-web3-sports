import { supabase, supabaseAdmin } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;

const resolveNumber = (
  value: unknown,
  fallback: number | null = null,
): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const resolveText = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export type LessonContextModuleLesson = {
  id: string;
  title: unknown;
  order: number;
};

export type LessonContextResult = {
  course: {
    id: string;
    title: unknown;
    author_id: string | null;
    xp_reward?: number | null;
    xp_reward_on_complete?: number | null;
    curriculum: any;
  };
  topic: {
    id: string;
    title: unknown;
    description: unknown;
    author_id: string | null;
    xp_required?: number | null;
    xp_reward?: number | null;
    lessons: any[];
    quizzes?: any[];
  };
  lesson: {
    id: string;
    title: unknown;
    description?: unknown;
    content: unknown;
    content_preview?: string | null;
    author_id: string | null;
    xp_reward?: number | null;
    xp_required?: number | null;
    estimated_time?: number | null;
    estimatedTime?: number | null;
    duration?: number | null;
    order: number;
    module_id: string;
    created_at?: string | null;
  };
  moduleLessons: LessonContextModuleLesson[];
  resolvedAuthorId: string | null;
  resolvedXP: number;
  resolvedEstimatedTime: number;
};

export async function fetchLessonContext(
  lessonId: string,
): Promise<{ context?: LessonContextResult; error?: string }> {
  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, author_id, xp_reward, xp_reward_on_complete, curriculum')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: 'Failed to load courses' };
  }

  let matchedCourse: any = null;
  let matchedTopic: any = null;
  let matchedLesson: any = null;
  let moduleLessons: LessonContextModuleLesson[] = [];

  (courses || []).some((course: any) => {
    const topics: any[] = Array.isArray(course?.curriculum?.topics)
      ? course.curriculum.topics
      : [];

    for (let topicIndex = 0; topicIndex < topics.length; topicIndex += 1) {
      const topic = topics[topicIndex];
      const topicId = topic?.id || `topic-${topicIndex + 1}`;
      const lessons = Array.isArray(topic?.lessons) ? topic.lessons : [];

      moduleLessons = lessons.map(
        (lesson: any, idx: number): LessonContextModuleLesson => ({
          id: lesson?.id || `${topicId}-lesson-${idx + 1}`,
          title: lesson?.title,
          order:
            typeof lesson?.order === 'number' && Number.isFinite(lesson.order)
              ? lesson.order
              : idx + 1,
        }),
      );

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lesson = lessons[lessonIndex];

        if (lesson?.id === lessonId) {
          matchedCourse = course;
          matchedTopic = {
            ...topic,
            id: topicId,
          };
          matchedLesson = {
            ...lesson,
            module_id: topicId,
            order:
              typeof lesson?.order === 'number' && Number.isFinite(lesson.order)
                ? lesson.order
                : lessonIndex + 1,
          };
          return true;
        }
      }
    }

    return false;
  });

  if (!matchedCourse || !matchedLesson) {
    return { error: 'Lesson not found' };
  }

  const resolvedAuthorId =
    resolveText(matchedLesson.author_id) ||
    resolveText(matchedTopic?.author_id) ||
    resolveText(matchedCourse.author_id) ||
    null;

  const candidateXPValues = [
    matchedLesson?.xp_reward,
    matchedLesson?.xpReward,
    matchedLesson?.xp?.reward,
    matchedTopic?.xp_reward,
    matchedTopic?.xpReward,
    matchedTopic?.metadata?.xpReward,
    matchedCourse?.curriculum?.metadata?.xpReward,
    matchedCourse?.xp_reward,
    matchedCourse?.xp_reward_on_complete,
  ];

  let resolvedXP = 0;
  for (const candidate of candidateXPValues) {
    const normalized = resolveNumber(candidate);
    if (typeof normalized === 'number') {
      resolvedXP = normalized;
      break;
    }
  }

  const resolvedEstimatedTime =
    resolveNumber(matchedLesson?.estimated_time) ??
    resolveNumber(matchedLesson?.estimatedTime) ??
    resolveNumber(matchedLesson?.duration) ??
    10;

  const context: LessonContextResult = {
    course: {
      id: matchedCourse.id,
      title: matchedCourse.title,
      author_id: resolveText(matchedCourse.author_id),
      xp_reward: matchedCourse?.xp_reward,
      xp_reward_on_complete: matchedCourse?.xp_reward_on_complete,
      curriculum: matchedCourse.curriculum,
    },
    topic: {
      id: matchedTopic?.id,
      title: matchedTopic?.title,
      description: matchedTopic?.description,
      author_id: resolveText(matchedTopic?.author_id) || null,
      xp_required: resolveNumber(matchedTopic?.xp_required),
      xp_reward: resolveNumber(matchedTopic?.xp_reward),
      lessons: matchedTopic?.lessons || [],
      quizzes: matchedTopic?.quizzes || [],
    },
    lesson: matchedLesson,
    moduleLessons,
    resolvedAuthorId,
    resolvedXP,
    resolvedEstimatedTime:
      typeof resolvedEstimatedTime === 'number' ? resolvedEstimatedTime : 10,
  };

  return { context };
}
