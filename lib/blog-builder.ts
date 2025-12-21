import {
  LANGUAGES,
  type BlogBuilderState,
  type LangCode,
  type TranslatedField,
} from '@/types/builder';
import { createEmptyTranslations } from './course-builder';

export const createEmptyBlogState = (): BlogBuilderState => ({
  entityType: 'blog',
  title: createEmptyTranslations(),
  slug: '',
  coverImage: null,
  longDescription: createEmptyTranslations(),
  xp: { reward: 15, threshold: 0 },
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
    imageSettings: {
      zoom: 1,
      offsetY: 0,
    },
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
  content: createEmptyTranslations(),
  readingTimeMinutes: 5,
  category: 'General',
  registeredOnly: false,
});

export const buildBlogRequestPayload = (state: BlogBuilderState) => ({
  title: state.title,
  excerpt: state.longDescription,
  content: state.content,
  category: state.category,
  reading_time: state.readingTimeMinutes,
  xp_reward: state.xp.reward,
  xp_threshold: state.xp.threshold,
  published: state.published,
  registered_only: state.registeredOnly,
  image_url: state.coverImage?.url ?? null,
  overview: state.overview,
  key_takeaways: state.keyTakeaways,
  target_audience: state.targetAudience,
  duration_minutes: state.durationMinutes,
  bonuses: state.bonuses,
  special_requirements: state.specialRequirements,
  attachments: state.attachments,
  seo: {
    ...state.seo,
    imageSettings: state.seo.imageSettings ?? { zoom: 1, offsetY: 0 },
  },
  google_integrations: state.googleIntegrations,
  schedule: state.schedule,
});

export const mapBlogToBuilderState = (blog: any): BlogBuilderState => {
  const base = createEmptyBlogState();
  const title = normalizeTranslations(blog?.title);
  const excerpt = normalizeTranslations(blog?.excerpt);
  const content = normalizeTranslations(blog?.content);

  return {
    ...base,
    title,
    longDescription: excerpt,
    content,
    slug: blog?.slug || blog?.id?.toString() || '',
    coverImage: blog?.image_url
      ? {
          id: blog.image_url,
          url: blog.image_url,
          type: 'image',
          thumbnailUrl: blog.image_url,
          title: blog.title?.en || 'Blog cover',
        }
      : null,
    xp: {
      reward:
        typeof blog?.xp_reward === 'number'
          ? blog.xp_reward
          : base.xp.reward,
      threshold:
        typeof blog?.xp_threshold === 'number'
          ? blog.xp_threshold
          : base.xp.threshold,
    },
    published: Boolean(blog?.published),
    isPaid: Boolean(blog?.is_paid),
    overview: blog?.overview || '',
    keyTakeaways: blog?.key_takeaways || [],
    targetAudience: blog?.target_audience || [],
    durationMinutes: blog?.duration_minutes || 0,
    bonuses: blog?.bonuses || [],
    specialRequirements: blog?.special_requirements || [],
    attachments: blog?.attachments || [],
    seo: blog?.seo
      ? {
          ...base.seo,
          ...blog.seo,
          imageSettings: blog.seo.imageSettings ?? base.seo.imageSettings,
        }
      : base.seo,
    googleIntegrations: blog?.google_integrations || base.googleIntegrations,
    schedule: {
      publishAt: blog?.publish_at || null,
      expireAt: blog?.expire_at || null,
      timezone: 'CET',
      status: deriveScheduleStatus(blog),
    },
    readingTimeMinutes: blog?.reading_time || base.readingTimeMinutes,
    category: blog?.category || base.category,
    registeredOnly: Boolean(blog?.registered_only),
  };
};

function deriveScheduleStatus(entity: {
  published?: boolean;
  publish_at?: string | null;
}) {
  if (entity?.published) return 'published';
  if (entity?.publish_at) return 'scheduled';
  return 'draft';
}

function normalizeTranslations(raw: any): TranslatedField {
  const normalized = createEmptyTranslations();
  if (!raw || typeof raw !== 'object') return normalized;
  LANGUAGES.forEach((lang) => {
    normalized[lang.code as LangCode] =
      typeof raw[lang.code] === 'string' ? raw[lang.code] : '';
  });
  return normalized;
}
