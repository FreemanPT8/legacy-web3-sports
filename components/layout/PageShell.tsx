import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('legacy-page', className)}>
      <div className="legacy-container px-6 py-10 lg:py-16">
        {children}
      </div>
    </div>
  );
}

