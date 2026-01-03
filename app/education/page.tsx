'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  XP_LEVELS,
  getXpLevelLabel,
  type XpLevelKey,
} from '@/lib/education/xpLevels';
import { cn } from '@/lib/utils';
import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Award,
  BookOpen,
  Flag,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const EDUCATION_LANGUAGES = ['pt', 'es', 'en'] as const;
type EducationLanguage = (typeof EDUCATION_LANGUAGES)[number];

const resolveEducationLanguage = (lang: string): EducationLanguage => {
  if (EDUCATION_LANGUAGES.includes(lang as EducationLanguage)) {
    return lang as EducationLanguage;
  }
  return 'en';
};

// --- Copy de landing (fallbacks 99+) ---
const LANDING_COPY: Record<
  EducationLanguage,
  {
    heroTitle: string;
    heroSubtitle: string;
    heroTension: string;
    heroTrust: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    heroAnchor: string;

    cadetEyebrow: string;
    cadetTitle: string;
    cadetDesc: string;
    cadetBullets: string[];
    cadetCta: string;
    cadetMicro: string;

    progressionEyebrow: string;
    progressionTitle: string;
    progressionDesc: string;
    progressionLine: string;

    infantilEyebrow: string;
    infantilTitle: string;
    infantilDesc: string;
    infantilCourses: {
      title: string;
      desc: string;
      id: 'I' | 'II' | 'III';
    }[];
    infantilCta: string;
    infantilMicro: string;

    glossaryEyebrow: string;
    glossaryTitle: string;
    glossaryDesc: string;
    glossaryBullets: string[];
    glossaryCta: string;
    glossaryMicro: string;

    xpEyebrow: string;
    xpTitle: string;
    xpDesc: string;
    xpPillars: { title: string; desc: string }[];

    leaderboardEyebrow: string;
    leaderboardTitle: string;
    leaderboardDesc: string;
    leaderboardMicro: string;

    finalTitle: string;
    finalDesc: string;
    finalPrimary: string;
    finalSecondary: string;
    finalMicro: string;

    loginGateTitle: string;
    loginGateDesc: string;
    loginGateCta: string;
  }
> = {
  pt: {
    heroTitle: 'Academia Web3 Gratuita com foco na Apertum Blockchain',
    heroSubtitle:
      'Educação estruturada para homens e mulheres, em qualquer parte do mundo. Especial atenção ao desporto — mas aberta a qualquer pessoa com curiosidade e cabeça.',
    heroTension:
      'A Web3 já é o presente. Quem entra sem literacia tende a aprender da forma mais cara: por erro, por ruído e por pressa.',
    heroTrust:
      'Sem custos. Sem promessas fáceis. Progressão por níveis e XP para aprender com método e consistência.',
    heroPrimaryCta: 'Começar como Cadete (COMEÇA AQUI)',
    heroSecondaryCta: 'Explorar a Academia',
    heroAnchor: 'Educação antes de exposição.',

    cadetEyebrow: 'NÍVEL CADETE',
    cadetTitle: 'Começa aqui. Sem escolher nada.',
    cadetDesc:
      'Quando te registas, começas como Cadete. É aqui que entendes o LEGACY, o seu criador, e a razão de existir desta academia. Depois disso, a progressão deixa de ser confusa.',
    cadetBullets: [
      'Mapa simples da plataforma e do percurso',
      'Como funcionam níveis, XP e desbloqueios',
      'Como usar o glossário dentro das aulas e artigos',
      'O que esta academia faz — e o que recusa fazer',
    ],
    cadetCta: 'Abrir o Curso COMEÇA AQUI',
    cadetMicro:
      'Sem login podes espreitar. Para guardar progresso, ganhar XP e desbloquear níveis, precisas de entrar.',

    progressionEyebrow: 'PROGRESSÃO POR NÍVEIS',
    progressionTitle: 'Maturidade antes de complexidade.',
    progressionDesc:
      'Cada nível exige uma quantidade específica de XP para desbloquear o seguinte. Dentro de cada nível encontras cursos adequados ao teu patamar — para que chegues aos conteúdos práticos com base real, não por impulso.',
    progressionLine:
      'O XP serve também para competir — e serve, acima de tudo, para distinguir interessados dos desinteressados.',

    infantilEyebrow: 'NÍVEL INFANTIL — BASE TEÓRICA',
    infantilTitle: 'Antes de Web3, entende o jogo do dinheiro.',
    infantilDesc:
      'Os três primeiros cursos do nível Infantil existem para te dar bases: história do dinheiro, sistema monetário, dívida e psicologia. Só depois faz sentido mergulhar nos conceitos introdutórios de Blockchain, Criptoativos e Web3 dentro do mesmo nível.',
    infantilCourses: [
      {
        id: 'I',
        title:
          'O Dinheiro Antes de Ti: História, Padrões e Falhanços Inevitáveis',
        desc:
          'Como o dinheiro evoluiu, porque falha e porque os ciclos regressam com nomes diferentes.',
      },
      {
        id: 'II',
        title: 'O Sistema Em Que Vives: Moeda, Dívida e Psicologia',
        desc:
          'Como o sistema molda decisões, risco, comportamento e dependência — e porque isso importa em Web3.',
      },
      {
        id: 'III',
        title: 'O QUE VEM A SEGUIR (E COMO NÃO FICAR PARA TRÁS)',
        desc:
          'Um mapa honesto do que está a mudar, do que é inevitável e do que distingue adaptação de negação.',
      },
    ],
    infantilCta: 'Ver Cursos do Nível Infantil',
    infantilMicro:
      'Podes ver os cursos aqui. Para abrir e progredir, precisas de login.',

    glossaryEyebrow: 'GLOSSÁRIO LEGACY',
    glossaryTitle: 'Aprende sem interromper o raciocínio.',
    glossaryDesc:
      'Os termos técnicos são onde muita gente trava. No LEGACY, as palavras-chave dentro das aulas e blog posts são clicáveis: a definição aparece e tu continuas. Sem perder foco.',
    glossaryBullets: [
      'Definições claras, profundas e actualizadas',
      'Integrado na experiência (aula e blog)',
      'Reduz ruído e acelera aprendizagem real',
    ],
    glossaryCta: 'Abrir Glossário',
    glossaryMicro: 'O glossário é conteúdo privado. Exige login.',

    xpEyebrow: 'XP SYSTEM',
    xpTitle: 'XP mede envolvimento. E isso muda tudo.',
    xpDesc:
      'Num ecossistema com mentalidade desportiva, competir faz parte. O XP mede performance e consistência, mas serve também como filtro de maturidade: ajuda a perceber quem está preparado para conteúdos mais exigentes e práticos — incluindo “mão na massa” no ecossistema Apertum.',
    xpPillars: [
      {
        title: 'Competição saudável',
        desc:
          'Performance e disciplina contam — e ficam visíveis ao longo do tempo.',
      },
      {
        title: 'Filtro de maturidade',
        desc:
          'Distingue interessados de desinteressados. Ajuda a orientar o que desbloqueia.',
      },
      {
        title: 'Preparação para prática',
        desc:
          'Quando chegas a níveis mais altos, entras em conteúdos que exigem base, contexto e responsabilidade.',
      },
    ],

    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'A performance fica visível.',
    leaderboardDesc:
      'O leaderboard mostra quem aparece, quem aprende e quem progride. Aqui não existe “hype”. Existe continuidade.',
    leaderboardMicro:
      'Leaderboard completo é conteúdo privado (login).',

    finalTitle: 'Começa como Cadete. Evolui como alguém que leva isto a sério.',
    finalDesc:
      'Se queres entrar na Web3 com clareza — e não por impulso — começa pelo percurso certo. O COMEÇA AQUI dá-te contexto e põe-te no caminho.',
    finalPrimary: 'Começar o COMEÇA AQUI',
    finalSecondary: 'Explorar a Academia',
    finalMicro:
      'Registo gratuito. Progresso guardado. Desbloqueios por XP.',

    loginGateTitle: 'Conteúdo privado. Academia gratuita.',
    loginGateDesc:
      'O conteúdo é gratuito. O login serve para guardar progresso, XP e desbloqueios.',
    loginGateCta: 'Entrar / Criar conta',
  },
  es: {
    heroTitle: 'Academia Web3 Gratuita con foco en la blockchain Apertum',
    heroSubtitle:
      'Educación estructurada para hombres y mujeres, en cualquier parte del mundo. Atención especial al deporte, pero abierta a cualquiera con curiosidad y criterio.',
    heroTension:
      'Web3 ya es el presente. Quien entra sin base suele aprender de la forma más cara: error, ruido y prisa.',
    heroTrust:
      'Sin coste. Sin promesas fáciles. Progresión por niveles y XP para aprender con método.',
    heroPrimaryCta: 'Empezar como Cadete (EMPIEZA AQUÍ)',
    heroSecondaryCta: 'Explorar la Academia',
    heroAnchor: 'Educación antes de exposición.',

    cadetEyebrow: 'NIVEL CADETE',
    cadetTitle: 'Empieza aquí. Sin elegir nada.',
    cadetDesc:
      'Al registrarte empiezas como Cadete. Aquí entiendes el LEGACY, su creador y por qué existe esta academia. Después, la progresión deja de ser confusa.',
    cadetBullets: [
      'Mapa simple de la plataforma y del recorrido',
      'Cómo funcionan niveles, XP y desbloqueos',
      'Cómo usar el glosario dentro de las lecciones',
      'Qué hace esta academia — y qué rechaza hacer',
    ],
    cadetCta: 'Abrir el curso EMPIEZA AQUÍ',
    cadetMicro:
      'Sin login puedes ver. Para guardar progreso, ganar XP y desbloquear niveles, necesitas entrar.',

    progressionEyebrow: 'PROGRESIÓN POR NIVELES',
    progressionTitle: 'Madurez antes de complejidad.',
    progressionDesc:
      'Cada nivel requiere una cantidad específica de XP para desbloquear el siguiente. Dentro de cada nivel encuentras cursos adecuados a tu etapa, para llegar a lo práctico con base real.',
    progressionLine:
      'El XP también sirve para competir — y, sobre todo, para separar interés real de desinterés.',

    infantilEyebrow: 'NIVEL INFANTIL — BASE TEÓRICA',
    infantilTitle: 'Antes de Web3, entiende el juego del dinero.',
    infantilDesc:
      'Los tres primeros cursos del nivel Infantil te dan base: historia del dinero, sistema monetario, deuda y psicología. Después, tiene sentido entrar en blockchain y Web3 dentro del mismo nivel.',
    infantilCourses: [
      {
        id: 'I',
        title:
          'El Dinero Antes de Ti: Historia, Patrones y Fallos Inevitables',
        desc:
          'Cómo evolucionó el dinero, por qué falla y por qué los ciclos vuelven.',
      },
      {
        id: 'II',
        title: 'El Sistema en el que Vives: Moneda, Deuda y Psicología',
        desc:
          'Cómo el sistema moldea decisiones, riesgo y comportamiento — y por qué importa en Web3.',
      },
      {
        id: 'III',
        title: 'LO QUE VIENE (Y CÓMO NO QUEDARTE ATRÁS)',
        desc:
          'Un mapa honesto de lo que cambia y de lo que distingue adaptación de negación.',
      },
    ],
    infantilCta: 'Ver cursos del nivel Infantil',
    infantilMicro:
      'Puedes ver los cursos aquí. Para abrir y progresar, necesitas login.',

    glossaryEyebrow: 'GLOSARIO LEGACY',
    glossaryTitle: 'Aprende sin romper el hilo.',
    glossaryDesc:
      'Los términos técnicos frenan a mucha gente. En LEGACY, las palabras clave son clicables: aparece la definición y sigues.',
    glossaryBullets: [
      'Definiciones claras y actualizadas',
      'Integrado en lecciones y blog',
      'Reduce ruido y acelera aprendizaje',
    ],
    glossaryCta: 'Abrir glosario',
    glossaryMicro: 'El glosario es contenido privado. Requiere login.',

    xpEyebrow: 'SISTEMA XP',
    xpTitle: 'XP mide implicación. Y eso lo cambia todo.',
    xpDesc:
      'En un ecosistema con mentalidad deportiva, competir es natural. XP mide performance y consistencia y filtra madurez: indica quién está preparado para contenidos más prácticos — incluso en Apertum.',
    xpPillars: [
      {
        title: 'Competición saludable',
        desc: 'Disciplina y continuidad cuentan y se ven.',
      },
      {
        title: 'Filtro de madurez',
        desc: 'Separa interés real de desinterés y orienta desbloqueos.',
      },
      {
        title: 'Preparación práctica',
        desc:
          'Los niveles altos exigen base y responsabilidad para “meter mano” a herramientas reales.',
      },
    ],

    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'La performance se vuelve visible.',
    leaderboardDesc:
      'Muestra quién aparece, aprende y progresa. Aquí no hay hype. Hay continuidad.',
    leaderboardMicro: 'Leaderboard completo requiere login.',

    finalTitle: 'Empieza como Cadete. Evoluciona con seriedad.',
    finalDesc:
      'Si quieres entrar en Web3 con claridad, empieza por el recorrido correcto. EMPIEZA AQUÍ te da contexto y dirección.',
    finalPrimary: 'Empezar EMPIEZA AQUÍ',
    finalSecondary: 'Explorar la Academia',
    finalMicro: 'Registro gratuito. Progreso guardado. Desbloqueos por XP.',

    loginGateTitle: 'Contenido privado. Academia gratuita.',
    loginGateDesc:
      'El contenido es gratuito. El login guarda progreso, XP y desbloqueos.',
    loginGateCta: 'Entrar / Crear cuenta',
  },
  en: {
    heroTitle: 'Free Web3 Academy focused on the Apertum Blockchain',
    heroSubtitle:
      'Structured education for men and women worldwide. Special attention to sports professionals and enthusiasts — open to anyone with real curiosity and discipline.',
    heroTension:
      'Web3 is not “the future”. It’s the present taking shape. Without literacy, most people learn the expensive way: mistakes, noise, and speed.',
    heroTrust:
      'No cost. No easy promises. Level + XP progression to learn with method and consistency.',
    heroPrimaryCta: 'Start as Cadet (START HERE)',
    heroSecondaryCta: 'Explore the Academy',
    heroAnchor: 'Education before exposure.',

    cadetEyebrow: 'CADET LEVEL',
    cadetTitle: 'Start here. No choices needed.',
    cadetDesc:
      'When you register, you start as a Cadet. This mini-course explains LEGACY, the creator, and why this academy exists. After that, progression stops being confusing.',
    cadetBullets: [
      'A simple map of the platform and the journey',
      'How levels, XP and unlocks work',
      'How to use the glossary inside lessons and posts',
      'What this academy does — and what it refuses to do',
    ],
    cadetCta: 'Open the START HERE course',
    cadetMicro:
      'You can preview without login. To save progress, earn XP and unlock levels, you must log in.',

    progressionEyebrow: 'LEVEL PROGRESSION',
    progressionTitle: 'Maturity before complexity.',
    progressionDesc:
      'Each level requires a specific XP amount to unlock the next. Inside each level you get content that fits your stage — so you reach practical work with real foundations.',
    progressionLine:
      'Yes, XP also supports competition — and above all, it filters real interest and readiness.',

    infantilEyebrow: 'INFANTIL LEVEL — THEORETICAL BASE',
    infantilTitle: 'Before Web3, understand the money game.',
    infantilDesc:
      'The first three courses build foundations: money history, monetary systems, debt and psychology. Then it makes sense to dive into blockchain and Web3 within the same level.',
    infantilCourses: [
      {
        id: 'I',
        title: 'Money Before You: History, Patterns and Inevitable Failures',
        desc:
          'How money evolved, why it fails, and why cycles repeat under new names.',
      },
      {
        id: 'II',
        title: 'The System You Live In: Currency, Debt and Psychology',
        desc:
          'How systems shape decisions, risk and behavior — and why it matters in Web3.',
      },
      {
        id: 'III',
        title: 'WHAT COMES NEXT (AND HOW NOT TO FALL BEHIND)',
        desc:
          'A clear map of what’s changing and what separates adaptation from denial.',
      },
    ],
    infantilCta: 'See Infantil Level courses',
    infantilMicro:
      'You can preview courses here. To open and progress, you must log in.',

    glossaryEyebrow: 'LEGACY GLOSSARY',
    glossaryTitle: 'Learn without breaking your flow.',
    glossaryDesc:
      'Technical terms are where people stall. In LEGACY, keywords are clickable: the definition appears and you keep going — no tab switching.',
    glossaryBullets: [
      'Clear, deep, evolving definitions',
      'Integrated in lessons and blog posts',
      'Less noise. More real learning',
    ],
    glossaryCta: 'Open Glossary',
    glossaryMicro: 'The glossary is private content. Login required.',

    xpEyebrow: 'XP SYSTEM',
    xpTitle: 'XP measures engagement. That changes everything.',
    xpDesc:
      'In a sports-minded ecosystem, competition is natural. XP measures performance and consistency and filters maturity: it shows who is ready for more demanding, practical content — including real work in Apertum.',
    xpPillars: [
      {
        title: 'Healthy competition',
        desc: 'Discipline and consistency matter — and become visible.',
      },
      {
        title: 'Maturity filter',
        desc: 'Separates real interest from noise and guides unlocks.',
      },
      {
        title: 'Practical readiness',
        desc:
          'Higher levels require foundations and responsibility for hands-on work.',
      },
    ],

    leaderboardEyebrow: 'LEADERBOARD',
    leaderboardTitle: 'Performance becomes visible.',
    leaderboardDesc:
      'It shows who shows up, learns and progresses. No hype — just continuity.',
    leaderboardMicro: 'Full leaderboard requires login.',

    finalTitle: 'Start as a Cadet. Evolve with seriousness.',
    finalDesc:
      'If you want clarity — not impulse — start with the right path. START HERE gives context and direction.',
    finalPrimary: 'Start START HERE',
    finalSecondary: 'Explore the Academy',
    finalMicro: 'Free registration. Saved progress. XP unlocks.',

    loginGateTitle: 'Private content. Free academy.',
    loginGateDesc:
      'Content is free. Login is for saving progress, XP and unlocks.',
    loginGateCta: 'Log in / Create account',
  },
};

const buildLevelCopy = (lang: EducationLanguage) =>
  XP_LEVELS.map((level) => ({
    title: level.translations[lang].title,
    range: level.translations[lang].range,
  }));

const XP_LEVEL_BLOCK_COPY: Record<
  EducationLanguage,
  { title: string; range: string }[]
> = {
  pt: buildLevelCopy('pt'),
  es: buildLevelCopy('es'),
  en: buildLevelCopy('en'),
};

const PREVIEW_LEVELS: Record<EducationLanguage, { title: string; range: string }[]> =
  {
    pt: XP_LEVEL_BLOCK_COPY.pt.slice(0, 4),
    es: XP_LEVEL_BLOCK_COPY.es.slice(0, 4),
    en: XP_LEVEL_BLOCK_COPY.en.slice(0, 4),
  };

const BADGE_TIER_THRESHOLD = 2222;

const XP_BADGE_NOTE_COPY: Record<EducationLanguage, string> = {
  pt: 'A partir dos 2 222 XP (nível Sénior) ganhas badges apenas para ranking; já tens acesso a todos os cursos.',
  es: 'Desde los 2 222 XP (nivel Sénior) solo recibes badges para el ranking; todos los cursos ya están desbloqueados.',
  en: 'From 2,222 XP (Senior level) you only collect badges for ranking; every course is already unlocked.',
};

const BADGE_ICON_HINT_COPY: Record<EducationLanguage, string> = {
  pt: 'Ícone dourado = zona de badges/ranking',
  es: 'Icono dorado = zona de badges/ranking',
  en: 'Gold icon = badge/ranking tier',
};

const isBadgeTier = (xp: number) => xp >= BADGE_TIER_THRESHOLD;

export default function EducationPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const educationLanguage = resolveEducationLanguage(language);
  const xpLevelsCopy = XP_LEVEL_BLOCK_COPY[educationLanguage];
  const previewLevels = PREVIEW_LEVELS[educationLanguage];
  const xpLevelsComplete = useMemo(() => {
    const base = [...xpLevelsCopy];
    const seen = new Set(base.map((level) => level.title.toLowerCase()));
    const requiredKeys: XpLevelKey[] = ['hallOfFame', 'master', 'legend'];
    requiredKeys.forEach((key) => {
      const level = XP_LEVELS.find((item) => item.key === key);
      if (!level) return;
      const translation =
        level.translations[educationLanguage] || level.translations.pt;
      if (
        translation &&
        !seen.has(translation.title.toLowerCase())
      ) {
        base.push({
          title: translation.title,
          range: translation.range,
        });
        seen.add(translation.title.toLowerCase());
      }
    });
    return base;
  }, [xpLevelsCopy, educationLanguage]);
  const badgesNoteCopy = XP_BADGE_NOTE_COPY[educationLanguage];
  const badgeIconHint = BADGE_ICON_HINT_COPY[educationLanguage];
  const copy = LANDING_COPY[educationLanguage];
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  // Gate helper (preserva next)
  const gate = (path: string) =>
    user ? path : `/login?next=${encodeURIComponent(path)}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/education/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          setTopCourses(data.topCourses);
          setLeaderboard(data.topLeaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch education stats:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="border border-[#34d399]/50 bg-gradient-to-r from-[#0f766e] to-[#059669] text-white shadow-[0_8px_20px_rgba(15,118,110,0.35)]">
            {t('education.level.beginner')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="border border-[#fdd87c]/50 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] shadow-[0_8px_20px_rgba(253,216,124,0.35)]">
            {t('education.level.intermediate')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="border border-[#fb7185]/50 bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white shadow-[0_8px_20px_rgba(244,63,94,0.35)]">
            {t('education.level.advanced')}
          </Badge>
        );
      default:
        return (
          <Badge className="border border-white/20 bg-[#04131b] text-white">
            {t('education.level.unknown')}
          </Badge>
        );
    }
  };

  const getLevel = (xp: number) => getXpLevelLabel(xp);

  const formatStat = (value?: number | null) => {
    if (value === null || value === undefined) {
      return loading ? '...' : '0';
    }
    return value.toLocaleString();
  };

  // Featured courses (evita paralisia: 1 destacado + 2)
  const featuredCourses = useMemo(() => topCourses.slice(0, 3), [topCourses]);
  const heroHighlights = [
    {
      key: 'courses',
      icon: BookOpen,
      label: translate('education.stats.courses', 'Cursos'),
      value: formatStat(stats?.totalCourses),
      description: translate(
        'home.structuredPaths',
        'Caminhos de aprendizagem estruturados para todos os níveis.',
      ),
    },
    {
      key: 'lessons',
      icon: Target,
      label: translate('education.stats.lessons', 'Lições'),
      value: formatStat(stats?.totalLessons),
      description: translate(
        'home.learnEarnDesc',
        'Completa lições e artigos para ganhar XP. Cada ação conta.',
      ),
    },
    {
      key: 'users',
      icon: Users,
      label: translate('education.stats.activeUsers', 'Alunos ativos'),
      value: formatStat(stats?.activeUsers),
      description: translate(
        'home.personalizedOnboardingDesc',
        'Percursos personalizados para perfis ligados ao desporto e curiosos em Web3.',
      ),
    },
  ];
  const academyStats = [
    {
      key: 'courses',
      icon: BookOpen,
      value: formatStat(stats?.totalCourses),
      label: translate('education.stats.courses', 'Cursos'),
      helper: translate(
        'home.structuredPaths',
        'Caminhos de aprendizagem estruturados para todos os níveis.',
      ),
    },
    {
      key: 'lessons',
      icon: Target,
      value: formatStat(stats?.totalLessons),
      label: translate('education.stats.lessons', 'Lições'),
      helper: translate(
        'home.learnEarnDesc',
        'Completa lições e artigos para ganhar XP. Cada ação conta.',
      ),
    },
    {
      key: 'users',
      icon: Users,
      value: formatStat(stats?.activeUsers),
      label: translate('education.stats.activeUsers', 'Alunos ativos'),
      helper: translate(
        'home.personalizedOnboardingDesc',
        'Percursos personalizados e uma academia viva.',
      ),
    },
    {
      key: 'xpDistributed',
      icon: Zap,
      value: formatStat(stats?.totalXPDistributed),
      label: translate('education.stats.xpDistributed', 'XP distribuído'),
      helper: translate(
        'education.stats.xpHint',
        'XP atribuído a toda a comunidade desde o lançamento.',
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />

      <main className="flex-1 space-y-16">
        {/* HERO */}
        <HeroSection className="px-6 py-16" overlayVariant="inverse">
          <div className="relative mx-auto max-w-6xl">
            <HeroContent className="lg:items-center">
              <HeroTextColumn>
                <div className="space-y-3">
                  <HeroEyebrow>{t('nav.education')}</HeroEyebrow>

                  {/* título 99+ (fallback se ainda não tiveres i18n actualizado) */}
                  <HeroTitle className="leading-tight md:text-5xl">
                    {translate('education.hero.title', copy.heroTitle)}
                  </HeroTitle>

                  <HeroDescription className="text-base text-slate-100">
                    {translate('education.hero.subtitle', copy.heroSubtitle)}
                  </HeroDescription>

                  <HeroDescription className="text-slate-200">
                    {translate('education.hero.description', copy.heroTension)}
                  </HeroDescription>

                  <p className="text-sm font-semibold text-cyan-200/90">
                    {copy.heroAnchor}
                  </p>

                  <p className="text-xs text-slate-200">{copy.heroTrust}</p>
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  {/* CTA dominante: Começa Aqui (Cadete) */}
                  <Button
                    size="lg"
                    asChild
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    <Link
                      href={gate('/education/courses')}
                      className="flex items-center gap-2"
                      aria-label={copy.heroPrimaryCta}
                    >
                      {copy.heroPrimaryCta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Secundário: Explorar */}
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/education/courses" className="flex items-center gap-2">
                      {copy.heroSecondaryCta}
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <p className="text-xs text-cyan-200/80 mt-3">
                  {translate(
                    'home.trackProgress',
                    'Progresso, XP e desbloqueios guardados no teu perfil.',
                  )}
                </p>
              </HeroTextColumn>

              <div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {heroHighlights.map((highlight) => {
                    const Icon = highlight.icon;
                    return (
                      <div
                        key={highlight.key}
                        className="rounded-2xl border border-white/15 bg-[#000c12]/40 p-4 shadow-lg shadow-black/40 backdrop-blur-md"
                      >
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-[#fdd87c]">
                          <Icon className="h-4 w-4 text-cyan-200" />
                          <span>{highlight.label}</span>
                        </div>
                        <p className="mt-2 text-3xl font-semibold text-[#5af3ff]">
                          {highlight.value}
                        </p>
                        <p className="text-sm text-slate-300">
                          {highlight.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </HeroContent>
          </div>
        </HeroSection>

        {/* START HERE (CADETE) — bloco de conversão */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] py-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-14 h-56 w-56 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                {copy.cadetEyebrow}
              </p>

              <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">
                {copy.cadetTitle}
              </h2>

              <p className="mt-3 text-sm text-slate-200">{copy.cadetDesc}</p>

              <div className="mt-6 space-y-3 text-sm text-slate-200">
                {copy.cadetBullets.map((b) => (
                  <p key={b} className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-300 mt-[2px]" />
                    <span>{b}</span>
                  </p>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={gate('/education/courses')}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    {copy.cadetCta}
                  </Button>
                </Link>

                {!user ? (
                  <Link href="/signup">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {translate('cta.startJourney', 'Criar conta')}
                    </Button>
                  </Link>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-slate-200">{copy.cadetMicro}</p>
            </div>

            {/* preview de níveis (mantém o teu sistema actual) */}
            <div className="rounded-3xl border border-white/10 bg-[#000c12]/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">
                  {translate(
                    'education.previewLevels',
                    'Pré-visualização dos níveis',
                  )}
                </h3>
                <Badge
                  variant="outline"
                  className="border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                >
                  XP
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {previewLevels.map((item, index) => (
                  <div
                    key={`${item.title}-${item.range}`}
                    className="flex items-center justify-between rounded-2xl border border-white/15 bg-[#000c12]/70 px-4 py-3 shadow-lg shadow-black/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full border border-cyan-400/40 text-xs font-semibold text-[#fdd87c] flex items-center justify-center">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">
                          {translate('education.previewcta', 'Disponível após login.')}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-200">
                {translate(
                  'education.previewHint',
                  'Regista-te para ver a timeline completa, badges e cursos disponíveis em cada nível.',
                )}
              </p>
            </div>
          </div>
        </section>

        {/* PROGRESSÃO — framing certo */}
        <section className="relative overflow-hidden py-10">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-12 h-52 w-52 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-white/10 bg-[#04131b]/70 backdrop-blur p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                {copy.progressionEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">
                {copy.progressionTitle}
              </h2>
              <p className="mt-3 text-sm text-slate-200">{copy.progressionDesc}</p>
              <p className="mt-4 text-sm text-cyan-100/90 flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-300 mt-[2px]" />
                <span>{copy.progressionLine}</span>
              </p>
            </div>
          </div>
        </section>

        {/* NÍVEL INFANTIL — 3 cursos iniciais */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-14 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                {copy.infantilEyebrow}
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold text-[#fdd87c]">
                {copy.infantilTitle}
              </h2>
              <p className="mt-3 text-sm text-slate-200 max-w-3xl mx-auto">
                {copy.infantilDesc}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {copy.infantilCourses.map((c) => (
                <Card
                  key={c.id}
                  className="border border-white/10 bg-[#04131b] hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="border-[#5af3ff]/50 bg-[#00141f]/80 text-[#5af3ff]"
                      >
                        {c.id}
                      </Badge>

                      {!user ? (
                        <Badge className="border border-white/20 bg-[#000c12] text-slate-200">
                          Login
                        </Badge>
                      ) : (
                        <Badge className="border border-[#34d399]/30 bg-[#04131b] text-emerald-200">
                          Desbloqueável por XP
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-xl text-white mt-3">
                      {c.title}
                    </CardTitle>
                    <CardDescription className="text-slate-200">
                      {c.desc}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Link href={gate('/education/courses')}>
                      <Button
                        className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                      >
                        {copy.infantilCta}
                      </Button>
                    </Link>
                    <p className="text-xs text-slate-200 mt-3">{copy.infantilMicro}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* STATS + PROGRESSO PESSOAL */}
        <section className="relative overflow-hidden py-16 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -left-12 h-52 w-52 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="space-y-10">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-slate-200">
                    {translate('education.loadingStats', 'A carregar estatísticas…')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  {academyStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.key}
                        className="rounded-2xl border border-white/15 bg-[#000c12]/40 p-6 text-center shadow-lg shadow-black/40"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#021c27] text-cyan-100">
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-slate-200">{stat.label}</p>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                          {stat.helper}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {user ? (
                <div className="rounded-3xl border border-white/15 bg-[#000c12]/50 p-6 shadow-lg shadow-black/40">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.4em] text-cyan-200">
                    <Star className="h-5 w-5 text-amber-300" />
                    <span>{translate('education.myProgress', 'O teu progresso')}</span>
                  </div>
                  <div className="mt-6 grid gap-6 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                        {translate('dashboard.currentXp', 'XP')}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">{user.xp_total} XP</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                        {translate('dashboard.level', 'Nível')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-emerald-300">
                        {getLevel(user.xp_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                        {translate('dashboard.streak', 'Streak')}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {user.streak_count} {translate('dashboard.days', 'dias')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/15 bg-[#000c12]/50 p-6 shadow-lg shadow-black/40">
                  <div className="flex items-center gap-2 text-white">
                    <Flag className="h-5 w-5 text-cyan-300" />
                    <p className="font-semibold">{copy.loginGateTitle}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{copy.loginGateDesc}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={gate('/education/courses')}>
                      <Button className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
                        {copy.loginGateCta}
                      </Button>
                    </Link>
                    <Link href="/blog">
                      <Button
                        variant="outline"
                        className="border-white/40 text-white hover:bg-white/10"
                      >
                        {translate('cta.exploreBlog', 'Explorar Blog')}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* LEVELS (mantém) */}
        <section
          className="relative overflow-hidden bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] py-12"
          id="levels"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-14 -right-12 h-48 w-48 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-14 h-56 w-56 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-400">
                {translate('education.levelsEyebrow', 'Academia em níveis')}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c]">
                {translate('education.levelsTitle', 'Conteúdos progressivos por patamar')}
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                {translate(
                  'education.levelsDesc',
                  'Cada nível tem cursos adequados ao teu momento. O XP desbloqueia o próximo passo.',
                )}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {previewLevels.map((item) => (
                <div
                  key={`${item.title}-${item.range}-grid`}
                  className="rounded-2xl border border-white/15 bg-[#000c12]/40 p-6 text-center text-white shadow-lg shadow-black/40"
                >
                  <p className="text-[11px] uppercase tracking-[0.45em] text-cyan-300">
                    {item.title}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{item.range}</p>
                  <p className="mt-4 text-xs text-slate-300">
                    {translate('education.previewcta', 'Disponível após login.')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CURSOS EM DESTAQUE (com gating de guest) */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-14 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#fdd87c]">
                  {translate('education.featured.title', 'Cursos em destaque')}
                </h2>
                <p className="text-lg text-slate-200">
                  {translate(
                    'education.featuredDesc',
                    'Um ponto de entrada sólido. Sem ruído. Sem paralisia por escolha.',
                  )}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                </div>
              ) : featuredCourses.length === 0 ? (
                <Card className="border border-white/10 bg-[#04131b]">
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-200">
                      {translate('education.noCourses', 'Ainda não há cursos disponíveis.')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {featuredCourses.map((course, idx) => {
                    const title = getMultilingualContent(course.title, language);
                    const description = getMultilingualContent(
                      course.description,
                      language,
                    );

                    const isLockedByXp =
                      course.xp_required > (user?.xp_total || 0);

                    const modulesArray = Array.isArray(course.modules)
                      ? course.modules
                      : [];
                    const lessonsCount = modulesArray.reduce((acc: number, mod: any) => {
                      const lessonsArray = Array.isArray(mod.lessons) ? mod.lessons : [];
                      return acc + lessonsArray.length;
                    }, 0);

                    const courseHref = `/education/courses/${course.id}`;
                    const startHref = gate(courseHref);

                    return (
                      <Card
                        key={course.id}
                        className={cn(
                          'border border-white/10 bg-[#04131b] hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all',
                          idx === 0 ? 'ring-1 ring-[#fdd87c]/40' : '',
                        )}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start mb-2">
                            {getLevelBadge(course.level)}
                            <Badge
                              variant="outline"
                              className="border-[#5af3ff]/50 bg-[#00141f]/80 text-[#5af3ff]"
                            >
                              {course.xp_required} XP
                            </Badge>
                          </div>
                          <CardTitle className="text-xl text-white">{title}</CardTitle>
                          <CardDescription className="line-clamp-2 text-slate-200">
                            {description}
                          </CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-slate-200">
                              <BookOpen className="h-4 w-4 text-cyan-300" />
                              <span>
                                {modulesArray.length} {t('education.modules')} /{' '}
                                {lessonsCount} {t('education.lessons')}
                              </span>
                            </div>

                            {!user ? (
                              <Link href={startHref}>
                                <Button className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
                                  {copy.loginGateCta}
                                </Button>
                              </Link>
                            ) : isLockedByXp ? (
                              <Button
                                variant="outline"
                                className="w-full border-white/30 text-slate-200 hover:bg-white/10"
                                disabled
                              >
                                {translate('education.unlockAt', 'Desbloqueia em')}{' '}
                                {course.xp_required} XP
                              </Button>
                            ) : (
                              <Link href={courseHref}>
                                <Button className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
                                  {translate('education.startCourse', 'Iniciar curso')}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="text-center">
                <Link href={gate('/education/courses')}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    {translate(
                      'education.viewAll',
                      translate('dashboard.viewAll', 'Ver tudo'),
                    )}{' '}
                    {translate('education.courses', 'Cursos')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* GLOSSÁRIO (gated) */}
        <section className="relative overflow-hidden px-6 py-14">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-14 -left-12 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                  {copy.glossaryEyebrow}
                </p>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#fdd87c]">
                  {copy.glossaryTitle}
                </h2>
                <p className="mt-4 text-sm text-slate-200">{copy.glossaryDesc}</p>

                <div className="mt-6 space-y-3 text-sm text-slate-200">
                  {copy.glossaryBullets.map((b) => (
                    <p key={b} className="flex items-start gap-2">
                      <BookOpen className="h-4 w-4 text-cyan-300 mt-[2px]" />
                      <span>{b}</span>
                    </p>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={gate('/education/glossary')}>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      {copy.glossaryCta}
                    </Button>
                  </Link>
                <Link href="/blog">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    {translate('cta.exploreBlog', 'Explorar Blog')}
                  </Button>
                </Link>
              </div>

                <p className="mt-3 text-xs text-slate-200">{copy.glossaryMicro}</p>
              </div>

              <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">
                    {translate(
                      'education.glossaryDemoTitle',
                      'Demo: definição instantânea',
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-200">
                    {translate(
                      'education.glossaryDemoDesc',
                      'Dentro de uma aula ou artigo, clicas num termo e a definição aparece sem saíres da página.',
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-white/10 bg-[#000c12]/60 p-4">
                    <p className="text-sm text-slate-200">
                      “O conceito de{' '}
                      <span className="text-cyan-200 underline underline-offset-4">
                        slippage
                      </span>{' '}
                      torna-se relevante em mercados com baixa liquidez…”
                    </p>
                    <div className="mt-4 rounded-xl border border-white/10 bg-[#04131b] p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                        Slippage
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        Diferença entre o preço esperado e o preço executado numa
                        transacção, frequentemente causada por liquidez e movimento rápido.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SISTEMA DE XP (reposicionado: competição + filtro + preparação) */}
        <section className="relative overflow-hidden px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-14 -left-12 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                  {copy.xpEyebrow}
                </p>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#fdd87c]">
                  {copy.xpTitle}
                </h2>
                <p className="mt-4 text-sm text-slate-200">{copy.xpDesc}</p>

                <div className="mt-6 space-y-4 text-sm">
                  {copy.xpPillars.map((p) => (
                    <div key={p.title} className="flex items-start gap-3">
                      <Award className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold text-white">{p.title}</div>
                        <div className="text-slate-200">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link href={gate('/education/xp')}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {translate(
                        'education.learnMoreXP',
                        'Ver detalhes do sistema de XP',
                      )}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#020b16] to-[#04131b] p-8 shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                <h3 className="text-xl font-bold mb-6 text-center text-cyan-100">
                  {translate('education.xpLevels', 'Níveis e XP')}
                </h3>

                <div className="space-y-3 text-sm">
                  {xpLevelsComplete.map((item) => (
                    <div
                      key={`${item.title}-${item.range}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#04131b] px-4 py-3"
                    >
                      <span className="font-semibold text-white">{item.title}</span>
                      <span className="text-sm text-cyan-100">{item.range}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                  <Award className="h-4 w-4 text-amber-300" />
                  <p className="text-left text-amber-50">{badgesNoteCopy}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LEADERBOARD (gated) */}
        <section className="relative overflow-hidden px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27]" />
            <div className="absolute -top-24 -left-14 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
                {copy.leaderboardEyebrow}
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#fdd87c]">
                {copy.leaderboardTitle}
              </h2>
              <p className="mt-3 text-sm text-slate-200 max-w-2xl mx-auto">
                {copy.leaderboardDesc}
              </p>
              <p className="mt-2 text-xs text-slate-200">{copy.leaderboardMicro}</p>
            </div>

            <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-200">
              <Award className="h-4 w-4 text-amber-300" />
              <span>{badgeIconHint}</span>
            </div>

            {!user ? (
              <Card className="border border-white/10 bg-[#04131b]/70 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{copy.loginGateTitle}</CardTitle>
                  <CardDescription className="text-slate-200">
                    {copy.loginGateDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Link href={gate('/education/leaderboard')}>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      {copy.loginGateCta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              </div>
            ) : leaderboard.length === 0 ? (
              <Card className="border border-white/10 bg-[#04131b]">
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-200">
                    {translate('education.noLeaderboard', 'Sem dados ainda.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {leaderboard.slice(0, 5).map((learner, index) => (
                    <Card
                      key={learner.id}
                      className={cn(
                        'border border-white/10 bg-[#04131b]',
                        index < 3 ? 'ring-1 ring-primary/60' : '',
                      )}
                    >
                      <CardContent className="flex items-center gap-4 p-6">
                        <div
                          className={`text-2xl font-bold ${
                            index === 0
                              ? 'text-amber-400'
                              : index === 1
                              ? 'text-white'
                              : index === 2
                              ? 'text-orange-400'
                              : 'text-slate-300'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-white">
                            {learner.username}
                          </div>
                          <div className="text-sm text-slate-200">
                            {learner.country}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isBadgeTier(learner.xp_total) && (
                              <span className="inline-flex" title={badgeIconHint}>
                                <Award className="h-4 w-4 text-amber-300" />
                              </span>
                            )}
                            <div className="text-2xl font-bold text-primary">
                              {learner.xp_total}
                            </div>
                          </div>
                          <div className="text-sm text-slate-200">XP</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-center">
                  <Link href="/education/leaderboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {translate(
                        'education.viewFullLeaderboard',
                        'Ver leaderboard completo',
                      )}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA FINAL (eco do hero) */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#fdd87c]">
              {copy.finalTitle}
            </h2>
            <p className="text-sm text-slate-200 mb-8 max-w-2xl mx-auto">
              {copy.finalDesc}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={gate('/education/courses')}>
                <Button
                  size="lg"
                  className="px-8 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  {copy.finalPrimary}
                </Button>
              </Link>

              <Link href="/education/courses">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-white/40 text-white hover:bg-white/10"
                >
                  {copy.finalSecondary}
                </Button>
              </Link>

              <Link href="/blog">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-white/40 text-white hover:bg-white/10"
                >
                  {translate('cta.exploreBlog', 'Explorar Blog')}
                </Button>
              </Link>
            </div>

            <p className="mt-3 text-xs text-slate-200">{copy.finalMicro}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
