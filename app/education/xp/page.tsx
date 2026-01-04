'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Flame,
  ShieldCheck,
  Sparkles,
  Trophy,
  BarChart3,
  Target,
  CheckCircle2,
  Lock,
  Eye,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SupportedCopyLang = 'pt' | 'es' | 'en';

type XpReward = {
  action_type: string;
  min_xp: number | null;
  max_xp: number | null;
  creator_bonus_pct?: number | null;
};

type XpLimit = {
  action_type: string;
  xp_earned: number | null;
  count: number | null;
};

type XpThreshold = {
  xp_total: number;
  feature_name: string;
  description?: string | null;
  id?: string;
};

type EducationXpData = {
  rewards: XpReward[];
  limits: XpLimit[];
  thresholds: XpThreshold[];
};

type ApiResponse =
  | { success: true; rewards: XpReward[]; limits: XpLimit[]; thresholds: XpThreshold[] }
  | { success: false; error: string };

type CopyPack = {
  eyebrow: string;
  title: string;
  subtitle: string;
  manifestoTitle: string;
  manifestoPoints: string[];
  badge: string;

  stickyLabel: string;
  ctaLeaderboard: string;
  ctaGlossary: string;
  ctaBlog: string;
  ctaCourses: string;

  todayKicker: string;
  todayTitle: string;
  todayDesc: string;

  rewardsKicker: string;
  rewardsTitle: string;
  rewardsDesc: string;

  consistencyKicker: string;
  consistencyTitle: string;
  consistencyIntro: string;
  consistencyPoints: string[];
  monitoringTitle: string;
  monitoringBody: string;

  thresholdsKicker: string;
  thresholdsTitle: string;
  thresholdsDesc: string;
  levelNote: string;
  unlockNote: string;

  glossaryNote: string;
  errorsFallback: string;
  loadingRewards: string;
  loadingThresholds: string;
  noThresholds: string;

  gateTitle: string;
  gateDesc: string;
  gateLogin: string;
  gateSignup: string;

  planQuick: string;
  planBase: string;
  planSerious: string;
  planCTA: string;

  planQuickDesc: string;
  planBaseDesc: string;
  planSeriousDesc: string;

  rangeLabel: string;
  creatorBonusLabel: string;
  officialRulesLabel: string;
};

const XP_COPY: Record<SupportedCopyLang, CopyPack> = {
  pt: {
    eyebrow: 'SISTEMA XP',
    title: 'XP não é um jogo. É um filtro.',
    subtitle:
      'Serve para separar curiosidade de compromisso. Para te obrigar a ganhar base. Para provar consistência antes de desbloquear camadas mais exigentes.',
    manifestoTitle: 'Porque existe XP',
    manifestoPoints: [
      'Filtra quem “anda a ver” de quem executa.',
      'Reduz atalhos fracos: aprender fora de ordem cria confiança falsa.',
      'Sinaliza quem merece desbloqueios e acompanhamento mais próximo.',
    ],
    badge: 'Legacy XP — Sistema oficial',

    stickyLabel: 'Atalhos',
    ctaLeaderboard: 'Leaderboard',
    ctaGlossary: 'Glossário',
    ctaBlog: 'Blog',
    ctaCourses: 'Cursos',

    todayKicker: 'PLANO',
    todayTitle: 'O teu plano de hoje',
    todayDesc:
      'Escolhe uma rota. Faz. Fecha. Volta amanhã. Isto é como se ganha vantagem — sem teatro e sem pressa.',

    rewardsKicker: 'REGRAS',
    rewardsTitle: 'Como se ganha XP (regras oficiais)',
    rewardsDesc:
      'Isto é referência, não é ruído: intervalos oficiais, auditáveis, e desenhados para premiar esforço real.',

    consistencyKicker: 'CONSISTÊNCIA',
    consistencyTitle: 'Streaks existem para premiar disciplina real',
    consistencyIntro:
      'Streaks não contam presença. Contam XP ganho. Um dia sem XP e a contagem reinicia.',
    consistencyPoints: [
      'Limite diário global: 369 XP.',
      'Streak de 7 dias: 222 XP (XP ganho em 7 dias seguidos).',
      'Streak de 30 dias: 1.111 XP (XP ganho em 30 dias seguidos).',
    ],
    monitoringTitle: 'Fair Play',
    monitoringBody:
      'Lições e leituras contam uma vez por utilizador. Criadores não ganham XP ao consumir o próprio conteúdo. O bónus de criador existe quando outros completam — não quando o autor “faz farming”.',

    thresholdsKicker: 'DESBLOQUEIOS',
    thresholdsTitle: 'Milestones: XP total desbloqueia acesso extra',
    thresholdsDesc:
      'O teu XP total determina o que podes desbloquear. Não é status. É contexto e responsabilidade.',
    levelNote: 'Nível = XP total / 100 (arredondado para baixo).',
    unlockNote:
      'Ao atingir marcos, desbloqueias casas, fóruns privados, missões e desafios. O objectivo é elevar o padrão, não coleccionar “pontos”.',

    glossaryNote:
      'Glossário Legacy: cada leitura validada (progress reading) dá 2 XP por termo e só conta uma vez por utilizador (inclui o autor). Não existe bónus extra para criadores neste caso.',
    errorsFallback: 'Falha ao carregar dados de XP.',
    loadingRewards: 'A carregar regras...',
    loadingThresholds: 'A carregar desbloqueios...',
    noThresholds:
      'Ainda não há milestones publicados. (Admin: adiciona-os no painel /admin/xp.)',

    gateTitle: 'Inicia sessão para ver o teu XP',
    gateDesc:
      'Esta página é privada porque XP existe para guardar progresso real, desbloqueios e consistência — não para “espreitar”.',
    gateLogin: 'Iniciar sessão',
    gateSignup: 'Criar conta',

    planQuick: 'Rota Rápida',
    planBase: 'Rota Base',
    planSerious: 'Rota Séria',
    planCTA: 'Executar',

    planQuickDesc: '5 termos no glossário + 1 leitura curta no blog.',
    planBaseDesc: '1 lição + 1 artigo + 5 termos no glossário.',
    planSeriousDesc: '2 lições + 2 artigos + 10 termos no glossário.',

    rangeLabel: 'Intervalo',
    creatorBonusLabel: 'Bónus de criador',
    officialRulesLabel: 'Regras oficiais',
  },
  es: {
    eyebrow: 'SISTEMA XP',
    title: 'XP no es un juego. Es un filtro.',
    subtitle:
      'Sirve para separar curiosidad de compromiso. Para obligarte a construir base. Para probar consistencia antes de desbloquear capas más exigentes.',
    manifestoTitle: 'Por qué existe XP',
    manifestoPoints: [
      'Filtra a quien “mira” de quien ejecuta.',
      'Reduce atajos débiles: aprender fuera de orden crea falsa confianza.',
      'Señala quién merece desbloqueos y acompañamiento más cercano.',
    ],
    badge: 'Legacy XP — Sistema oficial',

    stickyLabel: 'Atajos',
    ctaLeaderboard: 'Leaderboard',
    ctaGlossary: 'Glosario',
    ctaBlog: 'Blog',
    ctaCourses: 'Cursos',

    todayKicker: 'PLAN',
    todayTitle: 'Tu plan de hoy',
    todayDesc:
      'Elige una ruta. Hazla. Ciérrala. Vuelve mañana. Así se gana ventaja — sin teatro y sin prisa.',

    rewardsKicker: 'REGLAS',
    rewardsTitle: 'Cómo se gana XP (reglas oficiales)',
    rewardsDesc:
      'Esto es referencia, no ruido: intervalos oficiales, auditables, diseñados para premiar esfuerzo real.',

    consistencyKicker: 'CONSISTENCIA',
    consistencyTitle: 'Los streaks premian disciplina real',
    consistencyIntro:
      'Los streaks no cuentan presencia. Cuentan XP ganado. Un día sin XP y la racha se reinicia.',
    consistencyPoints: [
      'Límite diario global: 369 XP.',
      'Racha de 7 días: 222 XP (XP ganado 7 días seguidos).',
      'Racha de 30 días: 1.111 XP (XP ganado 30 días seguidos).',
    ],
    monitoringTitle: 'Fair Play',
    monitoringBody:
      'Lecciones y lecturas cuentan una vez por usuario. Los creadores no ganan XP al consumir su propio contenido. El bonus de creador existe cuando otros completan — no con “farming”.',

    thresholdsKicker: 'DESBLOQUEOS',
    thresholdsTitle: 'Hitos: XP total desbloquea acceso extra',
    thresholdsDesc:
      'Tu XP total define lo que puedes desbloquear. No es status. Es contexto y responsabilidad.',
    levelNote: 'Nivel = XP total / 100 (redondeado hacia abajo).',
    unlockNote:
      'Al alcanzar hitos, desbloqueas casas, foros privados, misiones y desafíos. El objetivo es elevar el estándar, no coleccionar “puntos”.',

    glossaryNote:
      'Glosario Legacy: cada lectura validada da 2 XP por término y cuenta una sola vez por usuario (incluye al autor). No hay bonus extra para creadores en este caso.',
    errorsFallback: 'Error al cargar datos de XP.',
    loadingRewards: 'Cargando reglas...',
    loadingThresholds: 'Cargando desbloqueos...',
    noThresholds:
      'Aún no hay hitos publicados. (Admin: añádelos en /admin/xp.)',

    gateTitle: 'Inicia sesión para ver tu XP',
    gateDesc:
      'Esta página es privada porque XP existe para guardar progreso real, desbloqueos y consistencia — no para “curiosear”.',
    gateLogin: 'Iniciar sesión',
    gateSignup: 'Crear cuenta',

    planQuick: 'Ruta Rápida',
    planBase: 'Ruta Base',
    planSerious: 'Ruta Seria',
    planCTA: 'Ejecutar',

    planQuickDesc: '5 términos en glosario + 1 lectura corta en blog.',
    planBaseDesc: '1 lección + 1 artículo + 5 términos en glosario.',
    planSeriousDesc: '2 lecciones + 2 artículos + 10 términos en glosario.',

    rangeLabel: 'Rango',
    creatorBonusLabel: 'Bonus de creador',
    officialRulesLabel: 'Reglas oficiales',
  },
  en: {
    eyebrow: 'XP SYSTEM',
    title: 'XP is not a game. It’s a filter.',
    subtitle:
      'It separates curiosity from commitment. It forces a foundation. It proves consistency before unlocking higher layers.',
    manifestoTitle: 'Why XP exists',
    manifestoPoints: [
      'Filters “just browsing” from execution.',
      'Prevents weak shortcuts: learning out of order creates fake confidence.',
      'Signals who deserves unlocks and closer guidance.',
    ],
    badge: 'Legacy XP — Official system',

    stickyLabel: 'Shortcuts',
    ctaLeaderboard: 'Leaderboard',
    ctaGlossary: 'Glossary',
    ctaBlog: 'Blog',
    ctaCourses: 'Courses',

    todayKicker: 'PLAN',
    todayTitle: 'Your plan for today',
    todayDesc:
      'Pick a route. Do it. Close it. Come back tomorrow. That’s how you build advantage — without noise.',

    rewardsKicker: 'RULES',
    rewardsTitle: 'How XP is earned (official rules)',
    rewardsDesc:
      'Reference, not noise: official, auditable ranges designed to reward real effort.',

    consistencyKicker: 'CONSISTENCY',
    consistencyTitle: 'Streaks reward real discipline',
    consistencyIntro:
      'Streaks don’t count presence. They count XP earned. One day without XP resets the streak.',
    consistencyPoints: [
      'Global daily cap: 369 XP.',
      '7-day streak: 222 XP (XP earned 7 days in a row).',
      '30-day streak: 1,111 XP (XP earned 30 days in a row).',
    ],
    monitoringTitle: 'Fair Play',
    monitoringBody:
      'Lessons and reads count once per user. Creators don’t earn XP by consuming their own content. Creator bonus happens when others complete it — not via farming.',

    thresholdsKicker: 'UNLOCKS',
    thresholdsTitle: 'Milestones: total XP unlocks extra access',
    thresholdsDesc:
      'Your total XP defines what you can unlock. Not status. Context and responsibility.',
    levelNote: 'Level = total XP / 100 (rounded down).',
    unlockNote:
      'Hit milestones to unlock houses, private forums, missions, and challenges. The goal is standards, not points.',

    glossaryNote:
      'Legacy Glossary: each validated progress reading grants 2 XP per term and counts once per user (including the author). No creator bonus applies here.',
    errorsFallback: 'Failed to load XP data.',
    loadingRewards: 'Loading rules...',
    loadingThresholds: 'Loading unlocks...',
    noThresholds: 'No milestones published yet. (Admin: add them in /admin/xp.)',

    gateTitle: 'Sign in to view your XP',
    gateDesc:
      'This page is private because XP exists to track real progress, unlocks, and consistency — not browsing.',
    gateLogin: 'Log in',
    gateSignup: 'Create account',

    planQuick: 'Quick Route',
    planBase: 'Base Route',
    planSerious: 'Serious Route',
    planCTA: 'Execute',

    planQuickDesc: '5 glossary terms + 1 short blog read.',
    planBaseDesc: '1 lesson + 1 article + 5 glossary terms.',
    planSeriousDesc: '2 lessons + 2 articles + 10 glossary terms.',

    rangeLabel: 'Range',
    creatorBonusLabel: 'Creator bonus',
    officialRulesLabel: 'Official rules',
  },
};

/** ---------- UI tokens (coerência com o teu sistema visual dark premium) ---------- */
const UI = {
  eyebrow: 'text-xs uppercase tracking-[0.5em] text-cyan-300',
  heroTitle: 'leading-tight font-bold tracking-tight text-[#fdd87c] text-4xl md:text-6xl',
  sectionTitle: 'mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#fdd87c]',
  sectionSubtitle: 'mt-3 text-sm text-slate-200',
  body: 'text-sm text-slate-200',
  bodyMuted: 'text-sm text-slate-300',
  micro: 'text-xs text-slate-300',
  cardTitle: 'text-lg font-semibold text-white',
  goldStatLabel: 'text-[11px] uppercase tracking-[0.4em] text-[#fdd87c]',
  cyanValue: 'text-2xl font-semibold text-[#5af3ff]',
  panel:
    'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]',
  cardSurface: 'rounded-2xl border border-white/10 bg-[#04131b]/80 backdrop-blur',
  statCard:
    'rounded-2xl border border-white/15 bg-[#000c12]/40 px-4 py-3 text-center shadow-lg shadow-black/40',
  haloCyan: 'absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl',
  haloGold: 'absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl',
  ctaPrimary:
    'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]',
  ctaOutline: 'border-white/40 text-white hover:bg-white/10',
};

const rewardMetadata: Record<
  string,
  {
    title: Record<SupportedCopyLang, string>;
    creatorBonus?: Record<SupportedCopyLang, string>;
  }
> = {
  lesson_complete: {
    title: { pt: 'Lição concluída', es: 'Lección completada', en: 'Lesson completed' },
    creatorBonus: {
      pt: '+19% quando outros completam a tua lição (criador).',
      es: '+19% cuando otros completan tu lección (creador).',
      en: '+19% when others complete your lesson (creator).',
    },
  },
  blog_read: {
    title: { pt: 'Artigo lido', es: 'Artículo leído', en: 'Article read' },
    creatorBonus: {
      pt: '+19% quando outros leem o teu artigo (criador).',
      es: '+19% cuando otros leen tu artículo (creador).',
      en: '+19% when others read your article (creator).',
    },
  },
  profile_complete: {
    title: { pt: 'Perfil completo', es: 'Perfil completado', en: 'Profile completed' },
  },
  forum_post: { title: { pt: 'Publicação no fórum', es: 'Publicación en el foro', en: 'Forum post' } },
  forum_topic: { title: { pt: 'Tópico no fórum', es: 'Tema en el foro', en: 'Forum topic' } },
  forum_comment: {
    title: { pt: 'Comentário no fórum', es: 'Comentario en el foro', en: 'Forum comment' },
    creatorBonus: {
      pt: '+0,5 XP por like relevante (quando aplicável).',
      es: '+0,5 XP por like relevante (cuando aplique).',
      en: '+0.5 XP per relevant like (when applicable).',
    },
  },
  glossary_term_read: {
    title: { pt: 'Glossário – termo lido', es: 'Glosario – término leído', en: 'Glossary – term read' },
  },
  mission_daily: { title: { pt: 'Missão diária', es: 'Misión diaria', en: 'Daily mission' } },
};

const REWARD_HIGHLIGHT_ACTIONS = new Set([
  'lesson_complete',
  'profile_complete',
  'blog_read',
  'glossary_term_read',
  'forum_post',
  'forum_topic',
  'forum_comment',
]);

const HIGHLIGHT_TITLE_CLASS =
  'text-[#5af3ff] drop-shadow-[0_0_12px_rgba(90,243,255,0.55)]';

const getRewardTitleClass = (action: string) =>
  REWARD_HIGHLIGHT_ACTIONS.has(action) ? HIGHLIGHT_TITLE_CLASS : 'text-white';

const getRewardMeta = (action: string, language: SupportedCopyLang): { title: string; creatorBonus?: string } => {
  const meta = rewardMetadata[action];
  if (!meta) {
    const fallback = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return { title: fallback };
  }
  return {
    title: meta.title[language] ?? meta.title.en,
    creatorBonus: meta.creatorBonus ? meta.creatorBonus[language] ?? meta.creatorBonus.en : undefined,
  };
};

const formatRange = (min: number | null, max: number | null) => {
  const a = typeof min === 'number' ? min : 0;
  const b = typeof max === 'number' ? max : 0;
  if (a === b) return `${a} XP`;
  return `${a}–${b} XP`;
};

const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

const getLang = (language: string): SupportedCopyLang => {
  if (language === 'pt' || language === 'es' || language === 'en') return language;
  return 'en';
};

export default function EducationXpPage() {
  const { user, getToken } = useAuth();
  const { language: langRaw } = useLanguage();

  const language = getLang(langRaw as string);
  const copy = XP_COPY[language] ?? XP_COPY.en;

  const [xpData, setXpData] = useState<EducationXpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userXP = user?.xp_total ?? 0;

  useEffect(() => {
    let active = true;

    if (!user) {
      setXpData(null);
      setLoading(false);
      return;
    }

    const fetchXp = async () => {
      try {
        setLoading(true);
        const token = getToken?.();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch('/api/education/xp', {
          cache: 'no-store',
          headers,
        });

        const data = (await response.json()) as ApiResponse;
        if (!active) return;

        if (data.success) {
          setXpData({
            rewards: data.rewards ?? [],
            limits: data.limits ?? [],
            thresholds: data.thresholds ?? [],
          });
          setError(null);
        } else {
          setError(data.error || copy.errorsFallback);
        }
      } catch {
        if (!active) return;
        setError(copy.errorsFallback);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchXp();

    return () => {
      active = false;
    };
  }, [user, getToken, copy.errorsFallback]);

  /** ---------- Dados derivados ---------- */
  const rewardMap = useMemo(() => {
    const map = new Map<string, XpReward>();
    (xpData?.rewards ?? []).forEach((r) => map.set(r.action_type, r));
    return map;
  }, [xpData?.rewards]);

  const dailyCap = useMemo(() => {
    // tenta ler de limits/metadata; fallback para o valor oficial do copy
    // (mantemos o número do copy como fonte de verdade visual)
    return 369;
  }, []);

  const visibleRewards = useMemo(() => {
    // Mantém referência útil sem ruído: esconde o que já explicamos em “Consistência”
    const hiddenActions = new Set(['streak_7', 'streak_30']);
    return (xpData?.rewards ?? []).filter((r) => !hiddenActions.has(r.action_type));
  }, [xpData?.rewards]);

  const groupedRewards = useMemo(() => {
    const r = visibleRewards;

    const group = {
      learn: [] as XpReward[],
      profile: [] as XpReward[],
      contribute: [] as XpReward[],
      consistency: [] as XpReward[],
      other: [] as XpReward[],
    };

    r.forEach((item) => {
      const a = item.action_type;
      if (a === 'lesson_complete' || a === 'blog_read' || a === 'glossary_term_read') group.learn.push(item);
      else if (a === 'profile_complete') group.profile.push(item);
      else if (a.startsWith('forum_')) group.contribute.push(item);
      else if (a.startsWith('mission_') || a.startsWith('streak_')) group.consistency.push(item);
      else group.other.push(item);
    });

    return group;
  }, [visibleRewards]);

  const thresholds = xpData?.thresholds ?? [];

  /** ---------- Planos do dia (estimativas baseadas em mínimos oficiais) ---------- */
  const minLesson = clamp0(rewardMap.get('lesson_complete')?.min_xp ?? 0);
  const minBlog = clamp0(rewardMap.get('blog_read')?.min_xp ?? 0);
  const minGlossary = clamp0(rewardMap.get('glossary_term_read')?.min_xp ?? 0);

  const quickMin = minGlossary * 5 + minBlog * 1;
  const baseMin = minLesson * 1 + minBlog * 1 + minGlossary * 5;
  const seriousMin = minLesson * 2 + minBlog * 2 + minGlossary * 10;

  const planCards = [
    {
      key: 'quick',
      title: copy.planQuick,
      desc: copy.planQuickDesc,
      xpHint: minGlossary || minBlog ? `${quickMin}+ XP` : '—',
      icon: Eye,
      href: '/education/glossary',
      cta: copy.planCTA,
    },
    {
      key: 'base',
      title: copy.planBase,
      desc: copy.planBaseDesc,
      xpHint: minLesson || minBlog || minGlossary ? `${baseMin}+ XP` : '—',
      icon: Target,
      href: '/education',
      cta: copy.planCTA,
      featured: true,
    },
    {
      key: 'serious',
      title: copy.planSerious,
      desc: copy.planSeriousDesc,
      xpHint: minLesson || minBlog || minGlossary ? `${seriousMin}+ XP` : '—',
      icon: CheckCircle2,
      href: '/education/courses',
      cta: copy.planCTA,
    },
  ];

  /** ---------- Gate (página fechada) ---------- */
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center">
          <div className="container mx-auto max-w-3xl px-4">
            <Card className={cn(UI.panel, 'p-0')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={UI.haloCyan} />
                <div className={UI.haloGold} />
              </div>
              <CardContent className="relative py-10 space-y-5 text-center">
                <p className={UI.eyebrow}>{copy.eyebrow}</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#fdd87c]">{copy.gateTitle}</h1>
                <p className="text-sm text-slate-200 max-w-2xl mx-auto">{copy.gateDesc}</p>
                <div className="flex justify-center flex-wrap gap-3 pt-2">
                  <Link href="/login">
                    <Button className={cn(UI.ctaPrimary, 'px-8')}>
                      {copy.gateLogin}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" className={cn(UI.ctaOutline, 'px-8')}>
                      {copy.gateSignup}
                    </Button>
                  </Link>
                </div>
                <p className={cn(UI.micro, 'text-slate-400')}>
                  {language === 'pt'
                    ? 'XP existe para progresso real — não para “ver como funciona”.'
                    : language === 'es'
                    ? 'XP existe para progreso real — no para “curiosear”.'
                    : 'XP exists for real progress — not browsing.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* HERO (curto, sério, sem stock) */}
            <HeroSection className="px-0 py-0" overlayVariant="inverse">
              <section className={cn(UI.panel, 'px-6 py-10')}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className={UI.haloCyan} />
                  <div className={UI.haloGold} />
                </div>

                <HeroContent className="relative lg:items-center">
                  <HeroTextColumn>
                    <div className="space-y-4">
                      <HeroEyebrow className={UI.eyebrow}>{copy.eyebrow}</HeroEyebrow>

                      <HeroTitle className={UI.heroTitle}>{copy.title}</HeroTitle>

                      <HeroDescription className="text-base text-slate-100 leading-relaxed max-w-2xl">
                        {copy.subtitle}
                      </HeroDescription>

                      <div className={cn(UI.cardSurface, 'p-4')}>
                        <p className={cn(UI.goldStatLabel, 'mb-2')}>{copy.manifestoTitle}</p>
                        <ul className="space-y-2">
                          {copy.manifestoPoints.map((p) => (
                            <li key={p} className={cn(UI.body, 'flex gap-2')}>
                              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/80" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <Link href="/education/xp/leaderboard">
                          <Button className={cn(UI.ctaPrimary)}>
                            {copy.ctaLeaderboard}
                            <BarChart3 className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>

                        <Link href="/education">
                          <Button variant="outline" className={cn(UI.ctaOutline)}>
                            {copy.ctaCourses}
                            <BookOpen className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>

                        <Badge className="border border-white/10 bg-cyan-500/15 text-cyan-100">
                          {copy.badge}
                        </Badge>
                      </div>

                      <p className={cn(UI.micro, 'text-slate-400')}>
                        {language === 'pt'
                          ? 'O conteúdo é livre. O progresso é merecido.'
                          : language === 'es'
                          ? 'El contenido es libre. El progreso se gana.'
                          : 'Content is open. Progress is earned.'}
                      </p>
                    </div>
                  </HeroTextColumn>

                  {/* Painel abstracto (sem imagem stock) */}
                  <div className="relative w-full">
                    <div className={cn(UI.cardSurface, 'p-5')}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className={UI.goldStatLabel}>{copy.officialRulesLabel}</p>
                          <p className={cn(UI.body, 'mt-1')}>
                            {language === 'pt'
                              ? 'Limite diário global e streaks existem para travar spam e premiar disciplina.'
                              : language === 'es'
                              ? 'El límite diario y los streaks frenan spam y premian disciplina.'
                              : 'Daily cap and streaks stop spam and reward discipline.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/50 px-3 py-2">
                          <Lock className="h-4 w-4 text-[#fdd87c]" />
                          <span className={cn(UI.body, 'text-white')}>
                            {language === 'pt' ? 'Privado' : language === 'es' ? 'Privado' : 'Private'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className={cn('rounded-2xl border border-white/10 bg-[#000c12]/40 p-4')}>
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                            <ShieldCheck className="h-4 w-4 text-cyan-300" />
                            {language === 'pt' ? 'Limite diário' : language === 'es' ? 'Límite diario' : 'Daily cap'}
                          </div>
                          <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>{dailyCap} XP</p>
                          <p className={cn(UI.micro, 'mt-1')}>
                            {language === 'pt'
                              ? 'Depois disso, aprendes na mesma — mas não acumulas XP.'
                              : language === 'es'
                              ? 'Después, sigues aprendiendo — pero no acumulas XP.'
                              : 'After that, you can still learn — XP stops accumulating.'}
                          </p>
                        </div>

                        <div className={cn('rounded-2xl border border-white/10 bg-[#000c12]/40 p-4')}>
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                            <Flame className="h-4 w-4 text-cyan-300" />
                            7 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}
                          </div>
                          <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>222 XP</p>
                          <p className={cn(UI.micro, 'mt-1')}>
                            {language === 'pt'
                              ? 'XP ganho todos os dias. Sem desculpas.'
                              : language === 'es'
                              ? 'XP ganado cada día. Sin excusas.'
                              : 'XP earned daily. No excuses.'}
                          </p>
                        </div>

                        <div className={cn('rounded-2xl border border-white/10 bg-[#000c12]/40 p-4')}>
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                            <CalendarCheck className="h-4 w-4 text-cyan-300" />
                            30 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}
                          </div>
                          <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>1.111 XP</p>
                          <p className={cn(UI.micro, 'mt-1')}>
                            {language === 'pt'
                              ? 'A disciplina que muda o teu ritmo.'
                              : language === 'es'
                              ? 'La disciplina que cambia tu ritmo.'
                              : 'Discipline that changes your pace.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-[#000c12]/60 px-4 py-2">
                          <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                            {language === 'pt' ? 'O teu XP' : language === 'es' ? 'Tu XP' : 'Your XP'}
                          </span>
                          <span className="text-white font-semibold">{userXP.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/education/glossary">
                            <Button size="sm" variant="outline" className={UI.ctaOutline}>
                              {copy.ctaGlossary}
                            </Button>
                          </Link>
                          <Link href="/blog">
                            <Button size="sm" variant="outline" className={UI.ctaOutline}>
                              {copy.ctaBlog}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </HeroContent>

                <div className="relative mt-5 rounded-2xl border border-white/10 bg-[#031b26]/70 p-4">
                  <p className={cn(UI.body, 'text-slate-100')}>
                    <span className="font-semibold text-white">
                      {language === 'pt' ? 'Nota:' : language === 'es' ? 'Nota:' : 'Note:'}
                    </span>{' '}
                    {copy.glossaryNote}
                  </p>
                </div>
              </section>
            </HeroSection>

            {/* STICKY BAR (premium, utilitária) */}
            <div className="sticky top-16 z-40">
              <div className={cn(UI.cardSurface, 'px-4 py-3')}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(UI.goldStatLabel, 'text-[#fdd87c]')}>{copy.stickyLabel}</span>

                    <Link href="/education/xp/leaderboard">
                      <Button size="sm" className={cn(UI.ctaPrimary)}>
                        {copy.ctaLeaderboard}
                        <BarChart3 className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    <Link href="/education">
                      <Button size="sm" variant="outline" className={UI.ctaOutline}>
                        {copy.ctaCourses}
                      </Button>
                    </Link>

                    <Link href="/education/glossary">
                      <Button size="sm" variant="outline" className={UI.ctaOutline}>
                        {copy.ctaGlossary}
                      </Button>
                    </Link>

                    <Link href="/blog">
                      <Button size="sm" variant="outline" className={UI.ctaOutline}>
                        {copy.ctaBlog}
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#000c12]/50 px-3 py-2">
                      <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                        {language === 'pt' ? 'XP' : 'XP'}
                      </span>
                      <span className="text-white font-semibold">{userXP.toLocaleString()}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#000c12]/50 px-3 py-2">
                      <Sparkles className="h-4 w-4 text-[#fdd87c]" />
                      <span className={cn(UI.micro, 'text-slate-200')}>{copy.levelNote}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ERRO */}
            {error && (
              <Card className="border border-rose-500/40 bg-rose-950/60">
                <CardContent className="py-4">
                  <p className="text-sm text-rose-100">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* O TEU PLANO DE HOJE */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative">
                <p className={UI.eyebrow}>{copy.todayKicker}</p>
                <h2 className={UI.sectionTitle}>{copy.todayTitle}</h2>
                <p className={UI.sectionSubtitle}>{copy.todayDesc}</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {planCards.map((p) => {
                    const Icon = p.icon;
                    return (
                      <Card
                        key={p.key}
                        className={cn(
                          UI.cardSurface,
                          'overflow-hidden transition hover:border-cyan-400/60 hover:shadow-[0_0_35px_rgba(34,211,238,0.22)]',
                          p.featured ? 'border-[#fdd87c]/30' : '',
                        )}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className={cn(UI.goldStatLabel, p.featured ? 'text-[#fdd87c]' : '')}>{p.title}</p>
                              <p className={cn(UI.body, 'mt-2')}>{p.desc}</p>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/40 px-3 py-2">
                              <Icon className="h-4 w-4 text-cyan-300" />
                              <span className="text-sm font-semibold text-white">{p.xpHint}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className={cn(UI.micro, 'text-slate-400')}>
                              {language === 'pt'
                                ? 'Estimativa baseada em mínimos oficiais.'
                                : language === 'es'
                                ? 'Estimación basada en mínimos oficiales.'
                                : 'Estimate based on official minimums.'}
                            </span>

                            <Link href={p.href}>
                              <Button size="sm" className={cn(UI.ctaPrimary)}>
                                {p.cta}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* REGRAS OFICIAIS */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className={UI.haloCyan} />
                <div className={UI.haloGold} />
              </div>

              <div className="relative">
                <p className={UI.eyebrow}>{copy.rewardsKicker}</p>
                <h2 className={UI.sectionTitle}>{copy.rewardsTitle}</h2>
                <p className={UI.sectionSubtitle}>{copy.rewardsDesc}</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-12">
                  {/* Aprender */}
                  <div className="lg:col-span-6">
                    <Card className={cn(UI.cardSurface, 'h-full')}>
                      <CardContent className="p-5">
                        <p className={UI.goldStatLabel}>
                          {language === 'pt' ? 'Aprender' : language === 'es' ? 'Aprender' : 'Learn'}
                        </p>
                        <p className={cn(UI.micro, 'mt-1 text-slate-400')}>
                          {language === 'pt'
                            ? 'A base: lições, leituras e glossário.'
                            : language === 'es'
                            ? 'La base: lecciones, lecturas y glosario.'
                            : 'The foundation: lessons, reads, glossary.'}
                        </p>

                        <div className="mt-4 grid gap-3">
                          {(groupedRewards.learn.length ? groupedRewards.learn : []).map((reward) => {
                            const meta = getRewardMeta(reward.action_type, language);
                            return (
                              <div
                                key={reward.action_type}
                                className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className={cn('text-sm font-semibold', getRewardTitleClass(reward.action_type))}>
                                    {meta.title}
                                  </p>
                                  <span className="rounded-full border border-white/15 bg-[#000c12]/30 px-3 py-1 text-xs text-slate-200">
                                    {copy.rangeLabel}: {formatRange(reward.min_xp, reward.max_xp)}
                                  </span>
                                </div>
                                {meta.creatorBonus ? (
                                  <p className={cn(UI.micro, 'mt-2 text-slate-300')}>
                                    <span className="text-cyan-200">{copy.creatorBonusLabel}:</span> {meta.creatorBonus}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}

                          {!groupedRewards.learn.length && (
                            <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                              <p className={UI.bodyMuted}>{loading ? copy.loadingRewards : '—'}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Perfil + Contribuir */}
                  <div className="lg:col-span-6 grid gap-4">
                    <Card className={cn(UI.cardSurface)}>
                      <CardContent className="p-5">
                        <p className={UI.goldStatLabel}>
                          {language === 'pt' ? 'Perfil' : language === 'es' ? 'Perfil' : 'Profile'}
                        </p>
                        <p className={cn(UI.micro, 'mt-1 text-slate-400')}>
                          {language === 'pt'
                            ? 'Credibilidade mínima para acompanhar o teu progresso.'
                            : language === 'es'
                            ? 'Credibilidad mínima para seguir tu progreso.'
                            : 'Minimum credibility to track your progress.'}
                        </p>

                        <div className="mt-4 grid gap-3">
                          {(groupedRewards.profile.length ? groupedRewards.profile : []).map((reward) => {
                            const meta = getRewardMeta(reward.action_type, language);
                            return (
                              <div
                                key={reward.action_type}
                                className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className={cn('text-sm font-semibold', getRewardTitleClass(reward.action_type))}>
                                    {meta.title}
                                  </p>
                                  <span className="rounded-full border border-white/15 bg-[#000c12]/30 px-3 py-1 text-xs text-slate-200">
                                    {formatRange(reward.min_xp, reward.max_xp)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {!groupedRewards.profile.length && (
                            <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                              <p className={UI.bodyMuted}>{loading ? copy.loadingRewards : '—'}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={cn(UI.cardSurface)}>
                      <CardContent className="p-5">
                        <p className={UI.goldStatLabel}>
                          {language === 'pt' ? 'Contribuir' : language === 'es' ? 'Contribuir' : 'Contribute'}
                        </p>
                        <p className={cn(UI.micro, 'mt-1 text-slate-400')}>
                          {language === 'pt'
                            ? 'Fórum: valor real, sem spam.'
                            : language === 'es'
                            ? 'Foro: valor real, sin spam.'
                            : 'Forum: real value, no spam.'}
                        </p>

                        <div className="mt-4 grid gap-3">
                          {(groupedRewards.contribute.length ? groupedRewards.contribute : []).map((reward) => {
                            const meta = getRewardMeta(reward.action_type, language);
                            return (
                              <div
                                key={reward.action_type}
                                className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className={cn('text-sm font-semibold', getRewardTitleClass(reward.action_type))}>
                                    {meta.title}
                                  </p>
                                  <span className="rounded-full border border-white/15 bg-[#000c12]/30 px-3 py-1 text-xs text-slate-200">
                                    {formatRange(reward.min_xp, reward.max_xp)}
                                  </span>
                                </div>
                                {meta.creatorBonus ? (
                                  <p className={cn(UI.micro, 'mt-2 text-slate-300')}>
                                    <span className="text-cyan-200">{copy.creatorBonusLabel}:</span> {meta.creatorBonus}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}

                          {!groupedRewards.contribute.length && (
                            <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                              <p className={UI.bodyMuted}>{loading ? copy.loadingRewards : '—'}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Fair Play / Auditoria */}
                <div className="mt-6 grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <Card className={cn(UI.cardSurface)}>
                      <CardContent className="p-5">
                        <p className={UI.goldStatLabel}>{copy.monitoringTitle}</p>
                        <p className={cn(UI.body, 'mt-2')}>{copy.monitoringBody}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-white/20 bg-[#000c12]/30 text-slate-200">
                            {language === 'pt' ? 'Anti-spam' : language === 'es' ? 'Anti-spam' : 'Anti-spam'}
                          </Badge>
                          <Badge variant="outline" className="border-white/20 bg-[#000c12]/30 text-slate-200">
                            {language === 'pt' ? 'Sem farming' : language === 'es' ? 'Sin farming' : 'No farming'}
                          </Badge>
                          <Badge variant="outline" className="border-white/20 bg-[#000c12]/30 text-slate-200">
                            {language === 'pt' ? '1x por utilizador' : language === 'es' ? '1x por usuario' : 'Once per user'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-5">
                    <Card className={cn(UI.cardSurface)}>
                      <CardContent className="p-5">
                        <p className={UI.goldStatLabel}>
                          {language === 'pt' ? 'Liga à evidência' : language === 'es' ? 'Evidencia' : 'Evidence'}
                        </p>
                        <p className={cn(UI.body, 'mt-2')}>
                          {language === 'pt'
                            ? 'Leaderboard não é ego. É consistência visível. Mostra quem aparece, termina e volta.'
                            : language === 'es'
                            ? 'El leaderboard no es ego. Es consistencia visible. Muestra quién aparece, termina y vuelve.'
                            : 'Leaderboard is not ego. It’s visible consistency. It shows who shows up, finishes, and returns.'}
                        </p>
                        <div className="mt-4">
                          <Link href="/education/xp/leaderboard">
                            <Button className={cn(UI.ctaPrimary, 'w-full')}>
                              {copy.ctaLeaderboard}
                              <BarChart3 className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        <p className={cn(UI.micro, 'mt-2 text-slate-400')}>
                          {language === 'pt'
                            ? 'Compete contra o “tu de ontem”.'
                            : language === 'es'
                            ? 'Compite contra tu “yo de ayer”.'
                            : 'Compete against yesterday you.'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* CONSISTÊNCIA */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
              </div>

              <div className="relative grid gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-7 space-y-3">
                  <p className={UI.eyebrow}>{copy.consistencyKicker}</p>
                  <h2 className={UI.sectionTitle}>{copy.consistencyTitle}</h2>
                  <p className={UI.sectionSubtitle}>{copy.consistencyIntro}</p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className={cn(UI.cardSurface, 'p-4')}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                        <ShieldCheck className="h-4 w-4 text-cyan-300" />
                        {language === 'pt' ? 'Limite diário' : language === 'es' ? 'Límite diario' : 'Daily cap'}
                      </div>
                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>369 XP</p>
                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[0]}</p>
                    </div>

                    <div className={cn(UI.cardSurface, 'p-4')}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                        <Flame className="h-4 w-4 text-cyan-300" />
                        7 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}
                      </div>
                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>222 XP</p>
                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[1]}</p>
                    </div>

                    <div className={cn(UI.cardSurface, 'p-4')}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                        <CalendarCheck className="h-4 w-4 text-cyan-300" />
                        30 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}
                      </div>
                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>1.111 XP</p>
                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[2]}</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <Card className={cn(UI.cardSurface)}>
                    <CardContent className="p-5 space-y-4">
                      <p className={UI.goldStatLabel}>
                        {language === 'pt' ? 'Regra simples' : language === 'es' ? 'Regla simple' : 'Simple rule'}
                      </p>
                      <p className={cn(UI.body, 'text-slate-100')}>
                        {language === 'pt'
                          ? 'Um curso de cada vez. Termina. Só depois avanças. Isto cria capacidade real.'
                          : language === 'es'
                          ? 'Un curso a la vez. Termina. Luego avanzas. Esto crea capacidad real.'
                          : 'One course at a time. Finish it. Then move forward. That builds real capacity.'}
                      </p>
                      <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                        <p className={UI.goldStatLabel}>
                          {language === 'pt' ? 'Dica de execução' : language === 'es' ? 'Consejo' : 'Execution tip'}
                        </p>
                        <p className={cn(UI.body, 'mt-2')}>
                          {language === 'pt'
                            ? 'Se falhas um dia, não dramatizes. Recomeça no dia seguinte. O streak existe para treinar disciplina, não para te castigar.'
                            : language === 'es'
                            ? 'Si fallas un día, no dramatices. Reinicia al día siguiente. El streak entrena disciplina, no castigo.'
                            : 'If you miss a day, don’t dramatise. Restart tomorrow. Streaks train discipline, not punishment.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* DESBLOQUEIOS */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -right-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
              </div>

              <div className="relative space-y-5">
                <div className="space-y-2">
                  <p className={UI.eyebrow}>{copy.thresholdsKicker}</p>
                  <h2 className={UI.sectionTitle}>{copy.thresholdsTitle}</h2>
                  <p className={UI.sectionSubtitle}>{copy.thresholdsDesc}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {thresholds.length === 0 ? (
                    <Card className={cn(UI.cardSurface)}>
                      <CardContent className="py-6">
                        <p className={UI.bodyMuted}>{loading ? copy.loadingThresholds : copy.noThresholds}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    thresholds.map((t) => {
                      const needs =
                        language === 'pt'
                          ? `Precisas de ${t.xp_total} XP totais`
                          : language === 'es'
                          ? `Necesitas ${t.xp_total} XP totales`
                          : `You need ${t.xp_total} total XP`;

                      return (
                        <Card key={`${t.xp_total}-${t.feature_name}`} className={cn(UI.cardSurface)}>
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className={cn(UI.micro, 'text-slate-300')}>{needs}</span>
                              <Badge variant="outline" className="border-white/20 bg-[#000c12]/30 text-slate-200">
                                {language === 'pt' ? 'Desbloqueio' : language === 'es' ? 'Desbloqueo' : 'Unlock'}
                              </Badge>
                            </div>
                            <p className={cn(UI.cardTitle, HIGHLIGHT_TITLE_CLASS)}>{t.feature_name}</p>
                            {t.description ? <p className={UI.body}>{t.description}</p> : null}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                <Card className={cn(UI.cardSurface)}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-[#fdd87c]" />
                      <p className={UI.body}>{copy.levelNote}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-emerald-300" />
                      <p className={UI.body}>{copy.unlockNote}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
