export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export type TranslatedField = Record<LangCode, string>;

export type BuilderEntityType = 'course' | 'blog';

export type BuilderStepKey = 'basics' | 'curriculum' | 'content' | 'additional';

export interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  title?: string | null;
  alt?: string | null;
  durationSeconds?: number | null;
  sizeBytes?: number | null;
  createdAt?: string | null;
  tags?: string[];
}

export interface Attachment {
  id: string;
  label: string;
  asset: MediaAsset;
  externalUrl?: string | null;
}

export interface XPConfig {
  reward: number;
  threshold: number;
}

export interface ScheduleConfig {
  publishAt?: string | null;
  expireAt?: string | null;
  timezone: 'CET';
  status: 'draft' | 'scheduled' | 'published';
}

export interface SeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string | null;
  keywords: string[];
  slug: string;
}

export interface BuilderStateBase {
  entityType: BuilderEntityType;
  title: TranslatedField;
  slug: string;
  coverImage?: MediaAsset | null;
  longDescription: Record<LangCode, string>;
  xp: XPConfig;
  published: boolean;
  isCompleted: boolean;
  isPaid: boolean;
  overview: string;
  keyTakeaways: string[];
  targetAudience: string[];
  durationMinutes: number;
  bonuses: string[];
  specialRequirements: string[];
  attachments: Attachment[];
  seo: SeoConfig;
  schedule: ScheduleConfig;
  googleIntegrations: {
    searchConsole: boolean;
    analytics: boolean;
    tagManager: boolean;
    pageSpeed: boolean;
    adsense: boolean;
    optimize: boolean;
  };
}

export interface LessonState {
  id: string;
  title: string;
  content: string;
  xpReward?: number | null;
  video?: MediaAsset | null;
  attachments: Attachment[];
  schedule: ScheduleConfig;
}

export interface QuizState {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    choices: string[];
    answerIndex: number;
  }>;
  xpReward?: number | null;
  schedule: ScheduleConfig;
}

export interface TopicState {
  id: string;
  title: string;
  description: string;
  lessons: LessonState[];
  quizzes: QuizState[];
  schedule: ScheduleConfig;
}

export interface CurriculumState {
  topics: TopicState[];
}

export interface CourseBuilderState extends BuilderStateBase {
  entityType: 'course';
  curriculum: CurriculumState;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface BlogBuilderState extends BuilderStateBase {
  entityType: 'blog';
  content: Record<LangCode, string>;
  readingTimeMinutes: number;
  category: string;
  registeredOnly: boolean;
}

export type BuilderState = CourseBuilderState | BlogBuilderState;

export interface BuilderAutosaveState {
  status: 'idle' | 'saving' | 'error';
  lastSavedAt?: string;
  error?: string | null;
}

export interface BuilderPreviewState {
  mode: 'desktop' | 'mobile';
  data: BuilderState;
}
