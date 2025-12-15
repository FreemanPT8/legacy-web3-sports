import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
}

export function Section({ children, className, as = 'section' }: SectionProps) {
  const Comp = as;
  return (
    <Comp className={cn('legacy-section', className)}>
      <div className="legacy-container">{children}</div>
    </Comp>
  );
}

