'use client';

import { useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { CourseBasicsStep } from '@/components/builder/steps/CourseBasicsStep';
import { CurriculumStep } from '@/components/builder/steps/CurriculumStep';
import { AdditionalStep } from '@/components/builder/steps/AdditionalStep';
import { LegacyPreviewPanel } from '@/components/preview/LegacyPreviewPanel';
import { CoursePreview } from '@/components/preview/CoursePreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BuilderShell } from '@/components/builder/BuilderShell';
import { useAutosave } from '@/hooks/useAutosave';
import { useLivePreview } from '@/hooks/useLivePreview';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type { CourseBuilderState } from '@/types/builder';

export interface CourseBuilderWorkspaceProps {
  saving: boolean;
  onSubmit: (state: CourseBuilderState) => Promise<void>;
  onPreview?: (slug: string) => void;
  onAutosave?: (state: CourseBuilderState) => Promise<void>;
  metadata: {
    authorName: string | null;
    xpTotalDistributed: number;
    xpCreatorDistributed: number;
  };
}

export function CourseBuilderWorkspace({
  saving,
  onSubmit,
  onPreview,
  onAutosave,
  metadata,
}: CourseBuilderWorkspaceProps) {
  const { state, activeStep } = useBuilderContext();
  const courseState = state as CourseBuilderState;

  useAutosave<CourseBuilderState>({
    data: courseState,
    save: onAutosave ?? (async () => {}),
    enabled: Boolean(onAutosave),
  });
  useLivePreview({ data: courseState });

  const editor = useMemo(() => {
    switch (activeStep) {
      case 'basics':
        return <CourseBasicsStep />;
      case 'curriculum':
        return <CurriculumStep />;
      case 'additional':
        return <AdditionalStep />;
      default:
        return null;
    }
  }, [activeStep]);

  const showGlobalPreview = activeStep !== 'curriculum';
  const previewColumn = (
    <div className="space-y-6">
      <CourseStatusCard
        authorName={metadata.authorName}
        xpCreatorDistributed={metadata.xpCreatorDistributed}
        xpTotalDistributed={metadata.xpTotalDistributed}
      />
      <CourseQualityChecklist />
      <LegacyPreviewPanel>
        <CoursePreview />
      </LegacyPreviewPanel>
    </div>
  );

  return (
    <BuilderShell
      title="Legacy Builder - Course"
      description="Tres etapas unificadas: Basics, Curriculum e Additional."
      editor={editor}
      preview={previewColumn}
      onPreview={
        onPreview && showGlobalPreview
          ? () => onPreview(courseState.slug)
          : undefined
      }
      onSubmit={() => onSubmit(courseState)}
      submitLabel={saving ? 'Saving...' : 'Save Changes'}
      submitDisabled={saving}
    />
  );
}

function CourseStatusCard({
  authorName,
  xpTotalDistributed,
  xpCreatorDistributed,
}: {
  authorName: string | null;
  xpTotalDistributed: number;
  xpCreatorDistributed: number;
}) {
  const { state } = useBuilderContext();
  const course = state as CourseBuilderState;
  const timezoneLabel =
    course.schedule.timezone === 'CET'
      ? 'CET (Europe/Berlin)'
      : course.schedule.timezone;

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const scheduleStatusCopy =
    course.schedule.status === 'draft'
      ? 'Draft'
      : course.schedule.status === 'scheduled'
        ? 'Scheduled'
        : 'Published';

  const accessLabel = course.isPaid ? 'Paid / members only' : 'Free / open';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Course status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={state.isCompleted ? 'default' : 'outline'}
            className={state.isCompleted ? 'bg-green-600 text-white' : undefined}
          >
            {state.isCompleted ? 'Completed' : 'In progress'}
          </Badge>
          <Badge variant={state.published ? 'default' : 'outline'}>
            {state.published ? 'Published' : 'Draft'}
          </Badge>
          {authorName && (
            <Badge variant="outline">Creator: {authorName}</Badge>
          )}
        </div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            <span>Total XP distributed</span>
            <span className="font-semibold">{xpTotalDistributed}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            <span>XP to creator</span>
            <span className="font-semibold">{xpCreatorDistributed}</span>
          </div>
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
            <StatusRow label="Access" value={accessLabel} />
            <StatusRow
              label="Schedule status"
              value={`${scheduleStatusCopy} - ${timezoneLabel}`}
            />
            <StatusRow
              label="Publish at"
              value={formatDate(course.schedule.publishAt)}
            />
            <StatusRow
              label="Expire at"
              value={formatDate(course.schedule.expireAt)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage the curriculum directly na etapa &ldquo;Curriculum&rdquo;. Topics
          substituem os antigos módulos como fonte única de verdade.
        </p>
      </CardContent>
    </Card>
  );
}

function CourseQualityChecklist() {
  const { state } = useBuilderContext();
  const course = state as CourseBuilderState;
  const topics = course.curriculum.topics;
  const totalLessons = topics.reduce(
    (sum, topic) => sum + topic.lessons.length,
    0,
  );
  const totalQuizzes = topics.reduce(
    (sum, topic) => sum + topic.quizzes.length,
    0,
  );
  const topicsWithoutLessons = topics.filter(
    (topic) => topic.lessons.length === 0,
  );
  const lessonsMissingContent = topics.flatMap((topic) =>
    topic.lessons.filter(
      (lesson) => !lesson.content || lesson.content.trim().length === 0,
    ),
  );
  const hasTitle = Object.values(course.title || {}).some(
    (value) => value.trim().length > 0,
  );
  const hasSlug = course.slug.trim().length > 0;

  const rules = [
    {
      label: 'Title & slug defined',
      done: hasTitle && hasSlug,
      hint: 'Add at least one translation and a unique slug in Basics.',
    },
    {
      label: 'Cover image selected',
      done: Boolean(course.coverImage),
      hint: 'Choose a cover image from the media library.',
    },
    {
      label: 'Curriculum populated',
      done: topics.length > 0 && topicsWithoutLessons.length === 0,
      hint: 'Add topics and ensure each has at least one lesson.',
    },
    {
      label: 'Lessons with content',
      done: lessonsMissingContent.length === 0,
      hint: 'Open lessons with missing content inside Curriculum.',
    },
    {
      label: 'SEO metadata complete',
      done:
        course.seo.metaTitle.trim().length > 0 &&
        course.seo.metaDescription.trim().length > 0 &&
        course.seo.slug.trim().length > 0,
      hint: 'Fill meta title, description and slug in Additional -> SEO.',
    },
    {
      label: 'Schedule reviewed',
      done:
        Boolean(course.schedule.publishAt) ||
        course.schedule.status !== 'draft',
      hint: 'Set publish date/time or update status in Additional -> Publishing.',
    },
  ];

  const completed = rules.filter((rule) => rule.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Readiness checklist</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {completed}/{rules.length} tasks complete
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <div className="flex items-start gap-2">
              {rule.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {rule.label}
                </p>
                {!rule.done && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {rule.hint}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-200">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Curriculum coverage
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Topics</p>
              <p className="text-lg font-semibold">{topics.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Lessons</p>
              <p className="text-lg font-semibold">{totalLessons}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Quizzes</p>
              <p className="text-lg font-semibold">{totalQuizzes}</p>
            </div>
          </div>
          {(topicsWithoutLessons.length > 0 ||
            lessonsMissingContent.length > 0) && (
            <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {topicsWithoutLessons.length > 0 && (
                <div>
                  <p className="font-semibold">
                    Topics needing lessons ({topicsWithoutLessons.length})
                  </p>
                  <ul className="list-inside list-disc">
                    {topicsWithoutLessons.slice(0, 3).map((topic) => (
                      <li key={topic.id}>{topic.title || 'Untitled topic'}</li>
                    ))}
                    {topicsWithoutLessons.length > 3 && <li>...</li>}
                  </ul>
                </div>
              )}
              {lessonsMissingContent.length > 0 && (
                <p>
                  {lessonsMissingContent.length} lesson
                  {lessonsMissingContent.length === 1 ? '' : 's'} missing
                  content.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
