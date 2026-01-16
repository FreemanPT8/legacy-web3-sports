import { supabaseAdmin } from '../lib/supabase';
import {
  extractLessonContext,
  type CourseLike,
} from '../lib/admin/courseXpHelpers';
import { normalizeLessonIdForStorage } from '../lib/lesson-id';

type CompletionRow = {
  user_id: string;
  lesson_id: string | null;
  course_id: string | null;
};

const CHUNK_SIZE = 800;

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const run = async () => {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured.');
  }

  const { data: courses, error: coursesError } = await supabaseAdmin
    .from('courses')
    .select('id, curriculum');

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  const safeCourses = (courses || []) as CourseLike[];
  if (safeCourses.length === 0) {
    console.log('No courses found.');
    return;
  }

  const { lessonIds, lessonMeta, lessonToCourse } =
    extractLessonContext(safeCourses);

  const requiredByCourse = new Map<string, Set<string>>();
  Object.values(lessonMeta).forEach((meta) => {
    if (!meta?.courseId || !meta?.normalizedId) return;
    const set = requiredByCourse.get(meta.courseId) ?? new Set<string>();
    set.add(meta.normalizedId);
    requiredByCourse.set(meta.courseId, set);
  });

  if (lessonIds.length === 0) {
    console.log('No lessons found in course curricula.');
    return;
  }

  const completions: CompletionRow[] = [];
  for (const chunk of chunkArray(lessonIds, CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from('lesson_completions')
      .select('user_id, lesson_id, course_id')
      .in('lesson_id', chunk);

    if (error) {
      throw new Error(`Failed to load lesson completions: ${error.message}`);
    }

    completions.push(...((data || []) as CompletionRow[]));
  }

  const completedByCourseUser = new Map<string, Map<string, Set<string>>>();

  completions.forEach((row) => {
    if (!row.user_id || !row.lesson_id) return;
    const normalized =
      normalizeLessonIdForStorage(row.lesson_id) || row.lesson_id;
    const courseId =
      row.course_id ||
      lessonToCourse[row.lesson_id] ||
      lessonToCourse[normalized];
    if (!courseId) return;

    const userMap =
      completedByCourseUser.get(courseId) ?? new Map<string, Set<string>>();
    const lessonSet = userMap.get(row.user_id) ?? new Set<string>();
    lessonSet.add(normalized);
    userMap.set(row.user_id, lessonSet);
    completedByCourseUser.set(courseId, userMap);
  });

  const rowsToInsert: Array<{ user_id: string; course_id: string; xp_earned: number }> =
    [];

  completedByCourseUser.forEach((userMap, courseId) => {
    const required = requiredByCourse.get(courseId);
    if (!required || required.size === 0) return;
    userMap.forEach((lessonSet, userId) => {
      if (lessonSet.size >= required.size) {
        rowsToInsert.push({
          user_id: userId,
          course_id: courseId,
          xp_earned: 0,
        });
      }
    });
  });

  if (rowsToInsert.length === 0) {
    console.log('No course completions to backfill.');
    return;
  }

  for (const chunk of chunkArray(rowsToInsert, 500)) {
    const { error } = await supabaseAdmin
      .from('course_completions')
      .upsert(chunk, { onConflict: 'user_id,course_id' });
    if (error) {
      throw new Error(`Failed to upsert course completions: ${error.message}`);
    }
  }

  console.log(`Backfilled course_completions: ${rowsToInsert.length}`);
};

run().catch((error) => {
  console.error('[backfill_course_completions] failed', error);
  process.exit(1);
});
