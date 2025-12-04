import type { ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilderContext } from '@/contexts/BuilderContext';

interface LegacyPreviewPanelProps {
  title?: string;
  children: ReactNode;
}

export function LegacyPreviewPanel({
  title = 'Live Preview',
  children,
}: LegacyPreviewPanelProps) {
  const { previewMode, setPreviewMode } = useBuilderContext();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {title}
          </p>
          <p className="text-xs text-gray-500">Reactive to every change</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode('desktop')}
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
              previewMode === 'desktop'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-600',
            )}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('mobile')}
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
              previewMode === 'mobile'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-600',
            )}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>
      </div>
      <div
        className={cn(
          'mx-auto w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950',
          previewMode === 'mobile' ? 'max-w-xs' : 'min-h-[480px]',
        )}
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {children}
        </div>
      </div>
    </section>
  );
}
