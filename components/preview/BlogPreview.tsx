import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useBuilderContext } from '@/contexts/BuilderContext';
import type { BlogBuilderState } from '@/types/builder';

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

  return (
    <div className="space-y-4">
      {blog.coverImage?.url && (
        <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
          <Image
            src={blog.coverImage.url}
            alt={blog.coverImage.alt || headline}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
            unoptimized
          />
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
        <h3 className="text-xl font-semibold">{headline}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {excerpt}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
        {body.slice(0, 400) || 'Body preview will appear once you start writing.'}
        {body.length > 400 && '…'}
      </div>
    </div>
  );
}
