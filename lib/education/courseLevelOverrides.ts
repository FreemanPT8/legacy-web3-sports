import { START_HERE_FALLBACK_ID, START_HERE_SLUG } from '@/lib/education/unlockLogic';

const COURSE_LEVEL_OVERRIDES_BY_ID: Record<string, string> = {
  [START_HERE_FALLBACK_ID]: 'cadets',
  '416b0b74-ec44-4aea-be62-50c3ee60af29': 'infantil',
};

const COURSE_LEVEL_OVERRIDES_BY_SLUG: Record<string, string> = {
  [START_HERE_SLUG]: 'cadets',
  '416b0b74-ec44-4aea-be62-50c3ee60af29': 'infantil',
};

type CourseLike = {
  id?: string | null;
  slug?: string | null;
};

export function resolveCourseLevelOverride(course?: CourseLike | null): string | undefined {
  if (!course) return undefined;
  const idKey = typeof course.id === 'string' ? course.id : undefined;
  const slugKey =
    typeof course.slug === 'string' && course.slug.length > 0
      ? course.slug.toLowerCase()
      : undefined;

  return (
    (idKey && COURSE_LEVEL_OVERRIDES_BY_ID[idKey]) ||
    (slugKey && COURSE_LEVEL_OVERRIDES_BY_SLUG[slugKey])
  );
}

export type CourseLevelOverride = ReturnType<typeof resolveCourseLevelOverride>;
