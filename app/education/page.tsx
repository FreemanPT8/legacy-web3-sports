'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Zap } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { XP_LEVELS, getXpLevelLabel, type XpLevelKey } from '@/lib/education/xpLevels';

import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const EDUCATION_LANGUAGES = ['pt', 'es', 'en'] as const;
type EducationLanguage = (typeof EDUCATION_LANGUAGES)[number];

const resolveEducationLanguage = (lang: string): EducationLanguage => {
  if (EDUCATION_LANGUAGES.includes(lang as EducationLanguage)) {
    return lang as EducationLanguage;
  }
  return 'en';
};

const LANDING_COPY: Record<EducationLanguage, Record<string, string | string[]>> = {
  pt: {
    heroTitle: 'Academia Web3 Gratuita com foco na Apertum Blockchain',
    heroSubtitle:
      'Educação estruturada para homens e mulheres, em qualquer parte do mundo. Especial atenção ao desporto — mas aberta a qualquer pessoa com curiosidade e cabeça.',
    heroTension: 'A Web3 já está em produção. A maioria entra tarde e sem contexto.',
    heroTrust: 'Sem custos. Sem promessas fáceis. Níveis guiados por XP e método.',
    heroPrimaryCta: 'Começar como Cadete (COMEÇA AQUI)',
    heroSecondaryCta: 'Explorar a Academia',
    heroAnchor: 'Educação antes de exposição.',
    cadetTitle: 'Começa como Cadete. Sem decisões extras.',
    cadetDesc:
      'O Cadete explica o legado, os desbloqueios e como usar o glossário. Serve para alinhar expectativas e ganhar clareza.',
    cadetCta: 'Descrição do Cadete',
    glossaryEyebrow: 'GLOSSÁRIO LEGACY',
    glossaryTitle: 'Aprende sem quebrar o fio.',
    glossaryDesc:
      'Termos técnicos aparecem com definições instantâneas para seguir as aulas sem abrir separadores.',
    glossaryBullets: [
      'Definições curtas e atualizadas',
      'Dentro das aulas e artigos',
      'Reduz ruído e acelera aprendizagem',
    ],
    glossaryCta: 'Abrir Glossário',
    glossaryMicro: 'Glossário é conteúdo privado. Requer login.',
    xpEyebrow: 'SISTEMA XP',
    xpTitle: 'XP prova consistência e abertura.',
    xpDesc: 'Cada lição gera XP, mostra streaks e desbloqueia o próximo passo com segurança.',
    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'A performance fica visível.',
    leaderboardDesc: 'Mostra quem aparece, aprende e progride. Sem hype, só continuação real.',
    finalCta: 'Ver cursos',
  },
  es: {
    heroTitle: 'Academia Web3 gratuita centrada en la cadena Apertum',
    heroSubtitle:
      'Educación estructurada para mujeres y hombres en todo el mundo. Enfocado en deportes pero abierto a cualquiera con curiosidad real.',
    heroTension: 'La Web3 ya está en producción. La mayoría entra tarde y sin contexto.',
    heroTrust: 'Sin costos. Sin promesas fáciles. Niveles y XP guiados.',
    heroPrimaryCta: 'Empezar como Cadete (EMPIEZA AQUÍ)',
    heroSecondaryCta: 'Explorar la Academia',
    heroAnchor: 'Educación antes de exposición.',
    cadetTitle: 'Comienza como Cadete. Sin decisiones extras.',
    cadetDesc: 'El Cadete explica el legado y cómo usar el glosario para que todo tenga sentido.',
    cadetCta: 'Sobre el Cadete',
    glossaryEyebrow: 'GLOSARIO LEGACY',
    glossaryTitle: 'Aprende sin romper el hilo.',
    glossaryDesc: 'Los términos se definen en el momento para seguir la clase sin pestañas adicionales.',
    glossaryBullets: ['Definiciones claras', 'Dentro de las lecciones', 'Menos ruido, más ritmo'],
    glossaryCta: 'Abrir Glosario',
    glossaryMicro: 'El glosario es contenido privado. Requiere login.',
    xpEyebrow: 'SISTEMA XP',
    xpTitle: 'XP prueba consistencia y compromiso.',
    xpDesc: 'Cada lección genera XP y muestra quién está listo para avanzar con confianza.',
    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'La performance se vuelve visible.',
    leaderboardDesc: 'Muestra quién aparece, aprende y progresa sin hype.',
    finalCta: 'Ver cursos',
  },
  en: {
    heroTitle: 'Free Web3 Academy focused on the Apertum Blockchain',
    heroSubtitle:
      'Structured education for women and men everywhere. Special attention to sports pros and serious enthusiasts.',
    heroTension: 'Web3 is already in production. Most people arrive late and without context.',
    heroTrust: 'No cost. No easy promises. Levels and XP with method.',
    heroPrimaryCta: 'Start as Cadet (START HERE)',
    heroSecondaryCta: 'Explore the Academy',
    heroAnchor: 'Education before exposure.',
    cadetTitle: 'Start as Cadet. No extra decisions.',
    cadetDesc: 'Cadet explains the legacy, unlocks and how to use the glossary to stay focused.',
    cadetCta: 'About Cadet',
    glossaryEyebrow: 'LEGACY GLOSSARY',
    glossaryTitle: 'Learn without breaking your flow.',
    glossaryDesc: 'Terms gain instant definitions so you keep moving inside each lesson.',
    glossaryBullets: ['Clear definitions', 'Inside lessons and posts', 'Less noise, more learning'],
    glossaryCta: 'Open Glossary',
    glossaryMicro: 'The glossary is private content. Login required.',
    xpEyebrow: 'XP SYSTEM',
    xpTitle: 'XP proves consistency and readiness.',
    xpDesc: 'Every lesson adds XP, shows streaks, and unlocks the right next step.',
    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'Performance becomes visible.',
    leaderboardDesc: 'Shows who shows up, learns, and moves forward without hype.',
    finalCta: 'See courses',
  },
};

const buildLevelCopy = (lang: EducationLanguage) =>
  XP_LEVELS.map((level) => ({
    title: level.translations[lang].title,
    range: level.translations[lang].range,
  }));

const XP_LEVEL_BLOCK_COPY: Record<EducationLanguage, { title: string; range: string }[]> = {
  pt: buildLevelCopy('pt'),
  es: buildLevelCopy('es'),
  en: buildLevelCopy('en'),
};

const PREVIEW_LEVELS: Record<EducationLanguage, { title: string; range: string }[]> = {
  pt: XP_LEVEL_BLOCK_COPY.pt.slice(0, 4),
  es: XP_LEVEL_BLOCK_COPY.es.slice(0, 4),
  en: XP_LEVEL_BLOCK_COPY.en.slice(0, 4),
};

const stringValue = (input: string | string[]) =>
  Array.isArray(input) ? input.join(' ') : input;

const translate = (
  t: (key: string) => string,
  key: string,
  fallback: string,
  options?: { preferFallback?: boolean },
) => {
  if (options?.preferFallback) return fallback;
  const value = t(key);
  if (!value || value === key) return fallback;
  return value;
};

export default function EducationPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const educationLanguage = resolveEducationLanguage(language);
  const copy = LANDING_COPY[educationLanguage];
  const previewLevels = PREVIEW_LEVELS[educationLanguage];

  const gate = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/education/stats');
        const data = await response.json();
        if (data?.success) {
          setStats(data.stats);
          setTopCourses(data.topCourses || []);
          setLeaderboard(data.topLeaderboard || []);
        }
      } catch (error) {
        console.error('Failed to fetch education stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const featuredCourses = useMemo(() => topCourses.slice(0, 3), [topCourses]);
  const leaderboardTop = leaderboard.slice(0, 3);

  const formatStat = (value?: number | null) => (value === null || value === undefined ? (loading ? '...' : '0') : value.toLocaleString());

  const xpProofs = [
    translate(t, 'education.xp.proofOne', 'Cada lição concluída deixa rasto.'),
    translate(t, 'education.xp.proofTwo', 'Vês streaks e progressão.'),
  ];

  const xpParagraph = translate(t, 'education.xp.desc', stringValue(copy.xpDesc), { preferFallback: true });

  const handleCourseLink = (course: any) => gate('/education/courses');

  const getLevel = (xp: number | undefined) => getXpLevelLabel(xp ?? 0);

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />

      <main className="flex-1 space-y-12">
        {/* BLOCK 1: HERO */}
        <HeroSection className="px-6 py-16" overlayVariant="inverse">
          <div className="relative mx-auto max-w-6xl">
            <HeroContent className="lg:items-center">
              <HeroTextColumn>
                <div className="space-y-3">
                  <HeroEyebrow>{t('nav.education')}</HeroEyebrow>
                  <HeroTitle className="leading-tight font-bold tracking-tight text-[#fdd87c] text-4xl md:text-6xl">
                    {translate(t, 'education.hero.title', stringValue(copy.heroTitle))}
                  </HeroTitle>
                  <HeroDescription className="text-base text-slate-100">
                    {translate(t, 'education.hero.subtitle', stringValue(copy.heroSubtitle))}
                  </HeroDescription>
                  <HeroDescription className="text-slate-200">
                    {translate(t, 'education.hero.tension', stringValue(copy.heroTension))}
                  </HeroDescription>
                  <p className="text-sm font-semibold text-cyan-200/90">{copy.heroAnchor}</p>
                  <p className="text-xs text-slate-200">{copy.heroTrust}</p>
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  <Button
                    size="lg"
                    asChild
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    <Link
                      href={gate('/education/courses')}
                      className="flex items-center gap-2"
                      aria-label={stringValue(copy.heroPrimaryCta)}
                    >
                      {copy.heroPrimaryCta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                    <Link href="/education/courses" className="flex items-center gap-2">
                      {copy.heroSecondaryCta}
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </HeroTextColumn>
            </HeroContent>
          </div>
        </HeroSection>

        {/* BLOCK 2: O TEU PRÓXIMO PASSO */}
        <section className="px-6">
          <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-[#020b16] px-8 py-10 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">O teu próximo passo</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">Progresso guardado. Sem pressão.</h2>
            </div>
            {user ? (
              <Card className="border border-white/10 bg-[#04131b]/60">
                <CardContent className="space-y-4">
                  <CardTitle className="text-lg font-semibold text-white">O teu progresso</CardTitle>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-300">XP total</p>
                      <p className="text-2xl font-bold text-white">{user.xp_total ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Nível</p>
                      <p className="text-xl font-semibold text-emerald-300">{getLevel(user.xp_total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Streak</p>
                      <p className="text-xl font-semibold text-cyan-200">{user.streak_count ?? 0} dias</p>
                    </div>
                  </div>
                  <Button asChild className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
                    <Link href={gate('/education/courses')} className="flex items-center justify-center gap-2">
                      Continuar na Academia
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-white/10 bg-[#04131b]/60">
                <CardContent className="space-y-4">
                  <CardTitle className="text-lg font-semibold text-white">Cria conta para guardar progresso</CardTitle>
                  <p className="text-sm text-slate-200">O conteúdo é gratuito.</p>
                  <p className="text-sm text-slate-200">Login guarda progresso, XP e desbloqueios.</p>
                  <Button
                    asChild
                    size="md"
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    <Link href={gate('/signup')} className="flex items-center justify-center gap-2">
                      Entrar / Criar conta
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Link href="/education/courses" className="text-sm text-cyan-200 hover:text-white">
                    Ver cursos sem login
                  </Link>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#04131b]/50 p-4">
                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Cursos publicados</p>
                <p className="text-2xl font-semibold text-white">{formatStat(stats?.totalCourses)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#04131b]/50 p-4">
                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Lições</p>
                <p className="text-2xl font-semibold text-white">{formatStat(stats?.totalLessons)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-cyan-200 font-semibold">{copy.cadetTitle}</p>
              <p className="text-xs text-slate-400">{copy.cadetDesc}</p>
              <Link href={gate('/education/courses')} className="text-sm font-semibold text-white hover:text-cyan-200">
                {copy.cadetCta}
              </Link>
            </div>
          </div>
        </section>

        {/* BLOCK 3: CURSOS EM DESTAQUE */}
        <section className="px-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Cursos em destaque</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">Escolhe a tua entrada na Academia</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featuredCourses.map((course, idx) => {
                const xpRequired = course.xp_threshold ?? course.xp_required ?? 0;
                const isUnlocked = user ? (user.xp_total ?? 0) >= xpRequired : false;
                const highlightClass =
                  idx === 0
                    ? 'rounded-[32px] border border-white/10 bg-gradient-to-b from-[#02111d] to-[#02060e] p-5 shadow-[0_20px_60px_rgba(3,10,25,0.75)]'
                    : 'rounded-2xl border border-white/10 bg-[#04131b]/80 p-5';
                return (
                  <Card key={course.id} className={`${highlightClass} flex flex-col gap-6`}>
                    <div>
                      <CardTitle className="text-lg font-semibold text-white">{course.title}</CardTitle>
                      <CardDescription className="text-sm text-slate-200 mt-2">{course.description}</CardDescription>
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.5em] text-slate-400">
                      <span>Nível {course.level?.toUpperCase() ?? '—'}</span>
                      <span>{xpRequired} XP</span>
                    </div>
                    <div>
                      <span
                        className={`rounded-full px-4 py-1 text-xs font-semibold ${
                          isUnlocked ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        {user ? (isUnlocked ? 'Iniciável' : 'Requer XP') : 'Login necessário'}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)]">
                <Link href={gate('/education/courses')} className="flex items-center gap-2">
                  Ver todos os cursos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* BLOCK 4: DEMO DO GLOSSÁRIO */}
        <section className="px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-[#020b16] px-8 py-12 shadow-[0_25px_60px_rgba(3,10,25,0.55)]">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">{copy.glossaryEyebrow}</p>
                <h2 className="text-3xl font-semibold text-[#fdd87c]">{copy.glossaryTitle}</h2>
                <p className="text-sm text-slate-200">{copy.glossaryDesc}</p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {(copy.glossaryBullets as string[]).map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-300" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">{copy.glossaryMicro}</p>
                <Button size="md" asChild className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]">
                  <Link href={gate('/education/glossary')} className="flex items-center justify-center gap-2">
                    {copy.glossaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-[32px] border border-white/10 bg-[#04131b]/70 p-6">
                <p className="text-sm text-slate-200">Demo do glossário ativo dentro das aulas.</p>
                <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-[#020f19] p-6">
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Apertum Blockchain</p>
                  <p className="text-sm text-slate-100">Rede modular focada em desporto e creators.</p>
                  <p className="text-xs text-slate-400">Cada lição concluída gera XP e novas missões.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOCK 5: XP / LEADERBOARD + CTA FINAL */}
        <section className="px-6">
          <div className="mx-auto max-w-6xl space-y-10 rounded-3xl border border-white/10 bg-[#020b16] px-8 py-12 shadow-[0_25px_60px_rgba(3,10,25,0.55)]">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">{copy.xpEyebrow}</p>
                <h3 className="text-2xl font-semibold text-white">{copy.xpTitle}</h3>
                <p className="text-sm text-slate-200 max-w-prose">{xpParagraph}</p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {xpProofs.map((proof) => (
                    <li key={proof} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      {proof}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {previewLevels.map((level) => (
                    <span key={level.title} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">
                      {level.title} · {level.range}
                    </span>
                  ))}
                </div>
                <Link
                  href={gate('/education/xp')}
                  className="text-sm font-semibold text-cyan-200 hover:text-white"
                >
                  Ver detalhes do XP
                </Link>
              </div>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">{copy.leaderboardEyebrow}</p>
                <h3 className="text-2xl font-semibold text-white">{copy.leaderboardTitle}</h3>
                <p className="text-sm text-slate-200">{copy.leaderboardDesc}</p>
                {user ? (
                  <div className="space-y-3">
                    {leaderboardTop.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#04131b]/60 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-slate-200">{person.username}</p>
                          <p className="text-xs text-slate-400">{person.country ?? '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white">{person.xp_total ?? 0} XP</p>
                          <p className="text-xs text-slate-400">{translate(t, 'education.leaderboard.position', 'Ranking')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-white/10 bg-[#04131b]/60">
                    <CardContent className="space-y-3">
                      <CardTitle className="text-lg font-semibold text-white">Leaderboard pequeno</CardTitle>
                      <CardDescription className="text-sm text-slate-200">
                        Regista-te para ver a tabela completa e mostrar consistência.
                      </CardDescription>
                      <Button size="sm" asChild className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]">
                        <Link href={gate('/education/leaderboard')} className="flex items-center justify-center gap-2">
                          Ir para o leaderboard
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <Link href="/education/leaderboard" className="text-sm font-semibold text-cyan-200 hover:text-white">
                  Ver leaderboard completo
                </Link>
              </div>
            </div>
            <div className="text-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)]">
                <Link href={gate('/education/courses')} className="flex items-center justify-center gap-2">
                  {copy.finalCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
