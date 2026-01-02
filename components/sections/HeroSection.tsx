import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeroSectionProps = {
  children: ReactNode;
  className?: string;
  overlayVariant?: 'default' | 'inverse';
};

export function HeroSection({
  children,
  className,
  overlayVariant = 'default',
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-2xl shadow-black/40',
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        {overlayVariant === 'inverse' ? (
          <>
            <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          </>
        )}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

type HeroTextProps = {
  children: ReactNode;
  className?: string;
};

export const HeroEyebrow = ({ children, className }: HeroTextProps) => (
  <p className={cn('text-xs uppercase tracking-[0.6em] text-cyan-300', className)}>
    {children}
  </p>
);

export const HeroTitle = ({ children, className }: HeroTextProps) => (
  <h1 className={cn('text-3xl font-semibold text-[#fdd87c] md:text-4xl', className)}>
    {children}
  </h1>
);

export const HeroDescription = ({ children, className }: HeroTextProps) => (
  <p className={cn('text-sm text-slate-300 md:text-base', className)}>{children}</p>
);

export const HeroContent = ({ children, className }: HeroTextProps) => (
  <div className={cn('relative grid gap-10 lg:grid-cols-2', className)}>{children}</div>
);

export const HeroTextColumn = ({ children, className }: HeroTextProps) => (
  <div className={cn('space-y-6', className)}>{children}</div>
);

export const HeroMedia = ({ children, className }: HeroTextProps) => (
  <div className={cn('relative h-72 w-full overflow-hidden rounded-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.65)]', className)}>
    {children}
  </div>
);
