import type {
  LessonState,
  QuizState,
  ScheduleConfig,
  TopicState,
} from '@/types/builder';

const CET_SCHEDULE: ScheduleConfig = {
  publishAt: null,
  expireAt: null,
  timezone: 'CET',
  status: 'draft',
};

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

export const createLesson = (overrides?: Partial<LessonState>): LessonState => ({
  id: randomId('lesson'),
  title: 'New lesson',
  content: '',
  xpReward: null,
  video: null,
  attachments: [],
  schedule: cloneSchedule(),
  ...overrides,
});

export const createQuiz = (overrides?: Partial<QuizState>): QuizState => ({
  id: randomId('quiz'),
  title: 'New quiz',
  questions: [],
  xpReward: null,
  schedule: cloneSchedule(),
  ...overrides,
});

export const createTopic = (overrides?: Partial<TopicState>): TopicState => ({
  id: randomId('topic'),
  title: 'Untitled topic',
  description: '',
  lessons: [],
  quizzes: [],
  schedule: cloneSchedule(),
  ...overrides,
});
