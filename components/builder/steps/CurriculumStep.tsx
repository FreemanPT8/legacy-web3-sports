'use client';

import {
  useCallback,
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
import { GripVertical, Plus, Trash2, BookOpenCheck, ListChecks } from 'lucide-react';

import { useBuilderState } from '@/hooks/useBuilderState';
import type { CourseBuilderState } from '@/types/builder';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createLesson, createTopic } from '@/lib/curriculum';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import type { LessonState, TopicState, MediaAsset } from '@/types/builder';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';

export function CurriculumStep() {
  const { state, patchState } = useBuilderState();
  const courseState = state as CourseBuilderState;
  const topics = courseState.curriculum.topics;
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const lessonLibrary = useMediaLibrary();
  const [mediaPicker, setMediaPicker] = useState<{
    topicId: string;
    lessonId: string;
    mode: 'video' | 'attachment';
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const updateTopics = useCallback(
    (updater: (current: TopicState[]) => TopicState[]) => {
      patchState({
        curriculum: {
          ...courseState.curriculum,
          topics: updater(courseState.curriculum.topics),
        },
      });
    },
    [patchState, courseState.curriculum],
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

  const updateTopicTitle = (topicId: string, title: string) => {
    updateTopics((current) =>
      current.map((topic) =>
        topic.id === topicId ? { ...topic, title } : topic,
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
          title: asset.title || `${prev.title} video`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Curriculum builder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Organiza tópicos, lições e quizzes. Arrasta para reordenar e adiciona novos blocos em segundos.
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
                onTitleChange={(value) => updateTopicTitle(topic.id, value)}
                onRemove={() => removeTopic(topic.id)}
                onAddLesson={() => addLesson(topic.id)}
                onRemoveLesson={(lessonId) => removeLesson(topic.id, lessonId)}
                onLessonChange={(lessonId, updater) =>
                  updateLesson(topic.id, lessonId, updater)
                }
                expandedLessonId={expandedLessonId}
                setExpandedLessonId={setExpandedLessonId}
                onPickMedia={(lessonId, mode) =>
                  handleOpenMediaPicker(topic.id, lessonId, mode)
                }
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
        description="Upload, pesquisa ou insere media para ligares ��s lições."
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
  onTitleChange: (value: string) => void;
  onRemove: () => void;
  onAddLesson: () => void;
  onRemoveLesson: (lessonId: string) => void;
  onLessonChange: (
    lessonId: string,
    updater: (lesson: LessonState) => LessonState,
  ) => void;
  expandedLessonId: string | null;
  setExpandedLessonId: Dispatch<SetStateAction<string | null>>;
  onPickMedia: (lessonId: string, mode: 'video' | 'attachment') => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: Record<string, unknown>;
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
  onTitleChange,
  onRemove,
  onAddLesson,
  onRemoveLesson,
  onLessonChange,
  dragAttributes,
  dragListeners,
  expandedLessonId,
  setExpandedLessonId,
  onPickMedia,
}: TopicCardProps) {
  return (
    <Card className="border-gray-200 shadow-sm dark:border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-dashed border-gray-300 p-1 text-gray-400 hover:text-gray-600"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs text-gray-500">Topic {index + 1}</p>
            <Input
              value={topic.title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="mt-1 h-8 border-0 bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
              placeholder="Untitled topic"
            />
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
      </CardHeader>
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
            />
          ))}
          {topic.lessons.length === 0 && (
            <p className="text-sm text-gray-500">
              No lessons yet. Use the button below to add the first lesson to this topic.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onAddLesson}>
            <Plus className="mr-2 h-4 w-4" />
            Add lesson
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add quiz (soon)
          </Button>
        </div>
      </CardContent>
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
}

function LessonCard({
  lesson,
  index,
  onChange,
  onRemove,
  isExpanded,
  onToggle,
  onPickMedia,
}: LessonCardProps) {
  const attachmentCount = lesson.attachments.length;
  const videoUrl = lesson.video?.url || '';

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
            title: prev.video?.title || `${prev.title} video`,
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
            value={lesson.title}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Lesson title"
            className="text-sm font-medium"
          />
          <div className="grid gap-3 sm:grid-cols-2">
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
              <Input type="number" placeholder="0" disabled />
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
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}
        </Badge>
        {lesson.video?.url && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Video attached
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-blue-600"
          onClick={onToggle}
        >
          {isExpanded ? 'Hide editor' : 'Edit lesson'}
        </Button>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-dashed pt-4">
          <div>
            <LabelSmall>Lesson content</LabelSmall>
            <RichTextEditor
              value={lesson.content}
              onChange={(next) =>
                onChange((prev) => ({ ...prev, content: next }))
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
