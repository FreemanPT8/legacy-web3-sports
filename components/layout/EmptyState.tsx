import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onActionClick,
  actionHref,
  className,
}: EmptyStateProps) {
  const hasAction = actionLabel && (onActionClick || actionHref);

  return (
    <Card
      className={cn(
        'rounded-3xl border border-white/10 bg-[#05212b] text-center text-slate-200 shadow-lg shadow-black/30',
        className,
      )}
    >
      <CardHeader className="flex flex-col items-center space-y-3">
        {icon && <div className="text-cyan-300">{icon}</div>}
        <CardTitle className="text-base font-semibold text-white">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="max-w-md text-sm text-slate-300">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      {hasAction && (
        <CardContent className="flex justify-center">
          {actionHref ? (
            <Button
              asChild
              className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
            >
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ) : (
            <Button
              onClick={onActionClick}
              className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
            >
              {actionLabel}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
