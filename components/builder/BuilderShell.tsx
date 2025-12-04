import type { ReactNode } from 'react';
import { BuilderStepsNav } from './BuilderStepsNav';
import { BuilderActions } from './BuilderActions';
import { BuilderPanel } from './BuilderPanel';

interface BuilderShellProps {
  title: string;
  description?: string;
  editor: ReactNode;
  preview: ReactNode;
  onPreview?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  previewLabel?: string;
  submitDisabled?: boolean;
}

export function BuilderShell({
  title,
  description,
  editor,
  preview,
  onPreview,
  onSubmit,
  previewLabel,
  submitLabel,
  submitDisabled,
}: BuilderShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-6 dark:bg-gray-950">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <BuilderStepsNav />
          <BuilderActions
            onPreview={onPreview}
            onSubmit={onSubmit}
            previewLabel={previewLabel}
            submitLabel={submitLabel}
            submitDisabled={submitDisabled}
          />
        </div>
      </div>

      <main className="container mx-auto px-4 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </header>

        <BuilderPanel editor={editor} preview={preview} />
      </main>
    </div>
  );
}
