import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ToolbarProps {
  children?: ReactNode;
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
}

export function Toolbar({ children, start, end, className }: ToolbarProps) {
  const hasSlots = start || end;

  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 rounded-lg border border-border bg-card/80 px-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      {hasSlots ? (
        <>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {start}
          </div>
          <div className="flex flex-wrap items-center gap-2">{end}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
}

