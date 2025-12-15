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
        'border border-dashed border-border bg-card/60 text-center',
        className,
      )}
    >
      <CardHeader className="flex flex-col items-center space-y-3">
        {icon && <div className="text-primary">{icon}</div>}
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="max-w-md text-sm text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      {hasAction && (
        <CardContent className="flex justify-center">
          {actionHref ? (
            <Button asChild>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ) : (
            <Button onClick={onActionClick}>{actionLabel}</Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

