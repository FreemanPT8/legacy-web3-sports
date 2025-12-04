import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { LANGUAGES, type LangCode, type BlogBuilderState } from '@/types/builder';
import { useBuilderState } from '@/hooks/useBuilderState';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

export function BlogContentStep() {
  const { state, patchState } = useBuilderState();
  const blogState = state as BlogBuilderState;
  const [language, setLanguage] = useState<LangCode>('en');

  const currentLangLabel =
    LANGUAGES.find((lang) => lang.code === language)?.name || language;

  const bodyValue = blogState.content[language] ?? '';

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
