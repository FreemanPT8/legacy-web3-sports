'use client';

import { useMemo } from 'react';

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
    onManageModules?: () => void;
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

  useAutosave({
    data: state,
    save: onAutosave ?? (async () => {}),
    enabled: Boolean(onAutosave),
  });
  useLivePreview({ data: state });

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

  const previewColumn = (
    <div className="space-y-6">
      <CourseStatusCard
        authorName={metadata.authorName}
        xpCreatorDistributed={metadata.xpCreatorDistributed}
        xpTotalDistributed={metadata.xpTotalDistributed}
        onManageModules={metadata.onManageModules}
      />
      <LegacyPreviewPanel>
        <CoursePreview />
      </LegacyPreviewPanel>
    </div>
  );

  return (
    <BuilderShell
      title="Legacy Builder — Course"
      description="Três etapas unificadas: Basics, Curriculum e Additional."
      editor={editor}
      preview={previewColumn}
      onPreview={onPreview ? () => onPreview(state.slug) : undefined}
      onSubmit={() => onSubmit(state)}
      submitLabel={saving ? 'Saving...' : 'Save Changes'}
      submitDisabled={saving}
    />
  );
}

function CourseStatusCard({
  authorName,
  xpTotalDistributed,
  xpCreatorDistributed,
  onManageModules,
}: {
  authorName: string | null;
  xpTotalDistributed: number;
  xpCreatorDistributed: number;
  onManageModules?: () => void;
}) {
  const { state } = useBuilderContext();
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
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onManageModules}
          disabled={!onManageModules}
        >
          Manage modules
        </Button>
      </CardContent>
    </Card>
  );
}
