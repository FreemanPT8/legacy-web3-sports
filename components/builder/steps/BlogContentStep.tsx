import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { LANGUAGES, type LangCode, type BlogBuilderState } from '@/types/builder';
import { useBuilderState } from '@/hooks/useBuilderState';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Button } from '@/components/ui/button';

export function BlogContentStep() {
  const { state, patchState } = useBuilderState();
  const blogState = state as BlogBuilderState;
  const [language, setLanguage] = useState<LangCode>('en');

  const currentLangLabel =
    LANGUAGES.find((lang) => lang.code === language)?.name || language;

  const bodyValue = blogState.content[language] ?? '';
  const plainText = useMemo(
    () => bodyValue.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    [bodyValue],
  );
  const wordCount = plainText.length ? plainText.split(' ').length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const canSyncReadingTime = blogState.readingTimeMinutes !== estimatedMinutes;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Content</h2>
        <p className="text-sm text-gray-500">
          Full article body with embeds, quotes and calls-to-action.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => (
          <Badge
            key={lang.code}
            variant={language === lang.code ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setLanguage(lang.code as LangCode)}
          >
            {lang.name}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
        <div>
          <p className="font-semibold">Content stats</p>
          <p className="text-xs text-gray-500">
            {wordCount.toLocaleString()} words • ~{estimatedMinutes} min read
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={wordCount === 0 || !canSyncReadingTime}
          onClick={() =>
            patchState({
              readingTimeMinutes: estimatedMinutes,
            })
          }
        >
          Apply to reading time
        </Button>
      </div>
      <RichTextEditor
        value={bodyValue}
        onChange={(next) =>
          patchState({
            content: {
              ...blogState.content,
              [language]: next,
            },
          })
        }
        placeholder={`Write the article in ${currentLangLabel} com headings, embeds, listas e links.`}
        minRows={18}
      />
    </div>
  );
}
