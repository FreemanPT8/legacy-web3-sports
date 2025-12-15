import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  tone?: 'default' | 'accent';
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'border border-border bg-card/80 backdrop-blur-sm',
        tone === 'accent' && 'border-primary/40 bg-primary/10',
        className,
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            {label}
          </CardTitle>
          {icon && <span className="text-primary">{icon}</span>}
        </div>
        <CardDescription className="text-2xl font-semibold text-foreground">
          {value}
        </CardDescription>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
    </Card>
  );
}

