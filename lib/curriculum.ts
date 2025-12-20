import type {
  LangCode,
  LessonState,
  QuizState,
  ScheduleConfig,
  TopicState,
  TranslatedField,
} from '@/types/builder';
import { LANGUAGES } from '@/types/builder';

const CET_SCHEDULE: ScheduleConfig = {
  publishAt: null,
  expireAt: null,
  timezone: 'CET',
  status: 'draft',
};

const createBlankTranslations = (): TranslatedField =>
  LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code as LangCode] = '';
      return acc;
    },
    {} as TranslatedField,
  );

const randomId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

const cloneSchedule = (overrides?: Partial<ScheduleConfig>): ScheduleConfig => ({
  ...CET_SCHEDULE,
  ...overrides,
});

export const createLesson = (
  overrides?: Partial<LessonState>,
): LessonState => ({
  id: randomId('lesson'),
  title: createBlankTranslations(),
  content: createBlankTranslations(),
  xpReward: null,
  xp_required: null,
  estimated_time: 10,
  video: null,
  attachments: [],
  schedule: cloneSchedule(),
  ...overrides,
});

export const createQuiz = (overrides?: Partial<QuizState>): QuizState => ({
  id: randomId('quiz'),
  title: createBlankTranslations(),
  questions: [],
  xpReward: null,
  schedule: cloneSchedule(),
  ...overrides,
});

export const createTopic = (overrides?: Partial<TopicState>): TopicState => ({
  id: randomId('topic'),
  title: createBlankTranslations(),
  description: createBlankTranslations(),
  xp_required: null,
  lessons: [],
  quizzes: [],
  schedule: cloneSchedule(),
  ...overrides,
});
