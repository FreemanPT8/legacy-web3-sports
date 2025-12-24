'use client';

import Link from 'next/link';
import { ArrowRight, Lock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressSummary } from '@/lib/education/progressSummary';
import type { LevelCourseSummary } from '@/lib/education/unlockEngine';
import { Button } from '@/components/ui/button';

type Props = {
  summary: ProgressSummary | null;
};

export function LevelSections({ summary }: Props) {
  if (!summary) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        Autentica-te para explorar os cursos de cada nível.
      </div>
    );
  }

  const { levels, coursesByLevel } = summary;

  return (
    <div className="space-y-10">
      {levels.map((level) => {
        const courses = coursesByLevel[level.slug] || [];
        return (
          <LevelSection key={level.slug} level={level} courses={courses} />
        );
      })}
    </div>
  );
}

type LevelSectionProps = {
  level: ProgressSummary['levels'][number];
  courses: LevelCourseSummary[];
};

function LevelSection({ level, courses }: LevelSectionProps) {
  const accent = level.accentColor || '#1ccfdd';
  const isLocked = !level.isUnlocked;

  return (
    <section
      className={cn(
        'rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 px-6 py-8 shadow-[0_20px_60px_rgba(2,6,12,0.55)]',
        isLocked && 'opacity-70',
      )}
      style={{
        borderColor: `${accent}33`,
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            {level.shortLabel || level.title}
          </p>
          <h3 className="mt-1 text-3xl font-semibold text-white">{level.title}</h3>
          <p className="text-sm text-slate-300">
            {formatRange(level.minXp, level.maxXp)}
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-300 md:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Progresso
            </span>
            <span className="text-sm text-white">
              {Math.min(level.progressPercent, 100)}%
            </span>
          </div>
          <div className="h-2 w-full min-w-[200px] rounded-full bg-white/10 md:w-64">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(level.progressPercent, 100)}%`,
                background: accent,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-4 text-sm text-slate-300">
            Ainda não existem cursos atribuídos a este nível.
          </div>
        ) : (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              accent={accent}
              isLevelLocked={isLocked}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CourseCard({
  course,
  accent,
  isLevelLocked,
}: {
  course: LevelCourseSummary;
  accent: string;
  isLevelLocked: boolean;
}) {
  const isLocked = isLevelLocked;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-white/10 bg-[#050b12] p-4 transition hover:border-white/30',
        isLocked && 'opacity-60',
      )}
      style={{
        borderColor: `${accent}33`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold text-white">{course.title}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {course.isRequired && (
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em] text-[10px] text-slate-300">
                Obrigatório
              </span>
            )}
            {course.isStartCourse && (
              <span className="rounded-full border border-cyan-300/50 px-3 py-1 uppercase tracking-[0.3em] text-[10px] text-cyan-200">
                Ponto de partida
              </span>
            )}
            {course.isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200">
                <CheckCircle className="h-3 w-3" />
                Concluído
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {course.slug ? `/${course.slug}` : ''}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {isLocked ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Lock className="h-4 w-4 text-slate-400" />
            <span>Nível bloqueado</span>
          </div>
        ) : (
          <Link href={course.slug ? `/education/courses/${course.slug}` : '#'}>
            <Button
              variant="ghost"
              className="text-white hover:text-cyan-300"
            >
              Aceder curso
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function formatRange(min?: number | null, max?: number | null) {
  const lower = typeof min === 'number' ? min.toLocaleString() : '0';
  if (typeof max === 'number') {
    return `${lower}-${max.toLocaleString()} XP`;
  }
  return `${lower}+ XP`;
}
