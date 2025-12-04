import { LANGUAGES, type CourseBuilderState, type TranslatedField } from '@/types/builder';

export const createEmptyTranslations = (): TranslatedField =>
  LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang.code]: '' }),
    {} as TranslatedField,
  );

export const createEmptyCourseState = (): CourseBuilderState => ({
  entityType: 'course',
  title: createEmptyTranslations(),
  slug: '',
  coverImage: null,
  longDescription: createEmptyTranslations(),
  xp: { reward: 0, threshold: 0 },
  published: false,
  isCompleted: false,
  isPaid: false,
  overview: '',
  keyTakeaways: [],
  targetAudience: [],
  durationMinutes: 0,
  bonuses: [],
  specialRequirements: [],
  attachments: [],
  seo: {
    metaTitle: '',
    metaDescription: '',
    ogImageUrl: null,
    keywords: [],
    slug: '',
  },
  schedule: {
    publishAt: null,
    expireAt: null,
    timezone: 'CET',
    status: 'draft',
  },
  googleIntegrations: {
    searchConsole: false,
    analytics: false,
    tagManager: false,
    pageSpeed: false,
    adsense: false,
    optimize: false,
  },
  curriculum: {
    topics: [],
  },
  level: 'beginner',
});

export const buildCourseRequestPayload = (state: CourseBuilderState) => ({
  title: state.title,
  description: state.longDescription,
  level: state.level,
  xp_threshold: state.xp.threshold,
  xp_reward: state.xp.reward,
  image_url: state.coverImage?.url ?? null,
  published: state.published,
  is_completed: state.isCompleted,
  is_paid: state.isPaid,
  schedule: state.schedule,
  overview: state.overview,
  key_takeaways: state.keyTakeaways,
  target_audience: state.targetAudience,
  duration_minutes: state.durationMinutes,
  bonuses: state.bonuses,
  special_requirements: state.specialRequirements,
  attachments: state.attachments,
  seo: state.seo,
  google_integrations: state.googleIntegrations,
  curriculum: state.curriculum,
});

export const mapCourseToBuilderState = (course: any): CourseBuilderState => {
  const base = createEmptyCourseState();
  const title = normalizeTranslations(course?.title);
  const description = normalizeTranslations(course?.description);

  return {
    ...base,
    title,
    slug: course?.slug || course?.id?.toString() || '',
    coverImage: course?.image_url
      ? {
          id: course.image_url,
          url: course.image_url,
          thumbnailUrl: course.image_url,
          type: 'image',
          title: course.title?.en || 'Course cover',
        }
      : null,
    longDescription: description,
    xp: {
      reward:
        typeof course?.xp_reward === 'number' ? course.xp_reward : base.xp.reward,
      threshold:
        typeof course?.xp_threshold === 'number'
          ? course.xp_threshold
          : base.xp.threshold,
    },
    published: Boolean(course?.published),
    isCompleted: Boolean(course?.is_completed),
    isPaid: Boolean(course?.is_paid),
    overview: course?.overview || '',
    keyTakeaways: Array.isArray(course?.key_takeaways)
      ? course.key_takeaways
      : base.keyTakeaways,
    targetAudience: Array.isArray(course?.target_audience)
      ? course.target_audience
      : base.targetAudience,
    durationMinutes: course?.duration_minutes || 0,
    bonuses: Array.isArray(course?.bonuses) ? course.bonuses : base.bonuses,
    specialRequirements: Array.isArray(course?.special_requirements)
      ? course.special_requirements
      : base.specialRequirements,
    attachments: Array.isArray(course?.attachments)
      ? course.attachments
      : base.attachments,
    seo: course?.seo || base.seo,
    schedule: {
      publishAt: course?.publish_at || null,
      expireAt: course?.expire_at || null,
      timezone: 'CET',
      status: deriveScheduleStatus(course),
    },
    googleIntegrations:
      course?.google_integrations || base.googleIntegrations,
    curriculum: course?.curriculum || base.curriculum,
    level: course?.level || 'beginner',
  };
};

export const normalizeTranslations = (raw: any): TranslatedField => {
  const normalized = createEmptyTranslations();
  if (!raw || typeof raw !== 'object') return normalized;
  LANGUAGES.forEach((lang) => {
    normalized[lang.code] =
      typeof raw[lang.code] === 'string' ? raw[lang.code] : '';
  });
  return normalized;
};

const deriveScheduleStatus = (entity: {
  published?: boolean;
  publish_at?: string | null;
}) => {
  if (entity?.published) return 'published';
  if (entity?.publish_at) return 'scheduled';
  return 'draft';
};
