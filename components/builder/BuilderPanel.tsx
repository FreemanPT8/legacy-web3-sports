import type { ReactNode } from 'react';

interface BuilderPanelProps {
  editor: ReactNode;
  preview: ReactNode;
}

export function BuilderPanel({ editor, preview }: BuilderPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <section className="min-h-[400px] space-y-6 rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {editor}
      </section>
      <aside className="space-y-6">
        {preview}
      </aside>
    </div>
  );
}
