'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  BookOpenCheck,
  ListChecks,
  CalendarClock,
  Eye,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

import { useBuilderState } from '@/hooks/useBuilderState';
import {
  LANGUAGES,
  type CourseBuilderState,
  type LangCode,
  type ScheduleConfig,
  type TranslatedField,
} from '@/types/builder';
import { createEmptyTranslations } from '@/lib/course-builder';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useScheduleCET } from '@/hooks/useScheduleCET';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createLesson, createQuiz, createTopic } from '@/lib/curriculum';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import type {
  LessonState,
  TopicState,
  MediaAsset,
  QuizState,
} from '@/types/builder';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ScheduleUtils = ReturnType<typeof useScheduleCET>;
type DragListenerMap = ReturnType<typeof useSortable>['listeners'];
const SCHEDULE_PANEL_CLASSES =
  'rounded-xl border border-white/10 bg-[#031824]/80 p-3 shadow-sm';

const emptyTranslations = () => createEmptyTranslations();

const getTranslationValue = (
  field: TranslatedField | undefined,
  lang: LangCode,
) => (field ?? emptyTranslations())[lang] ?? '';

const setTranslationValue = (
  field: TranslatedField | undefined,
  lang: LangCode,
  value: string,
) => ({
  ...(field ?? emptyTranslations()),
  [lang]: value,
});

const getAnyTranslation = (field: TranslatedField | undefined) =>
  field ? Object.values(field).find((value) => value.trim().length) || '' : '';

export function CurriculumStep() {
  const { state, updateState, activeLanguage, setActiveLanguage } =
    useBuilderState();
  const { translate, isTranslating } = useAutoTranslate();
  const { toast } = useToast();
  const courseState = state as CourseBuilderState;
  const topics = courseState.curriculum.topics;
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const lessonLibrary = useMediaLibrary();
  const [mediaPicker, setMediaPicker] = useState<{
    topicId: string;
    lessonId: string;
    mode: 'video' | 'attachment';
  } | null>(null);
  const scheduleUtils = useScheduleCET();
  const [translatingTopicId, setTranslatingTopicId] = useState<string | null>(
    null,
  );
  const [translatingLessonId, setTranslatingLessonId] = useState<
    string | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const availableLanguages = LANGUAGES.map((lang) => lang.code as LangCode);

  const getMissingLanguages = useCallback(
    (selector: (code: LangCode) => string) =>
      availableLanguages.filter(
        (code) => code !== activeLanguage && !selector(code).trim(),
      ),
    [availableLanguages, activeLanguage],
  );

  const updateTopics = useCallback(
    (updater: (current: TopicState[]) => TopicState[]) => {
      updateState((prev) => {
        if (prev.entityType !== 'course') {
          return prev;
        }
        const course = prev as CourseBuilderState;
        const nextTopics = updater(course.curriculum.topics);
        return {
          ...course,
          curriculum: {
            ...course.curriculum,
            topics: nextTopics,
          },
        };
      });
    },
    [updateState],
  );

  const updateTopicSchedule = useCallback(
    (topicId: string, schedule: ScheduleConfig) => {
      updateTopics((current) =>
        current.map((topic) =>
          topic.id === topicId ? { ...topic, schedule } : topic,
        ),
      );
    },
    [updateTopics],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    updateTopics((current) => {
      const oldIndex = current.findIndex((topic) => topic.id === active.id);
      const newIndex = current.findIndex((topic) => topic.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const addTopic = () => {
    updateTopics((current) => [...current, createTopic()]);
  };

  const removeTopic = (topicId: string) => {
    updateTopics((current) => current.filter((topic) => topic.id !== topicId));
  };

  const updateTopicTitle = (
    topicId: string,
    lang: LangCode,
    value: string,
  ) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              title: setTranslationValue(topic.title, lang, value),
            }
          : topic,
      ),
    );
  };

  const updateTopicDescription = (
    topicId: string,
    lang: LangCode,
    value: string,
  ) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              description: setTranslationValue(topic.description, lang, value),
            }
          : topic,
      ),
    );
  };

  const updateTopicXpRequired = (topicId: string, value: number) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              xp_required: value,
            }
          : topic,
      ),
    );
  };

  const addLesson = (topicId: string) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? { ...topic, lessons: [...topic.lessons, createLesson()] }
          : topic,
      ),
    );
  };

  const addQuiz = (topicId: string) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? { ...topic, quizzes: [...topic.quizzes, createQuiz()] }
          : topic,
      ),
    );
  };

  const removeQuiz = (topicId: string, quizId: string) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              quizzes: topic.quizzes.filter((quiz) => quiz.id !== quizId),
            }
          : topic,
      ),
    );
  };

  const updateQuiz = (
    topicId: string,
    quizId: string,
    updater: (quiz: QuizState) => QuizState,
  ) => {
    updateTopics((current) =>
      current.map((topic) => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          quizzes: topic.quizzes.map((quiz) =>
            quiz.id === quizId ? updater(quiz) : quiz,
          ),
        };
      }),
    );
  };

  const mergeTranslations = (
    existing: TranslatedField | undefined,
    translations: Record<string, string>,
  ): TranslatedField => ({
    ...(existing ?? emptyTranslations()),
    ...translations,
  });

  const translateTopicFields = async (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    const titleSource = getTranslationValue(topic.title, activeLanguage).trim();
    const descriptionSource = getTranslationValue(
      topic.description,
      activeLanguage,
    ).trim();

    if (!titleSource && !descriptionSource) {
      toast({
        title: 'Nada para traduzir',
        description:
          'Preenche título ou descrição nesta língua antes de traduzir.',
        variant: 'destructive',
      });
      return;
    }

    setTranslatingTopicId(topicId);
    try {
      let translatedSomething = false;
      if (titleSource) {
        const titleTargets = getMissingLanguages((code) =>
          getTranslationValue(topic.title, code),
        );
        if (titleTargets.length === 0) {
          toast({
            title: 'Sem destinos para o título',
            description: 'Todas as línguas já possuem título.',
          });
        } else {
        const translations = await translate(
          titleSource,
          activeLanguage,
            titleTargets,
        );
        updateTopics((current) =>
          current.map((item) =>
            item.id === topicId
              ? {
                  ...item,
                  title: mergeTranslations(item.title, translations),
                }
              : item,
          ),
        );
          translatedSomething = true;
        }
      }

      if (descriptionSource) {
        const descriptionTargets = getMissingLanguages((code) =>
          getTranslationValue(topic.description, code),
        );
        if (descriptionTargets.length === 0) {
          toast({
            title: 'Sem destinos para a descrição',
            description: 'Todas as línguas já possuem descrição.',
          });
        } else {
        const translations = await translate(
          descriptionSource,
          activeLanguage,
            descriptionTargets,
        );
        updateTopics((current) =>
          current.map((item) =>
            item.id === topicId
              ? {
                  ...item,
                  description: mergeTranslations(item.description, translations),
                }
              : item,
          ),
        );
          translatedSomething = true;
        }
      }

      if (translatedSomething) {
        toast({
          title: 'Traduções atualizadas',
          description: 'Este tópico foi sincronizado nas línguas em falta.',
        });
      } else {
        toast({
          title: 'Nenhuma língua precisava de tradução',
          description: 'Todos os campos já estavam preenchidos.',
        });
      }
    } catch (error) {
      console.error('Topic translation error:', error);
      toast({
        title: 'Erro na tradução',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível traduzir o tópico.',
        variant: 'destructive',
      });
    } finally {
      setTranslatingTopicId(null);
    }
  };

  const translateLessonFields = async (topicId: string, lessonId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    const lesson = topic?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const titleSource = getTranslationValue(lesson.title, activeLanguage).trim();
    const contentSource = getTranslationValue(
      lesson.content,
      activeLanguage,
    ).trim();

    if (!titleSource && !contentSource) {
      toast({
        title: 'Nada para traduzir',
        description:
          'Escreve o título ou conteúdo desta lição antes de traduzir.',
        variant: 'destructive',
      });
      return;
    }

    setTranslatingLessonId(lessonId);
    try {
      let translatedSomething = false;

      if (titleSource) {
        const titleTargets = getMissingLanguages((code) =>
          getTranslationValue(lesson.title, code),
        );
        if (titleTargets.length === 0) {
          toast({
            title: 'Sem destinos para o título',
            description: 'Todas as línguas já possuem título.',
          });
        } else {
        const translations = await translate(
          titleSource,
          activeLanguage,
            titleTargets,
        );
        updateLesson(topicId, lessonId, (prev) => ({
          ...prev,
          title: mergeTranslations(prev.title, translations),
        }));
          translatedSomething = true;
        }
      }

      if (contentSource) {
        const contentTargets = getMissingLanguages((code) =>
          getTranslationValue(lesson.content, code),
        );
        if (contentTargets.length === 0) {
          toast({
            title: 'Sem destinos para o conteúdo',
            description: 'Todas as línguas já possuem conteúdo.',
          });
        } else {
        const translations = await translate(
          contentSource,
          activeLanguage,
            contentTargets,
        );
        updateLesson(topicId, lessonId, (prev) => ({
          ...prev,
          content: mergeTranslations(prev.content, translations),
        }));
          translatedSomething = true;
        }
      }

      if (translatedSomething) {
        toast({
          title: 'Lição traduzida',
          description: 'Atualizámos esta lição nas línguas em falta.',
        });
      } else {
        toast({
          title: 'Nenhuma língua precisava de tradução',
          description: 'Todos os campos já estavam preenchidos.',
        });
      }
    } catch (error) {
      console.error('Lesson translation error:', error);
      toast({
        title: 'Erro na tradução',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível traduzir a lição.',
        variant: 'destructive',
      });
    } finally {
      setTranslatingLessonId(null);
    }
  };

  const removeLesson = (topicId: string, lessonId: string) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              lessons: topic.lessons.filter((lesson) => lesson.id !== lessonId),
            }
          : topic,
      ),
    );
  };

  const updateLesson = (
    topicId: string,
    lessonId: string,
    updater: (lesson: LessonState) => LessonState,
  ) => {
    updateTopics((current) =>
      current.map((topic) => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          lessons: topic.lessons.map((lesson) =>
            lesson.id === lessonId ? updater(lesson) : lesson,
          ),
        };
      }),
    );
  };

  const topicItems = useMemo(() => topics.map((topic) => topic.id), [topics]);

  const isTopicCollapsed = useCallback(
    (topicId: string) => Boolean(collapsedTopics[topicId]),
    [collapsedTopics],
  );

  const handleToggleTopicCollapse = useCallback(
    (topicId: string) => {
      const willCollapse = !collapsedTopics[topicId];
      setCollapsedTopics((prev) => {
        const nextState = { ...prev };
        if (willCollapse) {
          nextState[topicId] = true;
        } else {
          delete nextState[topicId];
        }
        return nextState;
      });

      if (!willCollapse) {
        return;
      }

      const topic = topics.find((item) => item.id === topicId);
      if (!topic) return;

      if (
        expandedLessonId &&
        topic.lessons.some((lesson) => lesson.id === expandedLessonId)
      ) {
        setExpandedLessonId(null);
      }
      if (
        expandedQuizId &&
        topic.quizzes.some((quiz) => quiz.id === expandedQuizId)
      ) {
        setExpandedQuizId(null);
      }
    },
    [
      collapsedTopics,
      expandedLessonId,
      expandedQuizId,
      topics,
      setExpandedLessonId,
      setExpandedQuizId,
    ],
  );

  const handleOpenMediaPicker = (
    topicId: string,
    lessonId: string,
    mode: 'video' | 'attachment',
  ) => {
    setMediaPicker({ topicId, lessonId, mode });
    void lessonLibrary.openLibrary();
  };

  const handleAssetSelect = (asset: MediaAsset) => {
    if (!mediaPicker) return;
    if (mediaPicker.mode === 'video') {
      updateLesson(mediaPicker.topicId, mediaPicker.lessonId, (prev) => ({
        ...prev,
        video: {
          id: asset.id,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl || asset.url,
          type: asset.type,
          title:
            asset.title ||
            `${getAnyTranslation(prev.title) || 'Lesson'} video`,
        },
      }));
    } else {
      updateLesson(mediaPicker.topicId, mediaPicker.lessonId, (prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            id: `${asset.id}-${Date.now()}`,
            label: asset.title || 'Attachment',
            asset,
            externalUrl: asset.url,
          },
        ],
      }));
    }
    setMediaPicker(null);
    lessonLibrary.closeLibrary();
  };

  const currentLanguageLabel =
    LANGUAGES.find((lang) => lang.code === activeLanguage)?.name ||
    activeLanguage.toUpperCase();

  const handleLanguageSelect = (code: LangCode) => {
    if (code === activeLanguage) return;
    setActiveLanguage(code);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#05212b]/60 p-4 text-xs text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase text-slate-400">Língua ativa</p>
            <p className="text-base font-semibold text-white">{currentLanguageLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                type="button"
                size="sm"
                variant={lang.code === activeLanguage ? 'default' : 'outline'}
                className={cn(
                  'border-white/20 text-xs font-semibold',
                  lang.code === activeLanguage
                    ? 'bg-cyan-500/80 text-white hover:bg-cyan-500'
                    : 'text-slate-200 hover:text-white',
                )}
                onClick={() => handleLanguageSelect(lang.code as LangCode)}
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-slate-400">
          Os tópicos, lições e quizzes desta etapa refletem apenas a língua selecionada.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Curriculum builder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Organize topics, lessons and quizzes. Drag to reorder and add new blocks in seconds.
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={topicItems} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {topics.map((topic, index) => (
            <SortableTopicCard
              key={topic.id}
              topic={topic}
              index={index}
              isCollapsed={isTopicCollapsed(topic.id)}
              activeLanguage={activeLanguage}
              onTitleChange={(value) =>
                updateTopicTitle(topic.id, activeLanguage, value)
              }
              onDescriptionChange={(value) =>
                updateTopicDescription(topic.id, activeLanguage, value)
              }
              onXpRequiredChange={(value) =>
                updateTopicXpRequired(topic.id, value)
              }
              onRemove={() => removeTopic(topic.id)}
              onAddLesson={() => addLesson(topic.id)}
              onRemoveLesson={(lessonId) => removeLesson(topic.id, lessonId)}
              onLessonChange={(lessonId, updater) =>
                updateLesson(topic.id, lessonId, updater)
                }
                expandedLessonId={expandedLessonId}
                setExpandedLessonId={setExpandedLessonId}
                expandedQuizId={expandedQuizId}
                setExpandedQuizId={setExpandedQuizId}
                onPickMedia={(lessonId, mode) =>
                  handleOpenMediaPicker(topic.id, lessonId, mode)
                }
              onScheduleChange={(nextSchedule) =>
                updateTopicSchedule(topic.id, nextSchedule)
              }
              scheduleUtils={scheduleUtils}
              onTranslateTopic={() => translateTopicFields(topic.id)}
              translatingTopic={
                translatingTopicId === topic.id || isTranslating
              }
              onTranslateLesson={(lessonId) =>
                translateLessonFields(topic.id, lessonId)
              }
              translatingLessonId={translatingLessonId}
              onAddQuiz={() => addQuiz(topic.id)}
              onRemoveQuiz={(quizId) => removeQuiz(topic.id, quizId)}
              onQuizChange={(quizId, updater) =>
                updateQuiz(topic.id, quizId, updater)
              }
              onToggleCollapse={() => handleToggleTopicCollapse(topic.id)}
            />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        onClick={addTopic}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add topic
      </Button>

      <MediaLibraryDialog
        open={lessonLibrary.isOpen}
        onOpenChange={(open) => {
          if (open) {
            void lessonLibrary.openLibrary(lessonLibrary.activeTab);
          } else {
            setMediaPicker(null);
            lessonLibrary.closeLibrary();
          }
        }}
        title={
          mediaPicker?.mode === 'video'
            ? 'Select lesson video'
            : 'Select lesson attachment'
        }
        description="Upload, search or insert media to connect with lessons instantly."
        library={lessonLibrary}
        onSelect={handleAssetSelect}
        allowUrl
      />
    </div>
  );
}

interface TopicCardProps {
  topic: TopicState;
  index: number;
  isCollapsed: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onXpRequiredChange: (value: number) => void;
  onRemove: () => void;
  onAddLesson: () => void;
  onRemoveLesson: (lessonId: string) => void;
  onLessonChange: (
    lessonId: string,
    updater: (lesson: LessonState) => LessonState,
  ) => void;
  onAddQuiz: () => void;
  onRemoveQuiz: (quizId: string) => void;
  onQuizChange: (
    quizId: string,
    updater: (quiz: QuizState) => QuizState,
  ) => void;
  expandedLessonId: string | null;
  setExpandedLessonId: Dispatch<SetStateAction<string | null>>;
  expandedQuizId: string | null;
  setExpandedQuizId: Dispatch<SetStateAction<string | null>>;
  onPickMedia: (lessonId: string, mode: 'video' | 'attachment') => void;
  onScheduleChange: (schedule: ScheduleConfig) => void;
  scheduleUtils: ScheduleUtils;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DragListenerMap;
  activeLanguage: LangCode;
  onTranslateTopic: () => void;
  translatingTopic: boolean;
  onTranslateLesson: (lessonId: string) => void;
  translatingLessonId: string | null;
  onToggleCollapse: () => void;
}

function SortableTopicCard(props: TopicCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.topic.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TopicCard {...props} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
}

function TopicCard({
  topic,
  index,
  isCollapsed,
  onTitleChange,
  onDescriptionChange,
  onXpRequiredChange,
  onRemove,
  onAddLesson,
  onRemoveLesson,
  onLessonChange,
  onAddQuiz,
  onRemoveQuiz,
  onQuizChange,
  dragAttributes,
  dragListeners,
  expandedLessonId,
  setExpandedLessonId,
  expandedQuizId,
  setExpandedQuizId,
  onPickMedia,
  onScheduleChange,
  scheduleUtils,
  activeLanguage,
  onTranslateTopic,
  translatingTopic,
  onTranslateLesson,
  translatingLessonId,
  onToggleCollapse,
}: TopicCardProps) {
  const titleValue = getTranslationValue(topic.title, activeLanguage);
  const currentDescription = getTranslationValue(
    topic.description,
    activeLanguage,
  );
  const [isEditingDescription, setIsEditingDescription] = useState(
    () => currentDescription.trim().length === 0,
  );
  const [descriptionDraft, setDescriptionDraft] =
    useState(currentDescription);
  const xpRequiredValue =
    typeof topic.xp_required === 'number' ? topic.xp_required : 0;
  const [topicScheduleOpen, setTopicScheduleOpen] = useState<boolean>(() => {
    const sched = topic.schedule;
    if (!sched) return false;
    return Boolean(
      sched.publishAt ||
        sched.expireAt ||
        (sched.status && sched.status !== 'draft'),
    );
  });

  useEffect(() => {
    const nextDescription = getTranslationValue(
      topic.description,
      activeLanguage,
    );
    setDescriptionDraft(nextDescription);
    if (!nextDescription.trim()) {
      setIsEditingDescription(true);
    }
  }, [topic.description, activeLanguage]);

  const handleSaveDescription = () => {
    onDescriptionChange(descriptionDraft.trim());
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setDescriptionDraft(
      getTranslationValue(topic.description, activeLanguage),
    );
    setIsEditingDescription(false);
  };

  return (
    <Card className="border-gray-200 shadow-sm dark:border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex w-full flex-wrap items-start gap-3">
          <div className="flex flex-1 flex-wrap items-start gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-dashed border-gray-300 p-1 text-gray-400 hover:text-gray-600"
                {...dragAttributes}
                {...dragListeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-expanded={!isCollapsed}
                className="rounded-md border border-gray-200 p-1 text-gray-500 transition-colors hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
                title={isCollapsed ? 'Expand topic' : 'Collapse topic'}
              >
                <ChevronDown
                  className="h-4 w-4 transition-transform"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : undefined }}
                />
              </button>
            </div>
            <div className="min-w-[220px] flex-1">
              <p className="text-xs text-gray-500">Topic {index + 1}</p>
              <Input
                value={titleValue}
                onChange={(event) => onTitleChange(event.target.value)}
                className="mt-1 h-8 border-0 bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
                placeholder="Untitled topic"
              />
              {!isCollapsed ? (
                <div className="mt-2">
                  {isEditingDescription ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                      <Textarea
                        value={descriptionDraft}
                        onChange={(event) => setDescriptionDraft(event.target.value)}
                        placeholder="Describe what this topic will cover"
                        className="min-h-[90px] border-0 bg-transparent text-sm text-gray-700 focus-visible:ring-0 dark:text-gray-100"
                      />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelDescription}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveDescription}
                        >
                          Save description
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      <p className="whitespace-pre-wrap">
                        {currentDescription.trim()
                          ? currentDescription
                          : 'No description for this topic yet.'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsEditingDescription(true)}
                      >
                        Edit description
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Topic minimized. Expand to manage description, lessons and quizzes.
                </p>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-start gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onTranslateTopic}
              disabled={translatingTopic}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Traduzir restantes línguas
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <BookOpenCheck className="h-3.5 w-3.5 text-blue-600" />
            {topic.lessons.length} lessons
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5 text-purple-600" />
            {topic.quizzes.length} quizzes
          </Badge>
        </div>

        <div className={cn(SCHEDULE_PANEL_CLASSES, 'text-xs text-slate-300')}>
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{formatScheduleSummary(topic.schedule, scheduleUtils)}</span>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-slate-200"
            onClick={() => setTopicScheduleOpen((prev) => !prev)}
          >
            <span>Topic schedule</span>
            <span className="flex items-center gap-1 text-[11px] normal-case text-slate-400">
              {scheduleUtils.timezone}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  topicScheduleOpen ? 'rotate-180' : 'rotate-0',
                )}
              />
            </span>
          </button>
          {topicScheduleOpen && (
            <div className="mt-3">
              <ScheduleForm
                schedule={topic.schedule}
                scheduleUtils={scheduleUtils}
                onChange={onScheduleChange}
                className="border-none bg-transparent p-0 shadow-none"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase text-gray-500">
              XP required to unlock
            </p>
            <Input
              type="number"
              min={0}
              value={xpRequiredValue}
              onChange={(event) =>
                onXpRequiredChange(
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
            />
            <p className="mt-1 text-xs text-gray-400">
              Define how much total XP a learner must have before this topic
              becomes available.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {topic.lessons.map((lesson, lessonIndex) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              onChange={(updater) => onLessonChange(lesson.id, updater)}
              onRemove={() => onRemoveLesson(lesson.id)}
              isExpanded={expandedLessonId === lesson.id}
              onToggle={() =>
                setExpandedLessonId((prev) =>
                  prev === lesson.id ? null : lesson.id,
                )
              }
              onPickMedia={(mode) => onPickMedia(lesson.id, mode)}
              scheduleUtils={scheduleUtils}
              activeLanguage={activeLanguage}
              onTranslateLesson={() => onTranslateLesson(lesson.id)}
              translatingLesson={translatingLessonId === lesson.id}
            />
          ))}
          {topic.lessons.length === 0 && (
            <p className="text-sm text-gray-500">
              No lessons yet. Use the button below to add the first lesson to this topic.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-dashed pt-4">
          <div className="space-y-3">
            {topic.quizzes.map((quiz, quizIndex) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                index={quizIndex}
                activeLanguage={activeLanguage}
                scheduleUtils={scheduleUtils}
                onChange={(updater) => onQuizChange(quiz.id, updater)}
                onRemove={() => onRemoveQuiz(quiz.id)}
                isExpanded={expandedQuizId === quiz.id}
                onToggle={() =>
                  setExpandedQuizId((prev) =>
                    prev === quiz.id ? null : quiz.id,
                  )
                }
              />
            ))}
            {topic.quizzes.length === 0 && (
              <p className="text-sm text-gray-500">
                No quizzes yet. Use the button below to add interactive checkpoints for this topic.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onAddLesson}>
              <Plus className="mr-2 h-4 w-4" />
              Add lesson
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onAddQuiz}>
              <Plus className="mr-2 h-4 w-4" />
              Add quiz
            </Button>
          </div>
        </div>
        </CardContent>
      )}
    </Card>
  );
}

interface LessonCardProps {
  lesson: LessonState;
  index: number;
  onChange: (updater: (lesson: LessonState) => LessonState) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  onPickMedia: (mode: 'video' | 'attachment') => void;
  scheduleUtils: ScheduleUtils;
  activeLanguage: LangCode;
  onTranslateLesson: () => void;
  translatingLesson: boolean;
}

function LessonCard({
  lesson,
  index,
  onChange,
  onRemove,
  isExpanded,
  onToggle,
  onPickMedia,
  scheduleUtils,
  activeLanguage,
  onTranslateLesson,
  translatingLesson,
}: LessonCardProps) {
  const attachmentCount = lesson.attachments.length;
  const videoUrl = lesson.video?.url || '';
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(() => {
    const sched = lesson.schedule;
    if (!sched) return false;
    return Boolean(
      sched.publishAt ||
        sched.expireAt ||
        (sched.status && sched.status !== 'draft'),
    );
  });
  const lessonTitleValue = getTranslationValue(
    lesson.title,
    activeLanguage,
  );
  const lessonContentValue = getTranslationValue(
    lesson.content,
    activeLanguage,
  );
  const lessonXpRequired =
    typeof lesson.xp_required === 'number' ? lesson.xp_required : 0;
  const previewDisabled = !lesson.id;
  const handlePreviewClick = () => {
    if (!lesson.id) return;
    window.open(`/education/lessons/${lesson.id}`, '_blank');
  };

  const handleVideoChange = (url: string) => {
    const trimmed = url.trim();
    onChange((prev) => ({
      ...prev,
      video: trimmed
        ? {
            id: prev.video?.id || generateLocalId('lesson-video'),
            url: trimmed,
            thumbnailUrl: prev.video?.thumbnailUrl || null,
            type: 'video',
            title:
              prev.video?.title ||
              `${getAnyTranslation(prev.title) || 'Lesson'} video`,
          }
        : null,
    }));
  };

  const handleAttachmentChange = (
    attachmentId: string,
    field: 'label' | 'url',
    value: string,
  ) => {
    onChange((prev) => ({
      ...prev,
      attachments: prev.attachments.map((attachment) => {
        if (attachment.id !== attachmentId) return attachment;
        if (field === 'label') {
          return { ...attachment, label: value };
        }
        const trimmed = value.trim();
        return {
          ...attachment,
          asset: {
            ...attachment.asset,
            url: trimmed,
            title: attachment.asset.title || attachment.label,
          },
          externalUrl: trimmed || attachment.externalUrl || '',
        };
      }),
    }));
  };

  const addAttachment = () => {
    const id = generateLocalId('lesson-attachment');
    onChange((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        {
          id,
          label: 'New attachment',
          asset: {
            id,
            url: '',
            type: 'document',
            title: 'Attachment',
          },
          externalUrl: '',
        },
      ],
    }));
  };

  const removeAttachment = (attachmentId: string) => {
    onChange((prev) => ({
      ...prev,
      attachments: prev.attachments.filter(
        (attachment) => attachment.id !== attachmentId,
      ),
    }));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Lesson {index + 1}
            </p>
            <Badge variant="outline" className={cn('text-[11px] uppercase')}>
              {lesson.schedule.status}
            </Badge>
          </div>
          <Input
            value={lessonTitleValue}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                title: setTranslationValue(
                  prev.title,
                  activeLanguage,
                  event.target.value,
                ),
              }))
            }
            placeholder="Lesson title"
            className="text-sm font-medium"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase text-gray-500">XP Reward</p>
              <Input
                type="number"
                min={0}
                value={lesson.xpReward ?? 0}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    xpReward: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500">Duration (min)</p>
              <Input
                type="number"
                min={1}
                value={lesson.estimated_time ?? 10}
                onChange={(event) => {
                  const nextValue = Math.max(1, Number(event.target.value) || 1);
                  onChange((prev) => ({
                    ...prev,
                    estimated_time: nextValue,
                  }));
                }}
              />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500">
                XP required to unlock
              </p>
              <Input
                type="number"
                min={0}
                value={lessonXpRequired}
                onChange={(event) => {
                  const nextValue = Math.max(
                    0,
                    Number(event.target.value) || 0,
                  );
                  onChange((prev) => ({
                    ...prev,
                    xp_required: nextValue,
                  }));
                }}
              />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}
        </Badge>
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {lesson.estimated_time || 10} min read
        </Badge>
        {lesson.video?.url && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Video attached
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-blue-600"
            onClick={onToggle}
          >
            {isExpanded ? 'Hide editor' : 'Edit lesson'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTranslateLesson}
            disabled={translatingLesson}
          >
            <Sparkles className="h-4 w-4 mr-1 text-cyan-400" />
            Traduzir línguas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewClick}
            disabled={previewDisabled}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-dashed pt-4">
          <div>
            <LabelSmall>Lesson content</LabelSmall>
            <RichTextEditor
              value={lessonContentValue}
              onChange={(next) =>
                onChange((prev) => ({
                  ...prev,
                  content: setTranslationValue(
                    prev.content,
                    activeLanguage,
                    next,
                  ),
                }))
              }
              placeholder="Add lesson details, embeds, links..."
              minRows={8}
            />
          </div>

          <div>
            <LabelSmall>Video URL</LabelSmall>
            <Input
              value={videoUrl}
              onChange={(event) => handleVideoChange(event.target.value)}
              placeholder="https://video-url.com/lesson.mp4"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onPickMedia('video')}
            >
              Select video from media library
            </Button>
          </div>

          <div className={cn(SCHEDULE_PANEL_CLASSES, 'text-slate-300')}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{formatScheduleSummary(lesson.schedule, scheduleUtils)}</span>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs font-semibold uppercase text-slate-100"
              onClick={() => setScheduleOpen((prev) => !prev)}
            >
              <span>Lesson schedule</span>
              <span className="flex items-center gap-1 text-[11px] normal-case text-slate-400">
                {scheduleUtils.timezone}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    scheduleOpen ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </span>
            </button>
            {scheduleOpen && (
              <div className="mt-3">
                <ScheduleForm
                  schedule={lesson.schedule}
                  scheduleUtils={scheduleUtils}
                  onChange={(nextSchedule) =>
                    onChange((prev) => ({ ...prev, schedule: nextSchedule }))
                  }
                  className="border-none p-0 shadow-none bg-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <LabelSmall>Attachments</LabelSmall>
            <div className="space-y-3">
              {lesson.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={attachment.label}
                      onChange={(event) =>
                        handleAttachmentChange(
                          attachment.id,
                          'label',
                          event.target.value,
                        )
                      }
                      placeholder="Attachment label"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    className="mt-2"
                    value={
                      attachment.externalUrl ||
                      attachment.asset.url ||
                      ''
                    }
                    onChange={(event) =>
                      handleAttachmentChange(
                        attachment.id,
                        'url',
                        event.target.value,
                      )
                    }
                    placeholder="https://..."
                  />
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={addAttachment}>
              <Plus className="mr-2 h-4 w-4" />
              Add attachment
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-blue-600"
              onClick={() => onPickMedia('attachment')}
            >
              + Attach from media library
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizCardProps {
  quiz: QuizState;
  index: number;
  activeLanguage: LangCode;
  scheduleUtils: ScheduleUtils;
  onChange: (updater: (quiz: QuizState) => QuizState) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function QuizCard({
  quiz,
  index,
  activeLanguage,
  scheduleUtils,
  onChange,
  onRemove,
  isExpanded,
  onToggle,
}: QuizCardProps) {
  const quizTitleValue = getTranslationValue(quiz.title, activeLanguage);
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(() => {
    const sched = quiz.schedule;
    if (!sched) return false;
    return Boolean(
      sched.publishAt ||
        sched.expireAt ||
        (sched.status && sched.status !== 'draft'),
    );
  });

  const handleQuestionChange = (
    questionId: string,
    updater: (question: QuizState['questions'][number]) => QuizState['questions'][number],
  ) => {
    onChange((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === questionId ? updater(question) : question,
      ),
    }));
  };

  const addQuestion = () => {
    onChange((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: generateLocalId('quiz-question'),
          prompt: '',
          choices: ['', ''],
          answerIndex: 0,
        },
      ],
    }));
  };

  const removeQuestion = (questionId: string) => {
    onChange((prev) => ({
      ...prev,
      questions: prev.questions.filter(
        (question) => question.id !== questionId,
      ),
    }));
  };

  const handleChoiceChange = (
    questionId: string,
    choiceIndex: number,
    value: string,
  ) => {
    handleQuestionChange(questionId, (question) => {
      const nextChoices = [...question.choices];
      nextChoices[choiceIndex] = value;
      return { ...question, choices: nextChoices };
    });
  };

  const addChoice = (questionId: string) => {
    handleQuestionChange(questionId, (question) => ({
      ...question,
      choices: [...question.choices, ''],
    }));
  };

  const removeChoice = (questionId: string, choiceIndex: number) => {
    handleQuestionChange(questionId, (question) => {
      if (question.choices.length <= 2) {
        return question;
      }
      const nextChoices = question.choices.filter(
        (_, index) => index !== choiceIndex,
      );
      const nextAnswerIndex =
        question.answerIndex >= nextChoices.length
          ? Math.max(0, nextChoices.length - 1)
          : question.answerIndex;
      return {
        ...question,
        choices: nextChoices,
        answerIndex: nextAnswerIndex,
      };
    });
  };

  const setCorrectAnswer = (questionId: string, answerIndex: number) => {
    handleQuestionChange(questionId, (question) => ({
      ...question,
      answerIndex,
    }));
  };

  return (
    <div className="rounded-xl border border-purple-200/60 bg-white/80 p-4 shadow-sm dark:border-purple-900/60 dark:bg-gray-950/70">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-purple-500">
              Quiz {index + 1}
            </p>
            <Badge variant="outline" className="text-[11px] uppercase">
              {quiz.schedule.status}
            </Badge>
          </div>
          <Input
            value={quizTitleValue}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                title: setTranslationValue(
                  prev.title,
                  activeLanguage,
                  event.target.value,
                ),
              }))
            }
            placeholder="Quiz title"
            className="text-sm font-medium"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase text-gray-500">XP Reward</p>
              <Input
                type="number"
                min={0}
                value={quiz.xpReward ?? 0}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    xpReward: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500">
                Questions
              </p>
              <Input value={quiz.questions.length} readOnly />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
          {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-blue-600"
          onClick={onToggle}
        >
          {isExpanded ? 'Hide quiz editor' : 'Edit quiz'}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-dashed pt-4">
          <div className={cn(SCHEDULE_PANEL_CLASSES, 'text-slate-300')}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{formatScheduleSummary(quiz.schedule, scheduleUtils)}</span>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs font-semibold uppercase text-slate-100"
              onClick={() => setScheduleOpen((prev) => !prev)}
            >
              <span>Quiz schedule</span>
              <span className="flex items-center gap-1 text-[11px] normal-case text-slate-400">
                {scheduleUtils.timezone}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    scheduleOpen ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </span>
            </button>
            {scheduleOpen && (
              <div className="mt-3">
                <ScheduleForm
                  schedule={quiz.schedule}
                  scheduleUtils={scheduleUtils}
                  onChange={(nextSchedule) =>
                    onChange((prev) => ({ ...prev, schedule: nextSchedule }))
                  }
                  className="border-none p-0 shadow-none bg-transparent"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <LabelSmall>Questions</LabelSmall>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add question
              </Button>
            </div>

            {quiz.questions.length === 0 && (
              <p className="text-sm text-gray-500">
                No questions yet. Add at least one question to make this quiz available.
              </p>
            )}

            {quiz.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-lg border border-purple-200/60 p-4 dark:border-purple-900/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-purple-500">
                    Question {questionIndex + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  value={question.prompt}
                  onChange={(event) =>
                    handleQuestionChange(question.id, (prevQuestion) => ({
                      ...prevQuestion,
                      prompt: event.target.value,
                    }))
                  }
                  placeholder="Question prompt..."
                  rows={3}
                  className="mb-3"
                />

                <div className="space-y-2">
                  {question.choices.map((choice, choiceIndex) => (
                    <div
                      key={`${question.id}-${choiceIndex}`}
                      className="flex items-center gap-2"
                    >
                      <Button
                        type="button"
                        variant={
                          question.answerIndex === choiceIndex
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        className={
                          question.answerIndex === choiceIndex
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                            : ''
                        }
                        onClick={() => setCorrectAnswer(question.id, choiceIndex)}
                      >
                        {question.answerIndex === choiceIndex
                          ? 'Correct'
                          : 'Mark correct'}
                      </Button>
                      <Input
                        value={choice}
                        onChange={(event) =>
                          handleChoiceChange(
                            question.id,
                            choiceIndex,
                            event.target.value,
                          )
                        }
                        placeholder={`Choice ${choiceIndex + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(question.id, choiceIndex)}
                        disabled={question.choices.length <= 2}
                        className="text-gray-500 hover:text-red-600 disabled:text-gray-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addChoice(question.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add choice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScheduleFormProps {
  heading?: string;
  schedule: ScheduleConfig;
  scheduleUtils: ScheduleUtils;
  onChange: (schedule: ScheduleConfig) => void;
  className?: string;
}

function ScheduleForm({
  heading,
  schedule,
  scheduleUtils,
  onChange,
  className,
}: ScheduleFormProps) {
  const publishInputs = schedule.publishAt
    ? scheduleUtils.toInputValues(schedule.publishAt)
    : { date: '', time: '' };
  const expireInputs = schedule.expireAt
    ? scheduleUtils.toInputValues(schedule.expireAt)
    : { date: '', time: '' };

  const handleInputChange = (
    field: 'publishAt' | 'expireAt',
    part: 'date' | 'time',
    value: string,
  ) => {
    const current = field === 'publishAt' ? publishInputs : expireInputs;
    const next = { ...current, [part]: value };
    if (next.date && next.time) {
      const iso = scheduleUtils.fromInput(next.date, next.time);
      onChange({
        ...schedule,
        [field]: iso,
        status:
          field === 'publishAt' && schedule.status === 'draft'
            ? 'scheduled'
            : schedule.status,
      });
    } else {
      onChange({
        ...schedule,
        [field]: null,
        status:
          field === 'publishAt' && schedule.status === 'scheduled'
            ? 'draft'
            : schedule.status,
      });
    }
  };

  const handleClear = (field: 'publishAt' | 'expireAt') => {
    onChange({
      ...schedule,
      [field]: null,
      status:
        field === 'publishAt' && schedule.status === 'scheduled'
          ? 'draft'
          : schedule.status,
    });
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-gray-200 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/60',
        className,
      )}
    >
      {heading && (
        <div className="mb-3 flex flex-wrap items-center justify-between text-xs text-gray-500">
          <span className="font-semibold uppercase">{heading}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {scheduleUtils.timezone}
          </span>
        </div>
      )}
      <div className="mb-3">
        <Select
          value={schedule.status}
          onValueChange={(value) =>
            onChange({ ...schedule, status: value as ScheduleConfig['status'] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ScheduleInputRow
          label="Publish at (CET)"
          dateValue={publishInputs.date}
          timeValue={publishInputs.time}
          onDateChange={(value) => handleInputChange('publishAt', 'date', value)}
          onTimeChange={(value) => handleInputChange('publishAt', 'time', value)}
          onClear={() => handleClear('publishAt')}
        />
        <ScheduleInputRow
          label="Expire at (CET)"
          dateValue={expireInputs.date}
          timeValue={expireInputs.time}
          onDateChange={(value) => handleInputChange('expireAt', 'date', value)}
          onTimeChange={(value) => handleInputChange('expireAt', 'time', value)}
          onClear={() => handleClear('expireAt')}
        />
      </div>
    </div>
  );
}

interface ScheduleInputRowProps {
  label: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onClear: () => void;
}

function ScheduleInputRow({
  label,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  onClear,
}: ScheduleInputRowProps) {
  const hasValue = Boolean(dateValue || timeValue);
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase text-gray-500">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="date"
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Input
          type="time"
          value={timeValue}
          onChange={(event) => onTimeChange(event.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasValue}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function formatScheduleSummary(
  schedule: ScheduleConfig,
  scheduleUtils: ScheduleUtils,
) {
  const statusLabel = schedule.status
    ? schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)
    : 'Draft';

  const publishInputs = schedule.publishAt
    ? scheduleUtils.toInputValues(schedule.publishAt)
    : null;
  const expireInputs = schedule.expireAt
    ? scheduleUtils.toInputValues(schedule.expireAt)
    : null;

  const summaryParts = [statusLabel];

  if (publishInputs?.date) {
    summaryParts.push(
      `Publishes ${publishInputs.date}${
        publishInputs.time ? ` ${publishInputs.time}` : ''
      }`,
    );
  } else {
    summaryParts.push('No publish date');
  }

  if (expireInputs?.date) {
    summaryParts.push(
      `Expires ${expireInputs.date}${
        expireInputs.time ? ` ${expireInputs.time}` : ''
      }`,
    );
  } else {
    summaryParts.push('No expiry');
  }

  return summaryParts.join(' • ');
}

function LabelSmall({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </p>
  );
}

function generateLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
