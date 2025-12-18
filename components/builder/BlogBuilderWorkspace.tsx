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
import { LANGUAGES } from '@/types/builder';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

  const showGlobalPreview = activeStep !== 'content';
  const previewColumn = (
    <div className="space-y-6">
      <BlogStatusCard authorName={metadata?.authorName || null} />
      <BlogQualityChecklist />
      <LegacyPreviewPanel>
        <BlogPreview />
      </LegacyPreviewPanel>
    </div>
  );

  return (
    <BuilderShell
      title="Legacy Builder - Blog Post"
      description="Three unified steps: Basics, Content and Additional settings."
      editor={editor}
      preview={previewColumn}
      onPreview={
        onPreview && showGlobalPreview
          ? () => onPreview(blogState.slug)
          : undefined
      }
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

  const countWords = (value: string) =>
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean).length;

  const languageStats = LANGUAGES.map((lang) => {
    const content = blog.content?.[lang.code] ?? '';
    const words = content ? countWords(content) : 0;
    return { code: lang.code, name: lang.name, words };
  });

  const filledLanguages = languageStats.filter((stat) => stat.words > 0);
  const totalWords = languageStats.reduce((sum, stat) => sum + stat.words, 0);
  const estimatedMinutes = Math.max(1, Math.ceil(totalWords / 200));
  const readingTimeCopy =
    blog.readingTimeMinutes === estimatedMinutes
      ? `${blog.readingTimeMinutes} min`
      : `${blog.readingTimeMinutes} min (est. ${estimatedMinutes} min)`;

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
          <StatusRow label="Reading time" value={readingTimeCopy} />
          <StatusRow label="XP reward" value={`${blog.xp.reward} XP`} />
          <StatusRow
            label="Access"
            value={blog.registeredOnly ? 'Members only' : 'Public'}
          />
          <StatusRow
            label="Content coverage"
            value={
              filledLanguages.length > 0
                ? `${filledLanguages.length} / ${languageStats.length} languages - ${totalWords.toLocaleString()} words`
                : 'No content yet'
            }
          />
          {filledLanguages.length > 0 && (
            <div className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <p className="mb-1 font-semibold text-gray-800 dark:text-gray-100">
                Language breakdown
              </p>
              <ul className="space-y-1">
                {filledLanguages.map((lang) => (
                  <li key={lang.code} className="flex items-center justify-between">
                    <span>{lang.name}</span>
                    <span className="font-semibold">{lang.words.toLocaleString()} words</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <StatusRow label="Schedule status" value={`${scheduleStatusCopy} - ${timezoneLabel}`} />
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

function BlogQualityChecklist() {
  const { state } = useBuilderContext();
  const blog = state as BlogBuilderState;
  const firstFilledLanguage = LANGUAGES.find(
    (lang) => blog.content?.[lang.code]?.trim().length,
  );

  const rules = [
    {
      label: 'Title & slug defined',
      done:
        Object.values(blog.title).some((value) => value.trim().length > 0) &&
        blog.slug.trim().length > 0,
      hint: 'Fill at least one title translation and set a slug in Basics.',
    },
    {
      label: 'Cover image selected',
      done: Boolean(blog.coverImage),
      hint: 'Choose a cover image from the media library on Basics.',
    },
    {
      label: 'Content drafted',
      done: Boolean(firstFilledLanguage),
      hint: 'Write content in at least one language in the Content step.',
    },
    {
      label: 'SEO metadata complete',
      done: Boolean(
        blog.seo.metaTitle.trim().length &&
          blog.seo.metaDescription.trim().length &&
          blog.seo.slug.trim().length,
      ),
      hint: 'Review Meta title, description and slug in Additional -> SEO.',
    },
    {
      label: 'Schedule reviewed',
      done: Boolean(blog.schedule.publishAt || blog.schedule.status !== 'draft'),
      hint: 'Set publish date/time or update status in Additional -> Publishing.',
    },
  ];

  const total = rules.length;
  const completed = rules.filter((rule) => rule.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Readiness checklist</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {completed}/{total} tasks completed
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
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
                <p className="text-sm font-semibold">
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
