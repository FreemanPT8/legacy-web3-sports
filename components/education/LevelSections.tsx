'use client';



import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Lock, CheckCircle, ChevronDown, Award, BookOpen, Layers3, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ProgressSummary, StartCourseMeta } from '@/lib/education/progressSummary';

import type { LevelCourseSummary, StartHereState } from '@/lib/education/unlockEngine';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent, type Language } from '@/lib/i18n';
import { START_HERE_FALLBACK_ID, START_HERE_SLUG } from '@/lib/education/unlockLogic';

const START_COURSE_DESCRIPTION_FALLBACK: Record<Language, string> = {
  pt: 'Há momentos na vida em que o mundo muda mais rápido do que nós. Quando isso acontece, só há duas escolhas: fingir que nada se passa... ou reinventar-nos.',
  es: 'Hay momentos en la vida en los que el mundo cambia más rápido que nosotros. Cuando eso sucede, solo hay dos opciones: fingir que nada pasa... o reinventarnos.',
  en: 'There are moments in life when the world changes faster than we do. When that happens, there are only two choices: pretend nothing is happening... or reinvent ourselves.',
  fr: "Il y a des moments où le monde change plus vite que nous. Quand cela arrive, nous n'avons que deux options : faire semblant que rien ne se passe... ou nous réinventer.",
  it: 'Ci sono momenti in cui il mondo cambia più velocemente di noi. Quando succede, ci sono solo due scelte: fingere che nulla stia accadendo... oppure reinventarci.',
  de: 'Es gibt Momente, in denen sich die Welt schneller verändert als wir. Dann gibt es nur zwei Möglichkeiten: so tun, als würde nichts passieren... oder uns neu erfinden.',
};

const SUPPORTED_LANGUAGES = ['pt', 'es', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const COURSE_LEVEL_OVERRIDES_BY_ID: Record<string, string> = {
  [START_HERE_FALLBACK_ID]: 'cadets',
  '416b0b74-ec44-4aea-be62-50c3ee60af29': 'infantil',
};

const COURSE_LEVEL_OVERRIDES_BY_SLUG: Record<string, string> = {
  [START_HERE_SLUG]: 'cadets',
  '416b0b74-ec44-4aea-be62-50c3ee60af29': 'infantil',
};

type SectionCopy = {
  authRequired: string;
  loadingCourses: string;
  noCourses: string;
  coursesLoadError: string;
  progressLabel: string;
  startBadge: string;
  noImage: string;
  lockedBadge: string;
  lessonsProgress: string;
};

const SECTION_COPY: Record<SupportedLanguage, SectionCopy> = {
  pt: {
    authRequired: 'Autentica-te para explorar os cursos de cada nivel.',
    loadingCourses: 'A carregar cursos atribuidos a este nivel...',
    noCourses: 'Ainda nao existem cursos atribuidos a este nivel.',
    coursesLoadError: 'Nao foi possivel carregar os cursos associados aos niveis. Atualiza para tentar novamente.',
    progressLabel: 'Progresso',
    startBadge: 'Ponto de partida',
    noImage: 'Sem imagem',
    lockedBadge: 'Nivel bloqueado',
    lessonsProgress: 'licoes concluidas',
  },
  es: {
    authRequired: 'Autenticate para explorar los cursos de cada nivel.',
    loadingCourses: 'Cargando cursos asignados a este nivel...',
    noCourses: 'Todavia no existen cursos asignados a este nivel.',
    coursesLoadError: 'No fue posible cargar los cursos asociados a los niveles. Actualiza para intentarlo de nuevo.',
    progressLabel: 'Progreso',
    startBadge: 'Punto de partida',
    noImage: 'Sin imagen',
    lockedBadge: 'Nivel bloqueado',
    lessonsProgress: 'lecciones completadas',
  },
  en: {
    authRequired: 'Sign in to explore the courses inside each level.',
    loadingCourses: 'Loading courses assigned to this level...',
    noCourses: 'There are no courses assigned to this level yet.',
    coursesLoadError: 'We could not load the courses linked to these levels. Refresh to try again.',
    progressLabel: 'Progress',
    startBadge: 'Starting point',
    noImage: 'No image',
    lockedBadge: 'Level locked',
    lessonsProgress: 'lessons completed',
  },
};

const resolveLanguage = (value?: string | null): SupportedLanguage => {
  const lang = (value ?? 'pt').toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : 'pt';
};




type Props = {

  summary: ProgressSummary | null;

};



export function LevelSections({ summary }: Props) {

  const levels = summary?.levels || [];

  const rawCoursesByLevel = summary?.coursesByLevel || {};
  const coursesByLevel = useMemo(() => {
    const normalized: Record<string, LevelCourseSummary[]> = {};
    Object.entries(rawCoursesByLevel).forEach(([levelSlug, list]) => {
      const entries = Array.isArray(list) ? list : [];
      entries.forEach((course) => {
        const overrideSlug = resolveCourseLevelOverride(course);
        const targetSlug = overrideSlug || levelSlug;
        if (!normalized[targetSlug]) {
          normalized[targetSlug] = [];
        }
        normalized[targetSlug].push(course);
      });
    });
    return normalized;
  }, [rawCoursesByLevel]);
  const startCourseMeta = summary?.startCourse ?? null;

  const { language: activeLanguage, t } = useLanguage();
  const language: Language = (activeLanguage ?? 'en') as Language;
  const resolvedLanguage = resolveLanguage(activeLanguage);
  const copy = SECTION_COPY[resolvedLanguage];

  const [isMobile, setIsMobile] = useState(false);

  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const [fallbackRawCourses, setFallbackRawCourses] = useState<any[]>([]);

  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  const translate = (key: string, fallback: string) => {
    if (typeof t !== 'function') return fallback;
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const labelFallbacks: Record<keyof CourseCardLabels, Partial<Record<Language, string>>> = {
    unlocked: {
      pt: 'Podes aceder a este curso',
      es: 'Puedes acceder a este curso',
      en: 'You can access this course',
      fr: 'Tu peux acceder a ce cours',
      it: 'Puoi accedere a questo corso',
      de: 'Du kannst auf diesen Kurs zugreifen',
    },
    viewCourse: {
      pt: 'Ver curso',
      es: 'Ver curso',
      en: 'View course',
      fr: 'Voir le cours',
      it: 'Vedi corso',
      de: 'Kurs ansehen',
    },
    modules: {
      pt: 'modulos',
      es: 'modulos',
      en: 'modules',
      fr: 'modules',
      it: 'moduli',
      de: 'module',
    },
    lessons: {
      pt: 'licoes',
      es: 'lecciones',
      en: 'lessons',
      fr: 'lecons',
      it: 'lezioni',
      de: 'lektionen',
    },
    xpAvailable: {
      pt: 'XP disponivel',
      es: 'XP disponible',
      en: 'XP available',
      fr: 'XP disponible',
      it: 'XP disponibile',
      de: 'XP verfugbar',
    },
    completions: {
      pt: 'utilizadores concluiram',
      es: 'usuarios completaron',
      en: 'users completed',
      fr: 'utilisateurs ont termine',
      it: 'utenti hanno completato',
      de: 'nutzer haben abgeschlossen',
    },
    viewMore: {
      pt: 'Ver mais',
      es: 'Ver más',
      en: 'View more',
      fr: 'Voir plus',
      it: 'Vedi altro',
      de: 'Mehr anzeigen',
    },
  };

  const labelFallback = <K extends keyof CourseCardLabels>(
    key: K,
    defaultValue: string,
  ): string => {
    return (
      labelFallbacks[key]?.[language] ??
      labelFallbacks[key]?.[resolvedLanguage as Language] ??
      defaultValue
    );
  };

  const courseCardLabels = {
    unlocked: translate('courses.unlocked', labelFallback('unlocked', 'You can access this course')),
    viewCourse: translate('courses.viewDetails', labelFallback('viewCourse', 'View course')),
    modules: translate('courses.modules', labelFallback('modules', 'modules')),
    lessons: translate('courses.lessons', labelFallback('lessons', 'lessons')),
    xpAvailable: translate('courses.totalXP', labelFallback('xpAvailable', 'XP available')),
    completions: translate('courses.completions', labelFallback('completions', 'users completed')),
    viewMore: translate('courses.viewMore', labelFallback('viewMore', 'View more')),
  };



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
    return Object.values(rawCoursesByLevel).some(
      (list) => Array.isArray(list) && list.length > 0,
    );
  }, [rawCoursesByLevel]);

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
          setFallbackError(copy.coursesLoadError);
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
  }, [summary, hasServerCourses, copy]);

  useEffect(() => {
    if (fallbackError && fallbackError !== copy.coursesLoadError) {
      setFallbackError(copy.coursesLoadError);
    }
  }, [copy, fallbackError]);



  if (!summary) {

    return (

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">

        {copy.authRequired}

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
            labels={courseCardLabels}
            language={language}
            startCourseMeta={startCourseMeta}
            copy={copy}
            startHere={summary?.startHere ?? null}
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
  labels: CourseCardLabels;
  language: Language;
  startCourseMeta: StartCourseMeta | null;
  copy: SectionCopy;
  startHere: StartHereState | null;
};



function LevelSection({
  level,
  courses,
  isMobile,
  expanded,
  onToggle,
  isFallbackLoading,
  labels,
  language,
  startCourseMeta,
  copy,
  startHere,
}: LevelSectionProps) {

  const normalizedLevelSlug = normalizeLevelSlugValue(level.slug);
  const startCourseProgress =
    normalizedLevelSlug === 'cadets' && startHere
      ? startHere.progressPercent ?? 0
      : 0;
  const displayProgress = Math.max(level.progressPercent ?? 0, startCourseProgress);
  const lessonsProgressLabel =
    normalizedLevelSlug === 'cadets' &&
    startHere &&
    typeof startHere.totalLessons === 'number' &&
    startHere.totalLessons > 0
      ? `${startHere.completedLessons ?? 0}/${startHere.totalLessons} ${copy.lessonsProgress}`
      : null;

  const accent = level.accentColor || '#1ccfdd';

  const isLocked = !level.isUnlocked;



  return (

    <section

      className={cn(

        'rounded-3xl border border-white/10 bg-gradient-to-br from-[#031225]/70 via-[#01060d] to-[#000508] px-6 py-8 shadow-[0_25px_60px_rgba(3,10,20,0.65)]',

        isLocked && 'opacity-70',

      )}

      style={{ borderColor: `${accent}33` }}

    >

      {isMobile && (

        <button

          type="button"

          onClick={onToggle}

          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#041421]/80 px-4 py-3 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"

        >

          <div>

            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">

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

          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">

            {level.shortLabel || level.title}

          </p>

          <h3 className="mt-1 text-3xl font-semibold text-white">{level.title}</h3>

          <p className="text-sm text-slate-300">{formatRange(level.minXp, level.maxXp)}</p>

        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-300 md:items-end">

          <div className="flex items-center gap-2">

            <span className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">

              {copy.progressLabel}

            </span>

            <span className="text-sm text-white">

              {Math.min(displayProgress, 100)}%

            </span>

          </div>

          <div className="h-2 w-full min-w-[200px] rounded-full bg-white/10 md:w-64">

            <div

              className="h-2 rounded-full transition-all"

              style={{

                width: `${Math.min(displayProgress, 100)}%`,

                background: accent,

              }}

            />

          </div>

          {lessonsProgressLabel && (
            <p className="text-xs text-slate-400 mt-1">{lessonsProgressLabel}</p>
          )}

        </div>

      </div>



      <div

        className={cn(

          'mt-6 grid gap-4 md:grid-cols-2 place-items-start',

          isMobile && !expanded && 'hidden',

        )}

      >

        {courses.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-white/15 bg-[#01050b]/60 p-4 text-sm text-slate-300">

            {isFallbackLoading

              ? copy.loadingCourses

              : copy.noCourses}

          </div>

        ) : (

          courses.map((course) => (

            <CourseCard
              key={course.id}
              course={course}
              level={level}
              accent={accent}
              labels={labels}
              language={language}
              isLevelLocked={isLocked}
              startCourseMeta={startCourseMeta}
              copy={copy}
            />

          ))

        )}

      </div>

    </section>

  );

}



type CourseCardLabels = {
  unlocked: string;
  viewCourse: string;
  modules: string;
  lessons: string;
  xpAvailable: string;
  completions: string;
  viewMore: string;
};

function CourseCard({
  course,
  level,
  accent,
  isLevelLocked,
  labels,
  language,
  startCourseMeta,
  copy,
}: {
  course: LevelCourseSummary;
  level: ProgressSummary['levels'][number];
  accent: string;
  isLevelLocked: boolean;
  labels: CourseCardLabels;
  language: Language;
  startCourseMeta: StartCourseMeta | null;
  copy: SectionCopy;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isPrimaryStartCourse =
    course.isStartCourse ||
    (!!startCourseMeta &&
      (course.slug === startCourseMeta.slug ||
        course.id === startCourseMeta.slug ||
        course.id === START_HERE_FALLBACK_ID));
  const startMeta = isPrimaryStartCourse ? startCourseMeta : null;
  const startMetaLanguages =
    startMeta && Array.isArray(startMeta.available_languages) && startMeta.available_languages.length > 0
      ? startMeta.available_languages
      : null;
  const courseLanguages =
    startMetaLanguages ||
    (Array.isArray(course.availableLanguages) && course.availableLanguages.length > 0
      ? course.availableLanguages
      : null);
  const coverUrl = course.coverImageUrl;
  const resolvedSlug = isPrimaryStartCourse
    ? START_HERE_FALLBACK_ID
    : course.slug || course.id;
  const courseHref = `/education/courses/${resolvedSlug}`;
  const levelLabel = level.shortLabel || level.title;
  const localizedTitle =
    resolveLocalizedField(startMeta?.title, language) ||
    (course.titleI18n ? resolveLocalizedField(course.titleI18n, language) : null) ||
    resolveLocalizedField(course.title, language) ||
    levelLabel ||
    '';
  const localizedDescriptionRaw =
    resolveLocalizedField(startMeta?.description, language) ||
    (course.descriptionI18n ? resolveLocalizedField(course.descriptionI18n, language) : null) ||
    resolveLocalizedField(course.description, language) ||
    (isPrimaryStartCourse
      ? START_COURSE_DESCRIPTION_FALLBACK[language] ||
        START_COURSE_DESCRIPTION_FALLBACK.en
      : '');
  const localizedDescription = sanitizeDescription(localizedDescriptionRaw);
  const modulesCount = typeof course.modulesCount === 'number' ? course.modulesCount : 0;
  const lessonsCount = typeof course.lessonsCount === 'number' ? course.lessonsCount : 0;
  const totalXp = typeof course.totalXp === 'number' ? course.totalXp : null;
  const completionsCount =
    typeof course.completionsCount === 'number' ? course.completionsCount : 0;
  const hasDescription = Boolean(localizedDescription);

  return (
    <div
      className={cn(
        'w-full max-w-[380px] rounded-3xl border border-white/10 bg-gradient-to-b from-[#05182c] via-[#020912] to-[#000508] p-4 shadow-[0_30px_65px_rgba(3,10,25,0.6)] transition hover:border-cyan-400/60 hover:shadow-[0_0_35px_rgba(34,211,238,0.35)] focus-within:border-cyan-200/70 mx-auto md:mx-0',
        isLevelLocked && 'opacity-70',
      )}
      style={{ borderColor: isLevelLocked ? '#1e293b40' : `${accent}55` }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#010915]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={localizedTitle || (typeof course.title === 'string' ? course.title : 'course cover')}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-44 items-center justify-center bg-gradient-to-br from-cyan-500/20 via-sky-500/15 to-indigo-900/30 text-xs uppercase tracking-[0.3em] text-cyan-100">
            {copy.noImage}
          </div>
        )}
        {course.isStartCourse && (
          <span className="absolute left-3 top-3 rounded-full border border-cyan-300/70 bg-[#021727]/90 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-cyan-100">
            {copy.startBadge}
          </span>
        )}
        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-white/40 bg-[#010b15]/90 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-slate-100">
            {levelLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <h4 className="text-lg font-semibold text-white">{localizedTitle}</h4>
          {hasDescription && (
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              <p className="line-clamp-3">{localizedDescription}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="rounded-full border border-cyan-400/40 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
                >
                  {labels.viewMore}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          {course.isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 px-3 py-1 text-[11px] text-emerald-200">
              <CheckCircle className="h-3 w-3" /> Concluido
            </span>
          )}
          {courseLanguages && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-cyan-100">
              {courseLanguages.map((lang) => lang?.toUpperCase()).join(' / ')}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-slate-200">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-cyan-300" />
            <span>{modulesCount} {labels.modules}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-300" />
            <span>{lessonsCount} {labels.lessons}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-cyan-300" />
            <span>{totalXp ? `${totalXp.toLocaleString()} ${labels.xpAvailable}` : labels.xpAvailable}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <span>{completionsCount.toLocaleString()} {labels.completions}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-[0.25em]',
              isLevelLocked
                ? 'border-amber-400/30 bg-amber-500/5 text-amber-100/80'
                : 'border-emerald-400/30 bg-emerald-500/5 text-emerald-100/80',
            )}
          >
            {isLevelLocked ? (
              <>
                <Lock className="h-3 w-3" /> {copy.lockedBadge}
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" /> {labels.unlocked}
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Link href={courseHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 px-5 text-[#00121c] font-semibold shadow-[0_10px_25px_rgba(8,145,178,0.35)] transition hover:from-cyan-400 hover:via-sky-400 hover:to-emerald-300"
                disabled={isLevelLocked}
              >
                {labels.viewCourse}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-[#01050b] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{localizedTitle}</DialogTitle>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{levelLabel}</p>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-200">
            {coverUrl && (
              <img
                src={coverUrl}
                alt={localizedTitle || 'course cover'}
                className="h-40 w-full rounded-2xl object-cover"
              />
            )}
            {hasDescription && <p className="text-slate-300">{localizedDescription}</p>}
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-slate-300">
              <div className="flex items-center justify-between">
                <span>{labels.modules}</span>
                <strong className="text-white normal-case tracking-normal text-base">{modulesCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>{labels.lessons}</span>
                <strong className="text-white normal-case tracking-normal text-base">{lessonsCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>{labels.xpAvailable}</span>
                <strong className="text-white normal-case tracking-normal text-base">
                  {totalXp ? totalXp.toLocaleString() : '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>{labels.completions}</span>
                <strong className="text-white normal-case tracking-normal text-base">
                  {completionsCount.toLocaleString()}
                </strong>
              </div>
            </div>
            {courseLanguages && (
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Idiomas:{' '}
                <span className="text-slate-200">
                  {courseLanguages.map((lang) => lang?.toUpperCase()).join(' / ')}
                </span>
              </div>
            )}
            <div className="flex justify-end">
              <Link href={courseHref} onClick={() => setDetailsOpen(false)}>
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 px-5 text-[#00121c] font-semibold shadow-[0_10px_25px_rgba(8,145,178,0.35)] transition hover:from-cyan-400 hover:via-sky-400 hover:to-emerald-300"
                  disabled={isLevelLocked}
                >
                  {labels.viewCourse}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function resolveLocalizedField(raw: any, language: Language): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return getMultilingualContent(raw as Record<string, string>, language) || null;
  }
  return null;
}

function sanitizeDescription(value: string): string {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatRange(min?: number | null, max?: number | null) {

  const lower = typeof min === 'number' ? min.toLocaleString() : '0';

  if (typeof max === 'number') {

    return `${lower}-${max.toLocaleString()} XP`;

  }

  return `${lower}+ XP`;

}

function normalizeLevelSlugValue(value?: string | null): string {
  const normalized = normalizeSlugCandidate(value);
  if (normalized) return normalized;
  return typeof value === 'string' ? value : '';
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
  const overrideSlug = resolveCourseLevelOverride(course);
  if (overrideSlug) {
    return overrideSlug;
  }
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

function resolveCourseLevelOverride(course: any): string | undefined {
  if (!course) return undefined;
  const idKey = typeof course.id === 'string' ? course.id : undefined;
  const slugKey =
    typeof course.slug === 'string'
      ? course.slug.toLowerCase()
      : undefined;
  return (
    (idKey && COURSE_LEVEL_OVERRIDES_BY_ID[idKey]) ||
    (slugKey && COURSE_LEVEL_OVERRIDES_BY_SLUG[slugKey])
  );
}

function transformCourseRecord(course: any, language: Language): LevelCourseSummary | null {
  if (!course?.id) {
    return null;
  }

  const titleRecord =
    course.title && typeof course.title === 'object' && !Array.isArray(course.title)
      ? (course.title as Record<string, string>)
      : undefined;
  const descriptionRecord =
    course.description && typeof course.description === 'object' && !Array.isArray(course.description)
      ? (course.description as Record<string, string>)
      : undefined;

  const title =
    (titleRecord ? getMultilingualContent(titleRecord, language) : '') ||
    (typeof course.title === 'string' ? course.title : '') ||
    course.slug ||
    'Curso';

  const description =
    (descriptionRecord ? getMultilingualContent(descriptionRecord, language) : '') ||
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

  const completionsCount =
    typeof course.completions_count === 'number'
      ? course.completions_count
      : typeof course.completionsCount === 'number'
        ? course.completionsCount
        : typeof course.total_completions === 'number'
          ? course.total_completions
          : typeof course.stats?.completions === 'number'
            ? course.stats.completions
            : undefined;

  return {
    id: course.id,
    slug: resolvedSlug,
    title,
    titleI18n: titleRecord,
    isRequired: course.is_required_in_level !== false,
    isStartCourse: Boolean(course.is_start_course),
    isCompleted: false,
    coverImageUrl,
    description,
    descriptionI18n: descriptionRecord,
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
    completionsCount: completionsCount ?? 0,
  };
}




















