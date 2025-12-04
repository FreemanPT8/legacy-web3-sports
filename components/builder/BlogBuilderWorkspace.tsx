import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BuilderShell } from '@/components/builder/BuilderShell';
import { LegacyPreviewPanel } from '@/components/preview/LegacyPreviewPanel';
import { BlogPreview } from '@/components/preview/BlogPreview';
import { BlogBasicsStep } from '@/components/builder/steps/BlogBasicsStep';
import { BlogContentStep } from '@/components/builder/steps/BlogContentStep';
import { AdditionalStep } from '@/components/builder/steps/AdditionalStep';
import { useBuilderContext } from '@/contexts/BuilderContext';
import { useAutosave } from '@/hooks/useAutosave';
import { useLivePreview } from '@/hooks/useLivePreview';
import type { BlogBuilderState } from '@/types/builder';

interface BlogBuilderWorkspaceProps {
  saving: boolean;
  onSubmit: (state: BlogBuilderState) => Promise<void>;
  onPreview?: (slug: string) => void;
  onAutosave?: (state: BlogBuilderState) => Promise<void>;
  metadata?: {
    authorName: string | null;
  };
}

export function BlogBuilderWorkspace({
  saving,
  onSubmit,
  onPreview,
  onAutosave,
  metadata,
}: BlogBuilderWorkspaceProps) {
  const { state, activeStep } = useBuilderContext();
  const blogState = state as BlogBuilderState;

  useAutosave<BlogBuilderState>({
    data: blogState,
    save: onAutosave ?? (async () => {}),
    enabled: Boolean(onAutosave),
  });
  useLivePreview({ data: blogState });

  const editor = useMemo(() => {
    switch (activeStep) {
      case 'basics':
        return <BlogBasicsStep />;
      case 'content':
        return <BlogContentStep />;
      case 'additional':
        return <AdditionalStep />;
      default:
        return null;
    }
  }, [activeStep]);

  const previewColumn = (
    <div className="space-y-6">
      <BlogStatusCard authorName={metadata?.authorName || null} />
      <LegacyPreviewPanel>
        <BlogPreview />
      </LegacyPreviewPanel>
    </div>
  );

  return (
    <BuilderShell
      title="Legacy Builder — Blog Post"
      description="Three unified steps: Basics, Content and Additional settings."
      editor={editor}
      preview={previewColumn}
      onPreview={onPreview ? () => onPreview(blogState.slug) : undefined}
      onSubmit={() => onSubmit(blogState)}
      submitLabel={saving ? 'Saving...' : 'Publish / Update'}
      submitDisabled={saving}
    />
  );
}

function BlogStatusCard({ authorName }: { authorName: string | null }) {
  const { state } = useBuilderContext();
  const blog = state as BlogBuilderState;
  const timezoneLabel =
    blog.schedule.timezone === 'CET' ? 'CET (Europe/Berlin)' : blog.schedule.timezone;

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
    blog.schedule.status === 'draft'
      ? 'Draft'
      : blog.schedule.status === 'scheduled'
        ? 'Scheduled'
        : 'Published';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Post status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={blog.published ? 'default' : 'outline'}>
            {blog.published ? 'Published' : 'Draft'}
          </Badge>
          {blog.category && <Badge variant="outline">{blog.category}</Badge>}
          {authorName && (
            <Badge variant="outline">Author: {authorName}</Badge>
          )}
        </div>
        <div className="grid gap-3">
          <StatusRow label="Reading time" value={`${blog.readingTimeMinutes} min`} />
          <StatusRow label="XP reward" value={`${blog.xp.reward} XP`} />
          <StatusRow
            label="Access"
            value={blog.registeredOnly ? 'Members only' : 'Public'}
          />
          <StatusRow label="Schedule status" value={`${scheduleStatusCopy} • ${timezoneLabel}`} />
          <StatusRow label="Publish at" value={formatDate(blog.schedule.publishAt)} />
          <StatusRow label="Expire at" value={formatDate(blog.schedule.expireAt)} />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled
        >
          Manage versions (soon)
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
