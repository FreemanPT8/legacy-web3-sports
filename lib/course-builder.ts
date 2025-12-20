import {
  LANGUAGES,
  type CourseBuilderState,
  type TranslatedField,
} from '@/types/builder';

export const createEmptyTranslations = (): TranslatedField =>
  LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang.code]: '' }),
    {} as TranslatedField,
  );

const ensureTranslatedField = (raw: any): TranslatedField => {
  const base = createEmptyTranslations();
  if (!raw) {
    return base;
  }
  if (typeof raw === 'string') {
    LANGUAGES.forEach((lang) => {
      base[lang.code] = raw;
    });
    return base;
  }
  LANGUAGES.forEach((lang) => {
    const value = raw[lang.code];
    base[lang.code] = typeof value === 'string' ? value : '';
  });
  return base;
};

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

const buildCurriculumMetadata = (state: CourseBuilderState) => ({
  overview: state.overview,
  keyTakeaways: state.keyTakeaways,
  targetAudience: state.targetAudience,
  durationMinutes: state.durationMinutes,
  bonuses: state.bonuses,
  specialRequirements: state.specialRequirements,
  seo: state.seo,
  googleIntegrations: state.googleIntegrations,
  xpReward: state.xp.reward,
  xpThreshold: state.xp.threshold,
  level: state.level,
  coverAsset: state.coverImage,
  isCompleted: state.isCompleted,
  isPaid: state.isPaid,
  schedule: state.schedule,
  attachments: state.attachments,
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
  special_requirements: state.specialRequirements,
  seo: state.seo,
  google_integrations: state.googleIntegrations,
  cover_asset: state.coverImage,
  curriculum: {
    ...state.curriculum,
    attachments: state.attachments,
    metadata: buildCurriculumMetadata(state),
  },
});

export const mapCourseToBuilderState = (course: any): CourseBuilderState => {
  const base = createEmptyCourseState();
  const title = normalizeTranslations(course?.title);
  const description = normalizeTranslations(course?.description);
  const rawCurriculum =
    course?.curriculum && typeof course.curriculum === 'object'
      ? course.curriculum
      : base.curriculum;
  const curriculumAttachments = Array.isArray(rawCurriculum?.attachments)
    ? rawCurriculum.attachments
    : base.attachments;
  const {
    attachments: _removed,
    metadata: rawMetadata,
    ...curriculumWithoutAttachments
  } = (rawCurriculum || {}) as Record<string, any>;
  const metadata =
    rawMetadata && typeof rawMetadata === 'object' ? rawMetadata : {};
  const metadataAttachments = Array.isArray(metadata.attachments)
    ? metadata.attachments
    : base.attachments;
  const normalizedCurriculum =
    curriculumWithoutAttachments?.topics &&
    Array.isArray(curriculumWithoutAttachments.topics)
      ? {
          ...curriculumWithoutAttachments,
          topics: curriculumWithoutAttachments.topics.map((topic: any) => {
            const normalizedLessons = Array.isArray(topic?.lessons)
              ? topic.lessons.map((lesson: any) => ({
                  ...lesson,
                  title: ensureTranslatedField(lesson?.title),
                  content: ensureTranslatedField(lesson?.content),
                  xp_required:
                    typeof lesson?.xp_required === 'number'
                      ? lesson.xp_required
                      : null,
                  estimated_time:
                    typeof lesson?.estimated_time === 'number'
                      ? lesson.estimated_time
                      : 10,
                }))
              : [];

            const normalizedQuizzes = Array.isArray(topic?.quizzes)
              ? topic.quizzes.map((quiz: any) => ({
                  ...quiz,
                  title: ensureTranslatedField(quiz?.title),
                }))
              : [];

            return {
              ...topic,
              title: ensureTranslatedField(topic?.title),
              description: ensureTranslatedField(topic?.description),
              xp_required:
                typeof topic?.xp_required === 'number'
                  ? topic.xp_required
                  : null,
              lessons: normalizedLessons,
              quizzes: normalizedQuizzes,
            };
          }),
        }
      : base.curriculum;
  const attachmentsSource =
    Array.isArray(course?.attachments) && course.attachments.length > 0
      ? course.attachments
      : curriculumAttachments.length > 0
        ? curriculumAttachments
        : metadataAttachments;
  const arrayOr = (value: any, fallback: string[]) =>
    Array.isArray(value) ? value : fallback;
  const stringOr = (value: any, fallback = '') =>
    typeof value === 'string' ? value : fallback;
  const numberOr = (value: any, fallback = 0) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const booleanOr = (value: any, fallback = false) =>
    typeof value === 'boolean' ? value : fallback;
  const scheduleFromMetadata =
    metadata && typeof metadata.schedule === 'object'
      ? metadata.schedule
      : null;
  const coverAsset =
    metadata && metadata.coverAsset ? metadata.coverAsset : null;
  const metadataSeo =
    metadata && typeof metadata.seo === 'object' ? metadata.seo : null;
  const metadataGoogle =
    metadata && typeof metadata.googleIntegrations === 'object'
      ? metadata.googleIntegrations
      : null;
  const derivedPublishAt =
    course?.publish_at ?? scheduleFromMetadata?.publishAt ?? null;
  const derivedExpireAt =
    course?.expire_at ?? scheduleFromMetadata?.expireAt ?? null;
  const derivedStatus = deriveScheduleStatus({
    published: course?.published,
    publish_at: derivedPublishAt,
  });

  const mappedState: CourseBuilderState = {
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
      : coverAsset || null,
    longDescription: description,
    xp: {
      reward:
        typeof course?.xp_reward === 'number'
          ? course.xp_reward
          : numberOr(metadata?.xpReward, base.xp.reward),
      threshold:
        typeof course?.xp_threshold === 'number'
          ? course.xp_threshold
          : numberOr(metadata?.xpThreshold, base.xp.threshold),
    },
    published: Boolean(course?.published),
    isCompleted: booleanOr(
      course?.is_completed,
      booleanOr(metadata?.isCompleted, base.isCompleted),
    ),
    isPaid: booleanOr(course?.is_paid, booleanOr(metadata?.isPaid, base.isPaid)),
    overview:
      stringOr(course?.overview) || stringOr(metadata?.overview, base.overview),
    keyTakeaways: Array.isArray(course?.key_takeaways)
      ? course.key_takeaways
      : arrayOr(metadata?.keyTakeaways, base.keyTakeaways),
    targetAudience: Array.isArray(course?.target_audience)
      ? course.target_audience
      : arrayOr(metadata?.targetAudience, base.targetAudience),
    durationMinutes:
      typeof course?.duration_minutes === 'number'
        ? course.duration_minutes
        : numberOr(metadata?.durationMinutes, base.durationMinutes),
    bonuses: Array.isArray(course?.bonuses)
      ? course.bonuses
      : arrayOr(metadata?.bonuses, base.bonuses),
    specialRequirements: Array.isArray(course?.special_requirements)
      ? course.special_requirements
      : arrayOr(metadata?.specialRequirements, base.specialRequirements),
    seo: course?.seo || metadataSeo || base.seo,
    schedule: {
      publishAt: derivedPublishAt,
      expireAt: derivedExpireAt,
      timezone: scheduleFromMetadata?.timezone || 'CET',
      status: scheduleFromMetadata?.status || derivedStatus,
    },
    googleIntegrations:
      course?.google_integrations || metadataGoogle || base.googleIntegrations,
    curriculum: normalizedCurriculum,
    attachments: attachmentsSource,
    level: course?.level || metadata?.level || 'beginner',
  };
  return ensureCurriculumTranslations(mappedState);
};

export const ensureCurriculumTranslations = (
  state: CourseBuilderState,
): CourseBuilderState => {
  const normalizedTopics = state.curriculum.topics.map((topic) => ({
    ...topic,
    title: ensureTranslatedField(topic.title),
    description: ensureTranslatedField(topic.description),
    lessons: topic.lessons.map((lesson) => ({
      ...lesson,
      title: ensureTranslatedField(lesson.title),
      content: ensureTranslatedField(lesson.content),
      xp_required:
        typeof lesson.xp_required === 'number' ? lesson.xp_required : null,
    })),
    quizzes: (topic.quizzes || []).map((quiz) => ({
      ...quiz,
      title: ensureTranslatedField(quiz.title),
    })),
  }));

  return {
    ...state,
    curriculum: {
      ...state.curriculum,
      topics: normalizedTopics,
    },
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
