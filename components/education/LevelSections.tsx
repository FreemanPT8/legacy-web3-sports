'use client';



import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Lock, CheckCircle, ChevronDown, Award, BookOpen, Layers3 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ProgressSummary } from '@/lib/education/progressSummary';

import type { LevelCourseSummary } from '@/lib/education/unlockEngine';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent, type Language } from '@/lib/i18n';



type Props = {

  summary: ProgressSummary | null;

};



export function LevelSections({ summary }: Props) {

  const levels = summary?.levels || [];

  const coursesByLevel = summary?.coursesByLevel || {};

  const { language: activeLanguage } = useLanguage();
  const language: Language = (activeLanguage ?? 'en') as Language;

  const [isMobile, setIsMobile] = useState(false);

  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const [fallbackRawCourses, setFallbackRawCourses] = useState<any[]>([]);

  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const [isFallbackLoading, setIsFallbackLoading] = useState(false);



  useEffect(() => {

    const handleResize = () => {

      if (typeof window === 'undefined') return;

      setIsMobile(window.innerWidth < 768);

    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);

  }, []);



  useEffect(() => {

    if (!isMobile) {

      setExpandedSlug(null);

      return;

    }

    if (!expandedSlug && levels.length > 0) {

      setExpandedSlug(levels[0].slug);

    }

  }, [isMobile, levels, expandedSlug]);



  const hasServerCourses = useMemo(() => {
    if (!summary || !summary.coursesByLevel) return false;
    return Object.values(summary.coursesByLevel).some(
      (list) => Array.isArray(list) && list.length > 0,
    );
  }, [summary]);

  const fallbackCoursesByLevel = useMemo(() => {
    if (fallbackRawCourses.length === 0) return {};
    return buildFallbackCoursesMap(fallbackRawCourses, language);
  }, [fallbackRawCourses, language]);

  useEffect(() => {
    if (!summary || hasServerCourses) {
      setFallbackRawCourses([]);
      setFallbackError(null);
      setIsFallbackLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadFallbackCourses() {
      setIsFallbackLoading(true);
      setFallbackError(null);
      try {
        const response = await fetch('/api/courses?includeModules=true', {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load courses');
        }
        if (!cancelled) {
          setFallbackRawCourses(Array.isArray(data.courses) ? data.courses : []);
        }
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;
        console.error('LevelSections fallback error:', error);
        if (!cancelled) {
          setFallbackError('N?o foi poss?vel carregar os cursos associados aos n?veis. Atualiza para tentar novamente.');
        }
      } finally {
        if (!cancelled) {
          setIsFallbackLoading(false);
        }
      }
    }

    void loadFallbackCourses();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [summary, hasServerCourses]);



  if (!summary) {

    return (

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">

        Autentica-te para explorar os cursos de cada n?vel.

      </div>

    );

  }



  return (

    <div className="space-y-6">

      {fallbackError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {fallbackError}
        </div>
      )}

      {levels.map((level) => {

        const fallbackCourses = fallbackCoursesByLevel[level.slug] || [];
        const courses =
          coursesByLevel[level.slug] && coursesByLevel[level.slug].length > 0
            ? coursesByLevel[level.slug]
            : fallbackCourses;

        const expanded = !isMobile || expandedSlug === level.slug;

        return (

          <LevelSection

            key={level.slug}

            level={level}

            courses={courses}

            isMobile={isMobile}

            expanded={expanded}

            onToggle={() =>

              setExpandedSlug((prev) => (prev === level.slug ? null : level.slug))

            }

            isFallbackLoading={isFallbackLoading}

          />

        );

      })}

    </div>

  );

}



type LevelSectionProps = {

  level: ProgressSummary['levels'][number];

  courses: LevelCourseSummary[];

  isMobile: boolean;

  expanded: boolean;

  onToggle: () => void;

  isFallbackLoading: boolean;

};



function LevelSection({

  level,

  courses,

  isMobile,

  expanded,

  onToggle,
  isFallbackLoading,

}: LevelSectionProps) {

  const accent = level.accentColor || '#1ccfdd';

  const isLocked = !level.isUnlocked;



  return (

    <section

      className={cn(

        'rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 px-6 py-8 shadow-[0_20px_60px_rgba(2,6,12,0.55)]',

        isLocked && 'opacity-70',

      )}

      style={{ borderColor: `${accent}33` }}

    >

      {isMobile && (

        <button

          type="button"

          onClick={onToggle}

          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"

        >

          <div>

            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">

              {level.shortLabel || level.title}

            </p>

            <p className="text-lg font-semibold">{level.title}</p>

            <p className="text-xs text-slate-400">{formatRange(level.minXp, level.maxXp)}</p>

          </div>

          <ChevronDown

            className={cn(

              'h-5 w-5 text-slate-300 transition-transform',

              expanded ? 'rotate-180' : 'rotate-0',

            )}

          />

        </button>

      )}



      <div

        className={cn(

          'mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between',

          isMobile && !expanded && 'hidden',

        )}

      >

        <div>

          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">

            {level.shortLabel || level.title}

          </p>

          <h3 className="mt-1 text-3xl font-semibold text-white">{level.title}</h3>

          <p className="text-sm text-slate-300">{formatRange(level.minXp, level.maxXp)}</p>

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



      <div

        className={cn(

          'mt-6 grid gap-4 md:grid-cols-2',

          isMobile && !expanded && 'hidden',

        )}

      >

        {courses.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-4 text-sm text-slate-300">

            {isFallbackLoading

              ? 'A carregar cursos atribu?dos a este n?vel...'

              : 'Ainda n?o existem cursos atribu?dos a este n?vel.'}

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
  const courseLanguages =
    Array.isArray(course.availableLanguages) && course.availableLanguages.length > 0
      ? course.availableLanguages
      : null;
  const coverUrl = course.coverImageUrl;
  const courseHref = course.slug
    ? `/education/courses/${course.slug}`
    : `/education/courses/${course.id}`;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#050b12] p-4 transition hover:border-white/30 focus-within:border-cyan-200/60',
        isLocked && 'opacity-60',
      )}
      style={{ borderColor: `${accent}33` }}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5 md:w-60">
          {coverUrl ? (
            <img src={coverUrl} alt={course.title} className="h-40 w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-cyan-500/20 to-slate-900/40 text-xs uppercase tracking-[0.3em] text-white/70">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-white">{course.title}</h4>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {course.isRequired && (
                  <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em] text-[10px] text-slate-300">
                    Obrigat?rio
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
                    Conclu?do
                  </span>
                )}
                {courseLanguages && (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-300">
                    {courseLanguages.map((lang) => lang?.toUpperCase()).join(' · ')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-400">{course.slug ? `/${course.slug}` : ''}</div>
          </div>

          {course.description && (
            <p className="text-sm text-slate-300 line-clamp-3">{course.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            {typeof course.modulesCount === 'number' && (
              <span className="inline-flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-cyan-300" />
                {course.modulesCount} m?dulos
              </span>
            )}
            {typeof course.lessonsCount === 'number' && (
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-300" />
                {course.lessonsCount} li??es
              </span>
            )}
            {typeof course.totalXp === 'number' && (
              <span className="inline-flex items-center gap-2">
                <Award className="h-4 w-4 text-cyan-300" />
                {course.totalXp.toLocaleString()} XP dispon?vel
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {isLocked ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Lock className="h-4 w-4 text-slate-400" />
            <span>N?vel bloqueado</span>
          </div>
        ) : (
          <Link href={courseHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <Button variant="ghost" className="text-white hover:text-cyan-300">
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


const LEVEL_SLUG_NORMALIZATION: Record<string, string> = {
  novato: 'cadets',
  cadete: 'cadets',
  cadets: 'cadets',
  cadet: 'cadets',
  youth: 'infantil',
  infantil: 'infantil',
  beginner: 'cadets',
  intermediate: 'infantil',
  advanced: 'juveniles',
  juvenil: 'juveniles',
  juvenis: 'juveniles',
  juvenile: 'juveniles',
  junior: 'juniors',
  juniors: 'juniors',
  senior: 'seniors',
  seniors: 'seniors',
  legend: 'legend',
  master: 'master',
  'hall da fama': 'hall-of-fame',
  'hall of fame': 'hall-of-fame',
  hall: 'hall-of-fame',
};

const BUILDER_LEVEL_TO_SLUG: Record<string, string> = {
  beginner: 'cadets',
  intermediate: 'infantil',
  advanced: 'juveniles',
};

function normalizeSlugCandidate(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (!lowered) return null;
  return LEVEL_SLUG_NORMALIZATION[lowered] || lowered;
}

function normalizeLevelSlugFromCourse(course: any): string | null {
  const slugCandidates = [
    course?.academy_level_slug,
    course?.academyLevelSlug,
    course?.curriculum?.metadata?.academyLevelSlug,
  ];

  for (const candidate of slugCandidates) {
    const normalized = normalizeSlugCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (course?.level && BUILDER_LEVEL_TO_SLUG[course.level]) {
    return BUILDER_LEVEL_TO_SLUG[course.level];
  }

  if (course?.is_start_course) {
    return 'cadets';
  }

  if (typeof course?.xp_threshold === 'number') {
    const xp = course.xp_threshold;
    if (xp <= 0) return 'cadets';
    if (xp < 369) return 'infantil';
    if (xp < 1000) return 'juveniles';
    if (xp < 2222) return 'juniors';
    if (xp < 3333) return 'seniors';
    if (xp < 5000) return 'hall-of-fame';
    if (xp < 10000) return 'master';
    return 'legend';
  }

  return null;
}

function buildFallbackCoursesMap(
  courses: any[],
  language: Language,
): Record<string, LevelCourseSummary[]> {
  return courses.reduce((acc, course) => {
    const normalizedSlug = normalizeLevelSlugFromCourse(course);
    if (!normalizedSlug) {
      return acc;
    }
    const formatted = transformCourseRecord(course, language);
    if (!formatted) {
      return acc;
    }
    if (!acc[normalizedSlug]) {
      acc[normalizedSlug] = [];
    }
    acc[normalizedSlug].push(formatted);
    return acc;
  }, {} as Record<string, LevelCourseSummary[]>);
}

function transformCourseRecord(course: any, language: Language): LevelCourseSummary | null {
  if (!course?.id) {
    return null;
  }

  const title =
    getMultilingualContent(course.title, language) ||
    (typeof course.title === 'string' ? course.title : '') ||
    course.slug ||
    'Curso';

  const description =
    getMultilingualContent(course.description, language) ||
    (typeof course.description === 'string' ? course.description : '') ||
    '';

  const modulesArray = Array.isArray(course.modules) ? course.modules : [];
  const lessonsCountFallback = modulesArray.reduce(
    (acc: number, module: any) =>
      acc + (Array.isArray(module.lessons) ? module.lessons.length : 0),
    0,
  );

  const resolvedSlug =
    typeof course.slug === 'string' && course.slug.length > 0
      ? course.slug
      : null;

  const availableLanguages = Array.isArray(course.available_languages)
    ? course.available_languages
    : Array.isArray(course.availableLanguages)
      ? course.availableLanguages
      : undefined;

  const coverImageUrl =
    course.image_url ||
    course.thumbnail_url ||
    course.curriculum?.metadata?.coverImage ||
    course.curriculum?.metadata?.coverAsset?.url ||
    course.seo?.ogImageUrl ||
    course.seo?.coverImageUrl ||
    null;

  return {
    id: course.id,
    slug: resolvedSlug,
    title,
    isRequired: course.is_required_in_level !== false,
    isStartCourse: Boolean(course.is_start_course),
    isCompleted: false,
    coverImageUrl,
    description,
    availableLanguages,
    modulesCount:
      typeof course.total_modules === 'number'
        ? course.total_modules
        : modulesArray.length,
    lessonsCount:
      typeof course.total_lessons === 'number'
        ? course.total_lessons
        : lessonsCountFallback,
    totalXp:
      typeof course.total_xp === 'number'
        ? course.total_xp
        : undefined,
  };
}
