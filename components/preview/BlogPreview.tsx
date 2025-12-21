import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useBuilderContext } from '@/contexts/BuilderContext';
import { splitReadMore } from '@/lib/read-more';
import type { BlogBuilderState } from '@/types/builder';
import { getAvailableLanguages } from '@/lib/language';

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').trim();
const ensureHtml = (value: string, fallback: string) => {
  const base = value && value.trim().length > 0 ? value : fallback;
  const trimmed = base.trim();
  if (!trimmed) return '<p></p>';
  return trimmed.includes('<') ? trimmed : `<p>${trimmed}</p>`;
};

export function BlogPreview() {
  const { previewData } = useBuilderContext();
  const blog = previewData as BlogBuilderState;

  const headline =
    blog.title.en ||
    Object.values(blog.title).find((value) => value.trim().length) ||
    'Untitled post';
  const excerpt =
    blog.longDescription.en ||
    Object.values(blog.longDescription).find((value) => value.trim().length) ||
    'Excerpt not defined yet.';
  const body =
    blog.content.en ||
    Object.values(blog.content).find((value) => value.trim().length) ||
    'Start writing your article to preview it here.';
  const { before: previewBody, hasReadMore } = splitReadMore(body);
  const previewPlainLength = stripHtml(previewBody).length;
  const previewHtml = ensureHtml(
    previewBody,
    'Start writing your article to preview it here.',
  );
  const excerptHtml = ensureHtml(excerpt, 'Excerpt not defined yet.');
  const snippetOverflow = previewPlainLength > 600 || hasReadMore;
  const availableLanguages = getAvailableLanguages(
    blog.title,
    blog.longDescription,
    blog.content,
  );
  const imageSettings = blog.seo?.imageSettings ?? { zoom: 1, offsetY: 0 };

  return (
    <div className="space-y-4">
      {blog.coverImage?.url && (
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
          <div className="relative w-full pb-[56.25%]">
            <Image
              src={blog.coverImage.url}
              alt={blog.coverImage.alt || headline}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 320px"
              unoptimized
              style={{
                transform: `scale(${imageSettings.zoom})`,
                objectPosition: `center ${imageSettings.offsetY}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{blog.category}</Badge>
          <Badge variant={blog.published ? 'default' : 'outline'}>
            {blog.published ? 'Published' : 'Draft'}
          </Badge>
          <Badge variant="outline">{blog.readingTimeMinutes} min read</Badge>
        </div>
        {availableLanguages.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {availableLanguages.map((lang) => (
              <Badge
                key={lang.code}
                variant="secondary"
                className="flex items-center gap-1 border border-gray-200 bg-white/80 text-gray-900 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-100"
              >
                <span aria-hidden className="text-base leading-none">
                  {lang.flag}
                </span>
                <span className="font-semibold uppercase">{lang.code}</span>
              </Badge>
            ))}
          </div>
        )}
        <h3 className="text-xl font-semibold">{headline}</h3>
        <div
          className="prose prose-slate prose-sm max-w-none text-gray-600 dark:prose-invert dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: excerptHtml }}
        />
      </div>
      <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div
          className="prose prose-slate prose-sm max-w-none text-gray-700 dark:prose-invert dark:text-gray-200"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {snippetOverflow && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
        )}
        {hasReadMore && (
          <p className="mt-2 text-xs text-primary-600 dark:text-primary-400">
            Read more marker inserted
          </p>
        )}
      </div>
    </div>
  );
}
