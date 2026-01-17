'use client';



import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { Header } from '@/components/layout/Header';

import { Footer } from '@/components/layout/Footer';

import {
  OnboardingPopup,
  type OnboardingPopupData,
} from '@/components/education/OnboardingPopup';

import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { useLanguage } from '@/contexts/LanguageContext';

import { useAuth } from '@/contexts/AuthContext';

import {
  useOnboardingQueue,
  type QueueLog,
  type QueueLogAction,
} from '@/hooks/useOnboardingQueue';
import type { HouseOnboardingSequence, OnboardingLogEntry, OnboardingPopupLocalizedFields } from '@/types/onboarding';

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

  Sparkles,

  Trophy,

  BarChart3,

  Target,

  CheckCircle2,

  Lock,

  Eye,

  Loader2,

} from 'lucide-react';



export const dynamic = 'force-dynamic';



type SupportedCopyLang = 'pt' | 'es' | 'en';



type XpReward = {

  action_type: string;

  min_xp: number | null;

  max_xp: number | null;

  creator_bonus_pct?: number | null;

};



type XpThreshold = {

  xp_total: number;

  feature_name: string;

  description?: string | null;

  id?: string;

};



type ProgressCourseSummaryLite = {

  id: string;

  slug: string | null;

  title: string;

  isCompleted: boolean;

};


type ProgressSummaryLite = {

  startHere: { slug: string; isCompleted: boolean };

  startCourse?: { slug: string; title?: string | null } | null;

  coursesByLevel: Record<string, ProgressCourseSummaryLite[]>;

};


type EducationXpData = {

  rewards: XpReward[];

  thresholds: XpThreshold[];

};

type OnboardingResponse =
  | { success: true; sequence: HouseOnboardingSequence }
  | { success: false; error?: string };



type ApiResponse =

  | { success: true; rewards: XpReward[]; thresholds: XpThreshold[] }

  | { success: false; error: string };



type ComboKey = 'quick' | 'base' | 'serious';



type ComboProgressState = {

  glossary_count: number;

  blog_count: number;

  lesson_count: number;

  quick_completed: boolean;

  base_completed: boolean;

  serious_completed: boolean;

};



type ComboMissionMeta = {

  xp: number;

  completed: boolean;

};



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

  planQuickXP: string;

  planBaseXP: string;

  planSeriousXP: string;



  rangeLabel: string;

  creatorBonusLabel: string;

  officialRulesLabel: string;
};

type OnboardingFeatureCopy = {
  title: string;
  description: string;
};

type OnboardingStepCopy = {
  tag: string;
  trigger: string;
  focus: string;
  cta: string;
  note: string;
};

type OnboardingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: OnboardingFeatureCopy[];
  sequenceTitle: string;
  sequenceSubtitle: string;
  stepLabels: { trigger: string; focus: string; cta: string };
  steps: OnboardingStepCopy[];
  governanceTitle: string;
  governanceSubtitle: string;
  governancePoints: string[];
  noteLabel: string;
  blockingNote: string;
};



const XP_COPY: Record<SupportedCopyLang, CopyPack> = {

  pt: {

    eyebrow: 'SISTEMA XP',

    title: 'XP não é um jogo. É um filtro.',

    subtitle:

      'Serve para separar curiosidade de compromisso. Para te obrigar a ganhar base. Para provar consistência antes de desbloquear camadas mais exigentes.',

    manifestoTitle: 'Porque existe XP',

    manifestoPoints: [

      'Filtra quem "anda a ver" de quem executa.',

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

      'Streaks não contam presença. Contam XP ganho. Precisas de iniciar sessão e ganhar XP pelo menos uma vez por dia. Um dia sem XP e a contagem reinicia.',

    consistencyPoints: [

      'Streak de 7 dias: 222 XP (XP ganho em 7 dias seguidos).',

      'Streak de 30 dias: 1.111 XP (XP ganho em 30 dias seguidos).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'Lições e leituras contam uma vez por utilizador. Criadores não ganham XP ao consumir o próprio conteúdo. O bónus de criador existe quando outros completam — não quando o autor "faz farming".',



    thresholdsKicker: 'DESBLOQUEIOS',

    thresholdsTitle: 'Milestones: XP total desbloqueia acesso extra',

    thresholdsDesc:

      'O teu XP total determina o que podes desbloquear. Não é status. É contexto e responsabilidade.',

    levelNote: 'Nível = XP total / 100 (arredondado para baixo).',

    unlockNote:

      'Ao atingir marcos, desbloqueias mensagens privadas com a House, missoes e desafios. O objectivo e elevar o padrao, nao coleccionar "pontos".',



    glossaryNote:

      'Glossário Legacy: cada leitura validada (progress reading) dá 2 XP por termo e só conta uma vez por utilizador (inclui o autor). Não existe bónus extra para criadores neste caso.',

    errorsFallback: 'Falha ao carregar dados de XP.',

    loadingRewards: 'A carregar regras...',

    loadingThresholds: 'A carregar desbloqueios...',

    noThresholds:

      'Ainda não há milestones publicados. (Admin: adiciona-os no painel /admin/xp.)',



    gateTitle: 'Inicia sessão para ver o teu XP',

    gateDesc:

      'Esta página é privada porque XP existe para guardar progresso real, desbloqueios e consistência — não para "espreitar".',

    gateLogin: 'Iniciar sessão',

    gateSignup: 'Criar conta',



    planQuick: 'Rota Basica',

    planBase: 'Rota Base',

    planSerious: 'Rota Seria',

    planCTA: 'Executar',



    planQuickDesc: '1 blog post + 1 licao.',

    planBaseDesc: '2 termos no glossario + 1 blog post + 1 licao.',

    planSeriousDesc: '5 termos no glossario + 2 blog posts + 2 licoes.',

    planQuickXP: '13 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '47 XP extra',



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

      'Filtra a quien "mira" de quien ejecuta.',

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

      'Los streaks no cuentan presencia. Cuentan XP ganado. Debes iniciar sesión y ganar XP al menos una vez al día. Un día sin XP y la racha se reinicia.',

    consistencyPoints: [

      'Racha de 7 días: 222 XP (XP ganado 7 días seguidos).',

      'Racha de 30 días: 1.111 XP (XP ganado 30 días seguidos).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'Lecciones y lecturas cuentan una vez por usuario. Los creadores no ganan XP al consumir su propio contenido. El bonus de creador existe cuando otros completan — no con "farming".',



    thresholdsKicker: 'DESBLOQUEOS',

    thresholdsTitle: 'Hitos: XP total desbloquea acceso extra',

    thresholdsDesc:

      'Tu XP total define lo que puedes desbloquear. No es status. Es contexto y responsabilidad.',

    levelNote: 'Nivel = XP total / 100 (redondeado hacia abajo).',

    unlockNote:

      'Al alcanzar hitos, desbloqueas mensajes privados con la House, misiones y desafios. El objetivo es elevar el estandar, no coleccionar "puntos".',



    glossaryNote:

      'Glosario Legacy: cada lectura validada da 2 XP por término y cuenta una sola vez por usuario (incluye al autor). No hay bonus extra para creadores en este caso.',

    errorsFallback: 'Error al cargar datos de XP.',

    loadingRewards: 'Cargando reglas...',

    loadingThresholds: 'Cargando desbloqueos...',

    noThresholds:

      'Aún no hay hitos publicados. (Admin: añádelos en /admin/xp.)',



    gateTitle: 'Inicia sesión para ver tu XP',

    gateDesc:

      'Esta página es privada porque XP existe para guardar progreso real, desbloqueos y consistencia — no para "curiosear".',

    gateLogin: 'Iniciar sesión',

    gateSignup: 'Crear cuenta',



    planQuick: 'Ruta Basica',

    planBase: 'Ruta Base',

    planSerious: 'Ruta Seria',

    planCTA: 'Ejecutar',



    planQuickDesc: '1 blog post + 1 leccion.',

    planBaseDesc: '2 terminos en el glosario + 1 blog post + 1 leccion.',

    planSeriousDesc: '5 terminos en el glosario + 2 blog posts + 2 lecciones.',

    planQuickXP: '13 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '47 XP extra',



    rangeLabel: 'Rango',

    creatorBonusLabel: 'Bonus de creador',

    officialRulesLabel: 'Reglas oficiales',

  },

  en: {

    eyebrow: 'XP SYSTEM',

    title: 'XP is not a game. It\'s a filter.',

    subtitle:

      'It separates curiosity from commitment. It forces a foundation. It proves consistency before unlocking higher layers.',

    manifestoTitle: 'Why XP exists',

    manifestoPoints: [

      'Filters "just browsing" from execution.',

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

      'Pick a route. Do it. Close it. Come back tomorrow. That\'s how you build advantage — without noise.',



    rewardsKicker: 'RULES',

    rewardsTitle: 'How XP is earned (official rules)',

    rewardsDesc:

      'Reference, not noise: official, auditable ranges designed to reward real effort.',



    consistencyKicker: 'CONSISTENCY',

    consistencyTitle: 'Streaks reward real discipline',

    consistencyIntro:

      'Streaks don\'t count presence. They count XP earned. You must sign in and earn XP at least once every day. One day without XP resets the streak.',

    consistencyPoints: [

      '7-day streak: 222 XP (XP earned 7 days in a row).',

      '30-day streak: 1,111 XP (XP earned 30 days in a row).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'Lessons and reads count once per user. Creators don\'t earn XP by consuming their own content. Creator bonus happens when others complete it — not via farming.',



    thresholdsKicker: 'UNLOCKS',

    thresholdsTitle: 'Milestones: total XP unlocks extra access',

    thresholdsDesc:

      'Your total XP defines what you can unlock. Not status. Context and responsibility.',

    levelNote: 'Level = total XP / 100 (rounded down).',

    unlockNote:

      'Hit milestones to unlock House private messages, missions, and challenges. The goal is standards, not points.',



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



    planQuick: 'Basic Route',

    planBase: 'Base Route',

    planSerious: 'Serious Route',

    planCTA: 'Execute',



    planQuickDesc: '1 blog post + 1 lesson.',

    planBaseDesc: '2 glossary terms + 1 blog post + 1 lesson.',

    planSeriousDesc: '5 glossary terms + 2 blog posts + 2 lessons.',

    planQuickXP: '13 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '47 XP extra',



    rangeLabel: 'Range',

    creatorBonusLabel: 'Creator bonus',

    officialRulesLabel: 'Official rules',

  },

};



const DEFAULT_COMBO_PROGRESS: ComboProgressState = {

  glossary_count: 0,

  blog_count: 0,

  lesson_count: 0,

  quick_completed: false,

  base_completed: false,

  serious_completed: false,

};



const COMBO_REQUIREMENTS: Record<ComboKey, { glossary: number; blog: number; lesson: number }> = {

  quick: { glossary: 0, blog: 1, lesson: 1 },

  base: { glossary: 2, blog: 1, lesson: 1 },

  serious: { glossary: 5, blog: 2, lesson: 2 },

};



const MISSION_TYPE_BY_KEY: Record<ComboKey, string> = {

  quick: 'combo_quick',

  base: 'combo_base',

  serious: 'combo_serious',

};



const DEFAULT_COMBO_META: Record<ComboKey, ComboMissionMeta> = {

  quick: { xp: 13, completed: false },

  base: { xp: 21, completed: false },

  serious: { xp: 47, completed: false },

};



const COMBO_KEYS: ComboKey[] = ['quick', 'base', 'serious'];



const COMBO_KEY_BY_MISSION: Record<string, ComboKey> = COMBO_KEYS.reduce((acc, key) => {

  acc[MISSION_TYPE_BY_KEY[key]] = key;

  return acc;

}, {} as Record<string, ComboKey>);




const POPUP_LANGUAGE_FALLBACK: Record<SupportedCopyLang, SupportedCopyLang[]> = {
  pt: ['pt', 'en', 'es'],
  es: ['es', 'pt', 'en'],
  en: ['en', 'pt', 'es'],
};

const resolvePopupCopyForLanguage = (popup: OnboardingPopupData, language: SupportedCopyLang): OnboardingPopupData => {
  if (!popup.localized) return popup;
  let localizedEntry: OnboardingPopupLocalizedFields | undefined;
  for (const lang of POPUP_LANGUAGE_FALLBACK[language]) {
    const candidate = popup.localized?.[lang];
    if (candidate) {
      localizedEntry = candidate;
      break;
    }
  }
  if (!localizedEntry) {
    const fallback = Object.values(popup.localized)[0];
    localizedEntry = fallback;
  }
  if (!localizedEntry) return popup;
  return {
    ...popup,
    title: localizedEntry.title ?? popup.title,
    body: localizedEntry.body ?? popup.body,
    highlights: localizedEntry.highlights ?? popup.highlights ?? [],
    badgeLabel: localizedEntry.badgeLabel ?? popup.badgeLabel,
    primaryCta: popup.primaryCta
      ? { ...popup.primaryCta, label: localizedEntry.primaryCtaLabel ?? popup.primaryCta.label }
      : popup.primaryCta,
    secondaryCta: popup.secondaryCta
      ? { ...popup.secondaryCta, label: localizedEntry.secondaryCtaLabel ?? popup.secondaryCta.label }
      : popup.secondaryCta,
  };
};

const REQUIREMENT_ORDER = ['glossary', 'blog', 'lesson'] as const;



type RequirementKey = (typeof REQUIREMENT_ORDER)[number];



const REQUIREMENT_LABELS: Record<RequirementKey, Record<SupportedCopyLang, string>> = {

  glossary: { pt: 'Termos no glossário', es: 'Términos en el glosario', en: 'Glossary terms' },

  blog: { pt: 'Leituras no blog', es: 'Lecturas en el blog', en: 'Blog reads' },

  lesson: { pt: 'Lições', es: 'Lecciones', en: 'Lessons' },

};



const COMPLETED_LABELS: Record<SupportedCopyLang, string> = {

  pt: 'Concluída',

  es: 'Completada',

  en: 'Completed',

};



const createDefaultComboMeta = (): Record<ComboKey, ComboMissionMeta> => {

  return COMBO_KEYS.reduce((acc, key) => {

    acc[key] = { ...DEFAULT_COMBO_META[key] };

    return acc;

  }, {} as Record<ComboKey, ComboMissionMeta>);

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

const ONBOARDING_FEATURE_ICONS: Array<typeof Eye> = [Eye, Target, Lock];

const ONBOARDING_COPY: Record<SupportedCopyLang, OnboardingCopy> = {
  pt: {
    eyebrow: 'ONBOARDING PERSONALIZADO',
    title: 'As Houses controlam o ritmo.',
    subtitle:
      'Heads definem pop-ups, triggers e copy direto no Painel Admin. O programa continua justo, auditavel e em tres idiomas.',
    featuresTitle: 'Infraestrutura oficial',
    featuresSubtitle: 'Sequencias usam a mesma paleta escura de /education: gradiente, bordas suaves e destaques ciano/dourado.',
    features: [
      {
        title: 'Painel Admin das Houses',
        description: 'Heads desenham sequencias, idiomas e CTAs com versoes, logs e revisoes antes de publicar.',
      },
      {
        title: 'Triggers por XP + conteudo',
        description: 'Pop-ups podem disparar por milestones ou ao concluir licoes, cursos e blog posts especificos.',
      },
      {
        title: 'Governanca e bloqueio de 3 s',
        description: 'Bloqueio de 3 s e auditoria automatica em cada entrega.',
      },
    ],
    sequenceTitle: 'Sequencia oficial (exemplo)',
    sequenceSubtitle: 'Modelo base para o piloto antes de cada House adaptar o seu plano.',
    stepLabels: { trigger: 'Trigger', focus: 'Foco', cta: 'CTA' },
    steps: [
      {
        tag: 'P1',
        trigger: 'XP 0 - primeiro login',
        focus: 'Boas-vindas + checklist essencial',
        cta: 'Checklist inicial',
        note: 'Define a expectativa da House e apresenta o ecossistema Apertum.',
      },
      {
        tag: 'P2',
        trigger: 'Evento: Glossario basico concluido',
        focus: 'Sequencia perfil > glossario > curso Comeca Aqui',
        cta: 'Seguir caminho recomendado',
        note: 'Mostra itens pendentes antes de libertar conteudos mais avancados.',
      },
      {
        tag: 'P3',
        trigger: 'XP 130 + curso Comeca Aqui concluido',
        focus: 'Autonomia tecnica com tutorial Metamask',
        cta: 'Abrir tutorial seguro',
        note: 'Bloqueia features Web3 ate o utilizador concluir o tutorial.',
      },
      {
        tag: 'P4',
        trigger: 'XP 260 + leitura DAO1 briefing',
        focus: 'Ecosistema Apertum/DAO1 com aviso de riscos',
        cta: 'Formulario DAO1',
        note: 'Pedido chega ao Head para aprovacao manual e logs ficam guardados.',
      },
      {
        tag: 'P5',
        trigger: 'XP 500 ou curso House finalizado',
        focus: 'Integracao House Hub + contacto opcional',
        cta: 'Abrir House Hub',
        note: 'Liberta broadcast, pedidos de ajuda e interacao com membros.',
      },
    ],
    governanceTitle: 'Governanca e suporte',
    governanceSubtitle: 'Tudo segue o Termo oficial e auditoria continua.',
    governancePoints: [
      'Heads gerem sequencias no Painel Admin com historico completo.',
      'Termo de responsabilidade precisa estar assinado antes de editar pop-ups.',
      'Motor segue triggers de XP/conte?do e regista cada entrega.',
      'Logs guardam trigger, idioma, CTA clicado e cumprimento do bloqueio de 3 s.',
      'Mapa do utilizador mostra pop-ups enviados, triggers futuros e pedidos pendentes.',
    ],
    noteLabel: 'Nota oficial',
    blockingNote:
      'Quando um pop-up abre, o utilizador espera 3 segundos antes de fechar ou navegar. Depois disso continua opcional e sem pressao.',
  },
  es: {
    eyebrow: 'ONBOARDING PERSONALIZADO',
    title: 'Las Houses controlan el ritmo.',
    subtitle:
      'Los Heads definen pop-ups, triggers y copy dentro del Panel Admin. El flujo de pop-ups se mantiene justo, auditado y en tres idiomas.',
    featuresTitle: 'Infraestructura oficial',
    featuresSubtitle: 'Los flujos usan la misma paleta oscura de /education con gradientes, bordes suaves y brillos cian/dorado.',
    features: [
      {
        title: 'Panel Admin de las Houses',
        description: 'Heads disenan secuencias, idiomas y CTAs con versiones y registros antes de publicar.',
      },
      {
        title: 'Triggers por XP + contenido',
        description: 'Los pop-ups se activan por hitos de XP o al terminar lecciones, cursos y articulos clave.',
      },
      {
        title: 'Gobernanza y bloqueo de 3 s',
        description: 'Bloqueo de 3 s y auditoria automatica en cada entrega.',
      },
    ],
    sequenceTitle: 'Secuencia oficial (ejemplo)',
    sequenceSubtitle: 'Modelo base para el piloto antes de que cada House adapte su plan.',
    stepLabels: { trigger: 'Trigger', focus: 'Foco', cta: 'CTA' },
    steps: [
      {
        tag: 'P1',
        trigger: 'XP 0 - primer login',
        focus: 'Bienvenida + checklist esencial',
        cta: 'Checklist inicial',
        note: 'Define expectativas y presenta la House y el ecosistema.',
      },
      {
        tag: 'P2',
        trigger: 'Evento: glosario basico completado',
        focus: 'Secuencia perfil > glosario > curso Empieza Aqui',
        cta: 'Seguir camino recomendado',
        note: 'Recuerda las tareas pendientes antes de abrir contenido avanzado.',
      },
      {
        tag: 'P3',
        trigger: 'XP 130 + curso Empieza Aqui completado',
        focus: 'Autonomia tecnica con tutorial Metamask',
        cta: 'Abrir tutorial seguro',
        note: 'Bloquea funciones Web3 hasta que el usuario termina el tutorial.',
      },
      {
        tag: 'P4',
        trigger: 'XP 260 + lectura DAO1 briefing',
        focus: 'Ecosistema Apertum/DAO1 con aviso de riesgos',
        cta: 'Formulario DAO1',
        note: 'Solicitud llega al Head para aprobacion manual con registro.',
      },
      {
        tag: 'P5',
        trigger: 'XP 500 o curso House finalizado',
        focus: 'Integracion House Hub + contacto opcional',
        cta: 'Abrir House Hub',
        note: 'Desbloquea broadcasts, pedidos de ayuda y colaboracion.',
      },
    ],
    governanceTitle: 'Gobernanza y soporte',
    governanceSubtitle: 'Todo sigue el Termino oficial y auditoria continua.',
    governancePoints: [
      'Heads gestionan secuencias en el Panel Admin con historial completo.',
      'El Termino de responsabilidad debe firmarse antes de editar pop-ups.',
      'El motor sigue triggers de XP/contenido y registra cada entrega.',
      'Los logs guardan trigger, idioma, CTA y cumplimiento del bloqueo de 3 s.',
      'El mapa del usuario muestra pop-ups enviados, triggers futuros y solicitudes.',
    ],
    noteLabel: 'Nota oficial',
    blockingNote:
      'Cuando aparece un pop-up, el usuario espera 3 segundos antes de cerrar o salir. Despues todo sigue opcional.',
  },
  en: {
    eyebrow: 'PERSONALIZED ONBOARDING',
    title: 'Houses control the pace.',
    subtitle:
      'Heads design pop-ups, triggers, and copy inside the Admin Panel so the pop-up flow stays fair, auditable, and multilingual.',
    featuresTitle: 'Official infrastructure',
    featuresSubtitle: 'Flows keep the /education palette: deep gradients, subtle borders, cyan and gold highlights.',
    features: [
      {
        title: 'House Admin panel',
        description: 'Heads craft sequences, languages, and CTAs with versioning, logs, and review gates.',
      },
      {
        title: 'XP + content triggers',
        description: 'Pop-ups fire on milestones or when lessons, courses, and blog posts are completed.',
      },
      {
        title: 'Governance + 3 s lock',
        description: 'Messages honor the 1/day and 3/week cap with a 3 second lock and automated auditing.',
      },
    ],
    sequenceTitle: 'Official sequence (example)',
    sequenceSubtitle: 'Baseline for the pilot before each House tunes its own flow.',
    stepLabels: { trigger: 'Trigger', focus: 'Focus', cta: 'CTA' },
    steps: [
      {
        tag: 'P1',
        trigger: 'XP 0 - first login',
        focus: 'Welcome + essential checklist',
        cta: 'Start checklist',
        note: 'Sets the House expectation and introduces the Apertum ecosystem.',
      },
      {
        tag: 'P2',
        trigger: 'Event: basic glossary complete',
        focus: 'Profile > glossary > Start Here course sequence',
        cta: 'Follow recommended path',
        note: 'Surfaces pending actions before unlocking advanced content.',
      },
      {
        tag: 'P3',
        trigger: 'XP 130 + Start Here course finished',
        focus: 'Technical autonomy with Metamask tutorial',
        cta: 'Open safe tutorial',
        note: 'Locks advanced Web3 actions until the tutorial is completed.',
      },
      {
        tag: 'P4',
        trigger: 'XP 260 + DAO1 briefing read',
        focus: 'Apertum/DAO1 ecosystem with risk disclosure',
        cta: 'DAO1 access form',
        note: 'Submission routes to the Head for manual approval with logging.',
      },
      {
        tag: 'P5',
        trigger: 'XP 500 or House course complete',
        focus: 'House Hub integration + optional human contact',
        cta: 'Open House Hub',
        note: 'Unlocks broadcasts, help requests, and peer collaboration.',
      },
    ],
    governanceTitle: 'Governance and support',
    governanceSubtitle: 'Bound to the official Term and continuous auditing.',
    governancePoints: [
      'Heads manage sequences in the Admin Panel with full history.',
      'Responsibility Term must be signed before editing any pop-up.',
      'The engine follows XP/content triggers and logs every delivery.',
      'Logs keep trigger, language, CTA clicks, and the 3 second lock proof.',
      'User map displays sent pop-ups, upcoming triggers, and pending requests.',
    ],
    noteLabel: 'Official note',
    blockingNote:
      'Every pop-up stays fixed for 3 seconds before the user can close or navigate away. After that, the experience remains optional and pressure-free.',
  },
};

type DemoPopupEntry = {
  title: string;
  body: string;
  highlights: string[];
  primary: string;
  secondary: string;
  badge: string;
};

type DemoPopupCopy = {
  welcome: DemoPopupEntry;
  autonomy: DemoPopupEntry;
  logLabels: Record<QueueLogAction, string>;
};

const POPUP_DEMO_TEXT: Record<SupportedCopyLang, DemoPopupCopy> = {
  pt: {
    welcome: {
      title: 'Bem-vindo à House oficial',
      body: 'Heads usam este pop-up para te alinhar logo no XP 0. Aos 3 segundos já podes fechar ou seguir.',
      highlights: [
        'Checklist essencial garante que todos começam com o mesmo contexto.',
        'CTA secundário abre o House Guide e continua opcional.',
      ],
      primary: 'Começar pelos 3 passos',
      secondary: 'Ver House Guide',
      badge: 'XP 0 - Mensagem oficial',
    },
    autonomy: {
      title: 'Autonomia técnica sem pânico',
      body: 'Antes de mexeres em wallets reais, os Heads guiam-te por um tutorial Metamask seguro.',
      highlights: [
        'Inclui passo-a-passo auditável e validação manual.',
        'Sem tutorial, as funcionalidades Web3 ficam bloqueadas.',
      ],
      primary: 'Abrir tutorial seguro',
      secondary: 'Falar com a House',
      badge: 'XP 130 - Autonomia',
    },
    logLabels: {
      delivered: 'Mostrado',
      primary: 'CTA principal',
      secondary: 'CTA secundária',
      dismiss: 'Fechado',
    },
  },
  es: {
    welcome: {
      title: 'Bienvenido a la House oficial',
      body: 'Los Heads usan este pop-up para alinearte en XP 0. Tras 3 segundos puedes cerrar o seguir.',
      highlights: [
        'El checklist asegura que todos empiezan con el mismo contexto.',
        'El CTA secundario abre la guía de la House (siempre opcional).',
      ],
      primary: 'Empezar con los 3 pasos',
      secondary: 'Ver House Guide',
      badge: 'XP 0 - Mensaje oficial',
    },
    autonomy: {
      title: 'Autonomía técnica sin drama',
      body: 'Antes de tocar wallets reales, los Heads te guían por un tutorial seguro de Metamask.',
      highlights: [
        'Incluye paso a paso auditado y validación manual.',
        'Sin este tutorial, las funciones Web3 quedan bloqueadas.',
      ],
      primary: 'Abrir tutorial seguro',
      secondary: 'Hablar con la House',
      badge: 'XP 130 - Autonomía',
    },
    logLabels: {
      delivered: 'Mostrado',
      primary: 'CTA principal',
      secondary: 'CTA secundaria',
      dismiss: 'Cerrado',
    },
  },
  en: {
    welcome: {
      title: 'Welcome to the official House',
      body: 'Heads use this pop-up to align you right at XP 0. After 3 seconds you can close or continue.',
      highlights: [
        'The essential checklist keeps everyone on the same context.',
        'The secondary CTA opens the House Guide — always optional.',
      ],
      primary: 'Start the 3 steps',
      secondary: 'View House Guide',
      badge: 'XP 0 - Official message',
    },
    autonomy: {
      title: 'Technical autonomy without panic',
      body: 'Before touching real wallets, Heads guide you through a safe Metamask tutorial.',
      highlights: [
        'Includes an auditable step-by-step plus manual validation.',
        'Without it, advanced Web3 features stay locked.',
      ],
      primary: 'Open safe tutorial',
      secondary: 'Talk to the House',
      badge: 'XP 130 - Autonomy',
    },
    logLabels: {
      delivered: 'Displayed',
      primary: 'Primary CTA',
      secondary: 'Secondary CTA',
      dismiss: 'Dismissed',
    },
  },
};

type ProgressCardCopy = {
  title: string;
  subtitle: string;
  refresh: string;
  loading: string;
  empty: string;
  error: string;
  startLabel: string;
  startDone: string;
  startPending: string;
  coursesLabel: string;
  coursesHint: string;
  noCourses: string;
  startCta: string;
  coursesNextTitle: string;
  coursesNextSubtitle: string;
  coursesNextEmpty: string;
  coursesCtaLabel: string;
};

const PROGRESS_CARD_COPY: Record<SupportedCopyLang, ProgressCardCopy> = {
  pt: {
    title: 'Checkpoints de conteúdo',
    subtitle: 'A House só envia pop-ups de lições quando estes itens estão validados.',
    refresh: 'Atualizar progresso',
    loading: 'A validar o teu progresso...',
    empty: 'Ainda não tens progresso registado.',
    error: 'Não foi possível carregar o progresso.',
    startLabel: 'Curso "Começa Aqui"',
    startDone: 'Curso base concluído.',
    startPending: 'Completa o curso base para desbloquear os próximos passos.',
    coursesLabel: 'Cursos concluídos',
    coursesHint: 'Cada curso validado desbloqueia pop-ups por conteúdo.',
    noCourses: 'Ainda sem cursos concluídos.',
    startCta: 'Abrir curso',
    coursesNextTitle: 'Próximos conteúdos',
    coursesNextSubtitle: 'Prioridade oficial da House antes dos pop-ups avançados.',
    coursesNextEmpty: 'Sem conteúdos pendentes neste momento.',
    coursesCtaLabel: 'Abrir conteúdo',
  },
  es: {
    title: 'Checkpoints de contenido',
    subtitle: 'La House solo envía pop-ups de lecciones cuando estos items están validados.',
    refresh: 'Actualizar progreso',
    loading: 'Verificando tu progreso...',
    empty: 'Todavía no tienes progreso registrado.',
    error: 'No se pudo cargar el progreso.',
    startLabel: 'Curso "Empieza Aquí"',
    startDone: 'Curso base completado.',
    startPending: 'Completa el curso base para desbloquear los siguientes pasos.',
    coursesLabel: 'Cursos completados',
    coursesHint: 'Cada curso validado desbloquea pop-ups por contenido.',
    noCourses: 'Sin cursos completados todavía.',
    startCta: 'Abrir curso',
    coursesNextTitle: 'Próximos contenidos',
    coursesNextSubtitle: 'Prioridad oficial de la House antes de los pop-ups avanzados.',
    coursesNextEmpty: 'Sin contenidos pendientes por ahora.',
    coursesCtaLabel: 'Abrir contenido',
  },
  en: {
    title: 'Content checkpoints',
    subtitle: 'The House only sends lesson pop-ups when these items are validated.',
    refresh: 'Refresh progress',
    loading: 'Checking your progress...',
    empty: 'No progress recorded yet.',
    error: 'Could not load your progress.',
    startLabel: '"Start Here" course',
    startDone: 'Foundation course completed.',
    startPending: 'Finish the base course to unlock the next steps.',
    coursesLabel: 'Courses completed',
    coursesHint: 'Every validated course can unlock content pop-ups.',
    noCourses: 'No courses completed yet.',
    startCta: 'Open course',
    coursesNextTitle: 'Next content',
    coursesNextSubtitle: 'Official House priority before advanced pop-ups.',
    coursesNextEmpty: 'No pending content right now.',
    coursesCtaLabel: 'Open content',
  },
};

type SequenceCardCopy = {
  title: string;
  subtitle: string;
  ready: string;
  blocked: string;
  preview: string;
};

const SEQUENCE_CARD_COPY: Record<SupportedCopyLang, SequenceCardCopy> = {
  pt: {
    title: 'Sequência oficial da House',
    subtitle: 'Acompanha a ordem oficial e antecipa o copy antes do motor entregar.',
    ready: 'Pronto',
    blocked: 'Bloqueado',
    preview: 'Ver copy',
  },
  es: {
    title: 'Secuencia oficial de la House',
    subtitle: 'Sigue el orden oficial y revisa el copy antes de que el motor lo entregue.',
    ready: 'Listo',
    blocked: 'Bloqueado',
    preview: 'Ver copy',
  },
  en: {
    title: 'Official House sequence',
    subtitle: 'Track the official order and preview the copy before delivery.',
    ready: 'Ready',
    blocked: 'Blocked',
    preview: 'Preview copy',
  },
};

type DiagnosticsCopy = {
  title: string;
  subtitle: string;
  labels: {
    house: string;
    xp: string;
    missions: string;
    progress: string;
  };
  status: {
    ok: string;
    loading: string;
    error: string;
  };
  updated: (time: string) => string;
  refresh: string;
};

const DIAGNOSTICS_COPY: Record<SupportedCopyLang, DiagnosticsCopy> = {
  pt: {
    title: 'Diagnóstico rápido',
    subtitle: 'Heads confirmam se cada sistema sincronizou antes de contactar suporte.',
    labels: {
      house: 'Sequência da House',
      xp: 'API XP',
      missions: 'Combos/Missões',
      progress: 'Progresso do utilizador',
    },
    status: {
      ok: 'OK',
      loading: 'A carregar...',
      error: 'Erro',
    },
    updated: (time) => `Atualizado ${time}`,
    refresh: 'Recarregar sistemas',
  },
  es: {
    title: 'Diagnóstico rápido',
    subtitle: 'Los Heads confirman cada sistema antes de pedir soporte.',
    labels: {
      house: 'Secuencia de la House',
      xp: 'API XP y límites',
      missions: 'Combos/Misiones',
      progress: 'Progreso del usuario',
    },
    status: {
      ok: 'OK',
      loading: 'Cargando...',
      error: 'Error',
    },
    updated: (time) => `Actualizado ${time}`,
    refresh: 'Recargar sistemas',
  },
  en: {
    title: 'Quick diagnostics',
    subtitle: 'Heads verify each system before escalating to support.',
    labels: {
      house: 'House sequence',
      xp: 'XP API',
      missions: 'Combos/Missions',
      progress: 'User progress',
    },
    status: {
      ok: 'OK',
      loading: 'Loading...',
      error: 'Error',
    },
    updated: (time) => `Updated ${time}`,
    refresh: 'Refresh systems',
  },
};

type BlockedSummaryCopy = {
  title: string;
  subtitle: string;
  xpLabel: string;
  contentLabel: string;
  empty: string;
  filters: { all: string; xp: string; content: string };
  emptyFiltered: string;
  filterIndicator: (label: string) => string;
};

const BLOCKED_SUMMARY_COPY: Record<SupportedCopyLang, BlockedSummaryCopy> = {
  pt: {
    title: 'Trigger por resolver',
    subtitle: 'O motor só entrega pop-ups após desbloquear estes requisitos.',
    xpLabel: 'Gate XP',
    contentLabel: 'Conteúdo específico',
    empty: 'Nenhum requisito pendente.',
    filters: { all: 'Todos', xp: 'Só XP', content: 'Só conteúdo' },
    emptyFiltered: 'Sem pop-ups com esse filtro.',
    filterIndicator: (label) => `Filtro ativo: ${label}`,
  },
  es: {
    title: 'Triggers pendientes',
    subtitle: 'El motor entrega pop-ups cuando estos requisitos están listos.',
    xpLabel: 'Gate de XP',
    contentLabel: 'Contenido específico',
    empty: 'Sin requisitos pendientes.',
    filters: { all: 'Todos', xp: 'Solo XP', content: 'Solo contenido' },
    emptyFiltered: 'No hay pop-ups con ese filtro.',
    filterIndicator: (label) => `Filtro activo: ${label}`,
  },
  en: {
    title: 'Pending triggers',
    subtitle: 'The engine only delivers once these requirements are cleared.',
    xpLabel: 'XP gate',
    contentLabel: 'Specific content',
    empty: 'No requirements pending.',
    filters: { all: 'All', xp: 'XP only', content: 'Content only' },
    emptyFiltered: 'No pop-ups match this filter.',
    filterIndicator: (label) => `Active filter: ${label}`,
  },
};

const DEFAULT_ONBOARDING_ANALYTICS: HouseOnboardingSequence['analytics'] = {
  ctr: 0.65,
  completionRate: 0.8,
  manualApprovals: 0,
  blockedAttempts: 0,
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

const formatCourseProgress = (lang: SupportedCopyLang, completed: number, total: number) => {
  if (total <= 0) return '';
  const plural =
    lang === 'en'
      ? total === 1
        ? 'course'
        : 'courses'
      : total === 1
      ? 'curso'
  : 'cursos';
  return `${completed}/${total} ${plural}`;
};

const resolveI18nText = (value: unknown, lang: SupportedCopyLang) => {

  if (!value) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'object' && value !== null) {

    const bag = value as Record<string, unknown>;

    const candidate = bag[lang] ?? bag.en ?? bag.pt ?? bag.es;

    if (typeof candidate === 'string') return candidate;

  }

  return '';

};



const getLang = (language: string): SupportedCopyLang => {

  if (language === 'pt' || language === 'es' || language === 'en') return language;

  return 'en';

};



export default function EducationXpPage() {

  const { user, getToken } = useAuth();

  const { language: langRaw } = useLanguage();



  const language = getLang(langRaw as string);

  const copy = XP_COPY[language] ?? XP_COPY.en;


  const onboardingCopy = ONBOARDING_COPY[language] ?? ONBOARDING_COPY.en;

  const demoCopy = POPUP_DEMO_TEXT[language] ?? POPUP_DEMO_TEXT.en;
  const progressCopy = PROGRESS_CARD_COPY[language] ?? PROGRESS_CARD_COPY.en;
  const sequenceCopy = SEQUENCE_CARD_COPY[language] ?? SEQUENCE_CARD_COPY.en;
  const diagnosticsCopy = DIAGNOSTICS_COPY[language] ?? DIAGNOSTICS_COPY.en;
  const blockedSummaryCopy = BLOCKED_SUMMARY_COPY[language] ?? BLOCKED_SUMMARY_COPY.en;

  const typedUser = user as { house?: { name?: string }; house_name?: string; sport?: string } | null;
  const rawHouseName = typedUser?.house?.name ?? typedUser?.house_name ?? typedUser?.sport ?? '';
  const fallbackHouseKey = rawHouseName ? rawHouseName.toString().toUpperCase() : 'LEGACY';
  const userSportId = (user as any)?.sport_id ?? (user as any)?.primary_sport_id ?? null;
  const [houseLabel, setHouseLabel] = useState(rawHouseName || fallbackHouseKey);
  const [houseKey, setHouseKey] = useState(fallbackHouseKey);

  useEffect(() => {
    if (rawHouseName) {
      setHouseLabel(rawHouseName);
      setHouseKey(rawHouseName.toString().toUpperCase());
      return;
    }
    if (!userSportId) {
      setHouseLabel(fallbackHouseKey);
      setHouseKey(fallbackHouseKey);
    }
  }, [rawHouseName, userSportId, fallbackHouseKey]);

  useEffect(() => {
    if (!userSportId) return;
    let active = true;
    const loadSport = async () => {
      try {
        const response = await fetch(
          `/api/sports?id=${encodeURIComponent(userSportId)}&locale=${encodeURIComponent(language || 'en')}`,
          { cache: 'no-store' },
        );
        const data = await response.json();
        if (!active || !response.ok || !data?.success) return;
        const sport = data.sports?.[0];
        if (!sport) return;
        const label = sport.name || sport.code || fallbackHouseKey;
        const code = (sport.code || label || fallbackHouseKey).toString().toUpperCase();
        setHouseLabel(label);
        setHouseKey(code);
      } catch (error) {
        if (active) {
          console.error('[education/xp] Failed to resolve sport label', error);
        }
      }
    };
    void loadSport();
    return () => {
      active = false;
    };
  }, [userSportId, language, fallbackHouseKey]);

  const buildDemoQueue = useCallback(
    (houseName: string): OnboardingPopupData[] => {
      const applyHouse = (text: string) => text.replace('{{HOUSE}}', houseName);
      const welcomeStep = onboardingCopy.steps[0];
      const autonomyStep = onboardingCopy.steps[2];
      const extractXp = (value?: string) => {
        if (!value) return 0;
        const match = value.match(/(\d+)/);
        return match ? Number(match[0]) : 0;
      };
      const welcomeXp = extractXp(welcomeStep?.trigger);
      const autonomyXp = extractXp(autonomyStep?.trigger);
      return [
        {
          id: `popup-${language}-welcome`,
          house: houseName,
          xpGate: welcomeStep?.trigger ?? 'XP 0',
          trigger: { type: 'xp', value: welcomeXp, label: welcomeStep?.trigger ?? 'XP 0' },
          title: applyHouse(demoCopy.welcome.title),
          body: applyHouse(demoCopy.welcome.body),
          highlights: demoCopy.welcome.highlights.map(applyHouse),
          badgeLabel: demoCopy.welcome.badge,
          primaryCta: { label: demoCopy.welcome.primary, href: '/education/xp' },
          secondaryCta: { label: demoCopy.welcome.secondary, href: '/education/houses' },
        },
        {
          id: `popup-${language}-autonomy`,
          house: houseName,
          xpGate: autonomyStep?.trigger ?? 'XP 130',
          trigger: { type: 'xp', value: autonomyXp || 130, label: autonomyStep?.trigger ?? 'XP 130' },
          title: applyHouse(demoCopy.autonomy.title),
          body: applyHouse(demoCopy.autonomy.body),
          highlights: demoCopy.autonomy.highlights.map(applyHouse),
          badgeLabel: demoCopy.autonomy.badge,
          primaryCta: { label: demoCopy.autonomy.primary, href: '/education/courses' },
          secondaryCta: { label: demoCopy.autonomy.secondary, href: '/education/houses' },
        },
      ];
    },
    [demoCopy, language, onboardingCopy],
  );
  const demoQueue = useMemo(() => buildDemoQueue(houseLabel), [buildDemoQueue, houseLabel]);
  const refreshRemoteLogs = useCallback(() => setRemoteLogsReloadKey((key) => key + 1), []);

  const logRemoteAction = useCallback(
    async (popupId: string, action: QueueLogAction) => {
      if (!user) return;
      const token = getToken?.();
      if (!token) return;
      try {
        const response = await fetch('/api/onboarding/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            popupId,
            action,
            house: houseKey,
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | { success: true; entry?: OnboardingLogEntry | null }
          | { success: false }
          | null;
        if (data?.success && data.entry) {
          setRemoteLogs((prev) => {
            const next = [data.entry!, ...prev];
            return next.slice(0, 25);
          });
        }
      } catch (error) {
        console.error('[education/xp] Failed to log action', error);
      }
    },
    [getToken, houseKey, user],
  );




  const [xpData, setXpData] = useState<EducationXpData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [comboProgress, setComboProgress] = useState<ComboProgressState>(DEFAULT_COMBO_PROGRESS);

  const [comboMissionState, setComboMissionState] = useState<Record<ComboKey, ComboMissionMeta>>(

    createDefaultComboMeta(),

  );

  const [comboLoading, setComboLoading] = useState(true);

  const [comboError, setComboError] = useState<string | null>(null);

  const [progressSummary, setProgressSummary] = useState<ProgressSummaryLite | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressReloadKey, setProgressReloadKey] = useState(0);
  const [previewPopup, setPreviewPopup] = useState<OnboardingPopupData | null>(null);
  const [xpUpdatedAt, setXpUpdatedAt] = useState<number | null>(null);
  const [comboUpdatedAt, setComboUpdatedAt] = useState<number | null>(null);
  const [progressUpdatedAt, setProgressUpdatedAt] = useState<number | null>(null);
  const [houseUpdatedAt, setHouseUpdatedAt] = useState<number | null>(null);
  const [blockedFilter, setBlockedFilter] = useState<'all' | 'xp' | 'content'>('all');
  const [xpReloadKey, setXpReloadKey] = useState(0);
  const [comboReloadKey, setComboReloadKey] = useState(0);

  const {
    activePopup,
    resetQueue,
    recordAction,
    logs: popupLogs,
    pending: queuePendingCount,
    queueSnapshot,
  } = useOnboardingQueue();

  const [houseSequence, setHouseSequence] = useState<HouseOnboardingSequence | null>(null);
  const [houseLoading, setHouseLoading] = useState(false);
  const [houseError, setHouseError] = useState<string | null>(null);
  const [houseReloadKey, setHouseReloadKey] = useState(0);
  const [houseMetrics, setHouseMetrics] = useState<{
    xpBreakdown: { head: number; moderators: number; members: number };
    xpTotal: number;
    roleCounts: { head: number; moderators: number; members: number };
  } | null>(null);
  const [houseMetricsLoading, setHouseMetricsLoading] = useState(false);
  const [houseMetricsError, setHouseMetricsError] = useState<string | null>(null);
  const [remoteQueueLoaded, setRemoteQueueLoaded] = useState(() => !user);
  const [remoteQueueSignature, setRemoteQueueSignature] = useState<string | null>(null);
  const [remoteQueuePayload, setRemoteQueuePayload] = useState<OnboardingPopupData[] | null>(null);
  const [queueSeedSignature, setQueueSeedSignature] = useState<string | null>(null);
  const [remoteQueueUpdatedAt, setRemoteQueueUpdatedAt] = useState<number | null>(null);
  const [queueReloadKey, setQueueReloadKey] = useState(0);
  const [remoteLogs, setRemoteLogs] = useState<OnboardingLogEntry[]>([]);
  const [remoteLogsLoading, setRemoteLogsLoading] = useState(false);
  const [remoteLogsError, setRemoteLogsError] = useState<string | null>(null);
  const [remoteLogsReloadKey, setRemoteLogsReloadKey] = useState(0);
  const [liveAnalytics, setLiveAnalytics] = useState<HouseOnboardingSequence['analytics'] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsReloadKey, setAnalyticsReloadKey] = useState(0);
  const lastPersistedQueueHashRef = useRef<string | null>(null);
  const persistQueue = useCallback(
    async (payload: OnboardingPopupData[], signature: string | null) => {
      if (!user) return;
      const token = getToken?.();
      if (!token) return;
      try {
        await fetch('/api/onboarding/queue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            queue: payload,
            signature,
            house: houseKey,
          }),
        });
      } catch (error) {
        console.error('[education/xp] Failed to persist onboarding queue', error);
      }
    },
    [getToken, houseKey, user],
  );
  const queueSource = houseSequence?.popups?.length ? houseSequence.popups : demoQueue;
  const localizedQueueSource = useMemo(
    () => queueSource.map((popup) => resolvePopupCopyForLanguage(popup, language)),
    [queueSource, language],
  );
  const computeQueueHash = useCallback((payload: OnboardingPopupData[]) => {
    return payload.map((popup) => popup.id).join('|');
  }, []);
  const queueHash = useMemo(() => computeQueueHash(queueSnapshot), [computeQueueHash, queueSnapshot]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setHouseLoading(true);
        setHouseError(null);
        const response = await fetch(`/api/onboarding/house?house=${encodeURIComponent(houseKey)}`, {
          cache: 'no-store',
        });
        const data = (await response.json()) as OnboardingResponse;
        if (!active) return;
        if (!response.ok || !data.success) {
          const message = data.success ? 'Failed to load onboarding data.' : data.error || 'Failed to load onboarding data.';
          throw new Error(message);
        }
        setHouseSequence(data.sequence);
        setHouseUpdatedAt(Date.now());
      } catch (err) {
        if (!active) return;
        console.error('[education/xp] onboarding fetch failed', err);
        setHouseSequence(null);
        setHouseError(
          language === 'pt'
            ? 'Falha ao carregar dados reais. A mostrar sequência demo.'
            : language === 'es'
            ? 'Error al cargar datos reales. Mostrando demo.'
            : 'Failed to load live data. Showing demo sequence.',
        );
      } finally {
        if (active) setHouseLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [houseKey, buildDemoQueue, resetQueue, language, houseReloadKey]);

  useEffect(() => {
    if (!user) {
      setRemoteQueueLoaded(true);
      setRemoteQueuePayload(null);
      setRemoteQueueSignature(null);
      setQueueSeedSignature(null);
      setRemoteQueueUpdatedAt(null);
      setRemoteLogs([]);
      setRemoteLogsError(null);
      setRemoteLogsLoading(false);
      lastPersistedQueueHashRef.current = null;
      return;
    }
    let active = true;
    const token = getToken?.();
    if (!token) {
      setRemoteQueueLoaded(true);
      setRemoteQueueUpdatedAt(null);
      setRemoteLogs([]);
      setRemoteLogsError(null);
      setRemoteLogsLoading(false);
      return;
    }
    const runEngine = async () => {
      try {
        const response = await fetch(`/api/onboarding/engine?house=${encodeURIComponent(houseKey)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = (await response.json().catch(() => null)) as
          | { success: boolean; error?: string }
          | null;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to run onboarding engine');
        }
      } catch (error) {
        console.error('[education/xp] Failed to run onboarding engine', error);
      }
    };
    const loadQueue = async () => {
      try {
        setRemoteQueueLoaded(false);
        await runEngine();
        const response = await fetch(`/api/onboarding/queue?house=${encodeURIComponent(houseKey)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load queue');
        }
        setRemoteQueuePayload((data.queue as OnboardingPopupData[]) ?? []);
        setRemoteQueueSignature((data.signature as string | null) ?? null);
        setRemoteQueueUpdatedAt(Date.now());
      } catch (error) {
        if (!active) return;
        console.error('[education/xp] Failed to load onboarding queue', error);
        setRemoteQueuePayload(null);
        setRemoteQueueSignature(null);
        setRemoteQueueUpdatedAt(null);
      } finally {
        if (active) {
          setRemoteQueueLoaded(true);
        }
      }
    };
    const loadUserLogs = async () => {
      try {
        setRemoteLogsLoading(true);
        setRemoteLogsError(null);
        const response = await fetch(`/api/onboarding/logs/me?house=${encodeURIComponent(houseKey)}&limit=25`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load logs');
        }
        setRemoteLogs((data.logs as OnboardingLogEntry[]) ?? []);
      } catch (error) {
        if (!active) return;
        console.error('[education/xp] Failed to load onboarding logs', error);
        setRemoteLogsError(
          language === 'pt'
            ? 'Não foi possível carregar os últimos registos.'
            : language === 'es'
            ? 'No se pudieron cargar los registros.'
            : 'Failed to load recent records.',
        );
        setRemoteLogs([]);
      } finally {
        if (active) {
          setRemoteLogsLoading(false);
        }
      }
    };
    void loadQueue();
    void loadUserLogs();
    return () => {
      active = false;
    };
  }, [getToken, houseKey, user, houseReloadKey, queueReloadKey, remoteLogsReloadKey, language]);

  useEffect(() => {
    let active = true;
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        const response = await fetch(`/api/onboarding/analytics?house=${encodeURIComponent(houseKey)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load analytics');
        }
        setLiveAnalytics((data.analytics as HouseOnboardingSequence['analytics']) ?? null);
      } catch (error) {
        if (!active) return;
        console.error('[education/xp] Failed to load analytics', error);
        setLiveAnalytics(null);
        setAnalyticsError(
          language === 'pt'
            ? 'Não foi possível atualizar as métricas.'
            : language === 'es'
            ? 'No se pudieron actualizar las métricas.'
            : 'Failed to refresh analytics.',
        );
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
    return () => {
      active = false;
    };
  }, [houseKey, analyticsReloadKey, language]);

  useEffect(() => {
    let active = true;
    const targetHouseKey = (houseKey || fallbackHouseKey).toUpperCase();
    const fetchMetrics = async () => {
      try {
        setHouseMetricsLoading(true);
        setHouseMetricsError(null);
        const response = await fetch(
          `/api/houses/${encodeURIComponent(targetHouseKey)}?locale=${language}`,
          { cache: 'no-store' },
        );
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success || !data?.profile?.house?.metrics) {
          throw new Error(data?.error || 'Failed to load house metrics');
        }
        const metrics = data.profile.house.metrics;
        setHouseMetrics({
          xpBreakdown: metrics.xpBreakdown,
          xpTotal: metrics.xpTotal,
          roleCounts: metrics.roleCounts,
        });
      } catch (error) {
        if (!active) return;
        console.error('[education/xp] Failed to load house metrics', error);
        setHouseMetrics(null);
        setHouseMetricsError(
          language === 'pt'
            ? 'Falhou o carregamento do XP oficial da tua House.'
            : language === 'es'
            ? 'No se pudo cargar el XP oficial de tu House.'
            : 'Unable to load official House XP.',
        );
      } finally {
        if (active) setHouseMetricsLoading(false);
      }
    };
    void fetchMetrics();
    return () => {
      active = false;
    };
  }, [houseKey, fallbackHouseKey, language]);

  useEffect(() => {
    if (!activePopup) return;
    void logRemoteAction(activePopup.id, 'delivered');
  }, [activePopup, logRemoteAction]);

  const logLabels = demoCopy.logLabels;
  const historyLogs = useMemo(() => {
    const remoteNormalized = remoteLogs.map((log) => ({
      popupId: log.popupId,
      action: log.action as QueueLogAction,
      timestamp: log.timestamp,
    }));
    const localNormalized = popupLogs.map((log) => ({ ...log }));
    const merged = [...remoteNormalized, ...localNormalized];
    merged.sort((a, b) => b.timestamp - a.timestamp);
    const seen = new Set<string>();
    const deduped: QueueLog[] = [];
    for (const entry of merged) {
      const key = `${entry.popupId}-${entry.action}-${entry.timestamp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(entry);
      if (deduped.length >= 5) break;
    }
    return deduped;
  }, [popupLogs, remoteLogs]);
  const locale = language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US';
  const formatLogTime = useCallback(
    (timestamp: number) =>
      new Date(timestamp).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );
  const userXP = user?.xp_total ?? 0;



  const completedContentIds = useMemo(() => {

    const set = new Set<string>();

    if (!progressSummary) return set;

    if (progressSummary.startHere?.isCompleted) {

      const slugKey = progressSummary.startHere.slug?.toLowerCase();

      if (slugKey) set.add(`course:${slugKey}`);

    }

    Object.values(progressSummary.coursesByLevel ?? {}).forEach((courses) => {

      courses.forEach((course) => {

        if (!course.isCompleted) return;

        const slug = (course.slug || course.id || '').toString().toLowerCase();

        if (slug) set.add(`course:${slug}`);

      });

    });

    return set;

  }, [progressSummary]);



  const isTriggerSatisfied = useCallback(

    (popup: OnboardingPopupData) => {

      if (!popup.trigger) return true;

      if (popup.trigger.type === 'xp') {

        return userXP >= (popup.trigger.value ?? 0);

      }

      if (!progressSummary || completedContentIds.size === 0) return true;

      const targetId = (popup.trigger.contentId || '').toLowerCase();

      const key = `${popup.trigger.contentType}:${targetId}`;

      return completedContentIds.has(key);

    },

    [completedContentIds, progressSummary, userXP],

  );
  const formatDiagTime = useCallback(
    (timestamp: number | null) => {
      if (!timestamp) return diagnosticsCopy.updated('--');
      const value = new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      return diagnosticsCopy.updated(value);
    },
    [diagnosticsCopy, locale],
  );

  const progressStats = useMemo(() => {
    if (!progressSummary) {
      return { startCompleted: false, totalCourses: 0, completedCourses: 0 };
    }
    let totalCourses = 0;
    let completedCourses = 0;
    Object.values(progressSummary.coursesByLevel ?? {}).forEach((courses) => {
      courses.forEach((course) => {
        totalCourses += 1;
        if (course.isCompleted) completedCourses += 1;
      });
    });
    return {
      startCompleted: Boolean(progressSummary.startHere?.isCompleted),
      totalCourses,
      completedCourses,
    };
  }, [progressSummary]);

  const pendingCourses = useMemo(() => {

    if (!progressSummary) return [];

    const list: { id: string; slug?: string | null; title: string }[] = [];

    Object.values(progressSummary.coursesByLevel ?? {}).forEach((courses) => {

      courses.forEach((course) => {

        if (course.isCompleted) return;

        list.push({ id: course.id, slug: course.slug, title: course.title });

      });

    });

    return list.slice(0, 3);

  }, [progressSummary]);
  const analyticsSource = liveAnalytics ? 'live' : houseSequence?.analytics ? 'sequence' : 'fallback';
  const analytics = liveAnalytics ?? houseSequence?.analytics ?? DEFAULT_ONBOARDING_ANALYTICS;
  const fmtPercent = (value?: number) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : '--');
  const fmtNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '--');
  const analyticsLabels =
    language === 'pt'
      ? {
          ctr: 'CTR global',
          completion: 'Conclusão checklist',
          approvals: 'Pedidos DAO1',
          blocked: 'Bloqueios',
        }
      : language === 'es'
      ? {
          ctr: 'CTR global',
          completion: 'Finalización checklist',
          approvals: 'Solicitudes DAO1',
          blocked: 'Bloqueos',
        }
      : {
          ctr: 'Global CTR',
          completion: 'Checklist completion',
          approvals: 'DAO1 requests',
          blocked: 'Blocked attempts',
        };

  const analyticsDescriptions =
    language === 'pt'
      ? [
          'Cliques por pop-up',
          'Percentagem que conclui os 3 passos',
          'Pedidos manuais recebidos',
          'Tentativas bloqueadas pelo motor',
        ]
      : language === 'es'
      ? [
          'Clicks por pop-up',
          'Porcentaje que completa los 3 pasos',
          'Solicitudes manuales recibidas',
          'Intentos bloqueados por el motor',
        ]
      : [
          'Clicks per pop-up',
          'Share completing the 3 steps',
          'Manual requests received',
          'Attempts blocked by the engine',
        ];

  const analyticsCards = [
    { label: analyticsLabels.ctr, value: fmtPercent(analytics?.ctr), desc: analyticsDescriptions[0] },
    { label: analyticsLabels.completion, value: fmtPercent(analytics?.completionRate), desc: analyticsDescriptions[1] },
    { label: analyticsLabels.approvals, value: fmtNumber(analytics?.manualApprovals), desc: analyticsDescriptions[2] },
    { label: analyticsLabels.blocked, value: fmtNumber(analytics?.blockedAttempts), desc: analyticsDescriptions[3] },
  ];
  const analyticsBadgeClass =
    analyticsSource === 'live'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : analyticsSource === 'sequence'
      ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
      : 'border-amber-400/40 bg-amber-500/10 text-amber-100';
  const analyticsBadgeLabel =
    analyticsSource === 'live'
      ? language === 'pt'
        ? 'Dados ao vivo'
        : language === 'es'
        ? 'Datos en vivo'
        : 'Live data'
      : analyticsSource === 'sequence'
      ? language === 'pt'
        ? 'Guardado no Painel'
        : language === 'es'
        ? 'Guardado en el Panel'
        : 'Admin Panel data'
      : language === 'pt'
      ? 'Sequência demo'
      : language === 'es'
      ? 'Secuencia demo'
      : 'Demo sequence';
  const houseXpCopy = useMemo(() => {
    if (language === 'pt') {
      return {
        title: 'XP oficial da House',
        description: `XP do Head, moderadores e membros da House ${houseLabel}. Fonte: house_xp_totals.`,
        head: 'Head',
        moderators: 'Moderadores',
        members: 'Membros',
        total: 'XP total',
        empty: 'Sem dados oficiais ainda.',
      };
    }
    if (language === 'es') {
      return {
        title: 'XP oficial de la House',
        description: `Head, moderadores y miembros de la House ${houseLabel}. Fuente: house_xp_totals.`,
        head: 'Head',
        moderators: 'Moderadores',
        members: 'Miembros',
        total: 'XP total',
        empty: 'Todavía no hay datos oficiales.',
      };
    }
    return {
      title: 'Official House XP',
      description: `Head, moderators, and members inside ${houseLabel}. Source: house_xp_totals.`,
      head: 'Head',
      moderators: 'Moderators',
      members: 'Members',
      total: 'Total XP',
      empty: 'No official data yet.',
    };
  }, [language, houseLabel]);
  const readyPopups = useMemo(
    () => localizedQueueSource.filter((popup) => isTriggerSatisfied(popup)),
    [localizedQueueSource, isTriggerSatisfied],
  );
  useEffect(() => {
    if (!user) return;
    if (!queueSeedSignature) return;
    if (!queueSnapshot.length && readyPopups.length === 0) return;
    if (lastPersistedQueueHashRef.current === queueHash) return;
    lastPersistedQueueHashRef.current = queueHash;
    void persistQueue(queueSnapshot, queueSeedSignature);
  }, [queueHash, queueSeedSignature, queueSnapshot, persistQueue, readyPopups.length, user]);
  const blockedPopups = useMemo(
    () => localizedQueueSource.filter((popup) => !isTriggerSatisfied(popup)),
    [localizedQueueSource, isTriggerSatisfied],
  );
  const filteredBlockedPopups = useMemo(() => {
    if (blockedFilter === 'all') return blockedPopups;
    return blockedPopups.filter((popup) =>
      blockedFilter === 'xp'
        ? popup.trigger?.type === 'xp'
        : popup.trigger?.type === 'content',
    );
  }, [blockedFilter, blockedPopups]);
  const visibleBlockedPopups = filteredBlockedPopups.slice(0, 5);

  const readySignature = readyPopups.map((popup) => popup.id).join('|');

  const queueSyncRef = useRef<string>('');

  useEffect(() => {
    if (!remoteQueueLoaded && user) return;
    const remotePayload = Array.isArray(remoteQueuePayload) ? remoteQueuePayload : [];
    const remoteSignature = remoteQueueSignature ?? computeQueueHash(remotePayload);
    const shouldUseRemote = Boolean(user && remoteQueueLoaded && Array.isArray(remoteQueuePayload));
    const payload = shouldUseRemote ? remotePayload : readyPopups;
    const nextSignature = shouldUseRemote ? remoteSignature : readySignature;
    if (queueSyncRef.current === nextSignature && queueSeedSignature === nextSignature) return;
    queueSyncRef.current = nextSignature;
    const localizedPayload = shouldUseRemote
      ? (payload as OnboardingPopupData[]).map((popup) => resolvePopupCopyForLanguage(popup, language))
      : (payload as OnboardingPopupData[]);
    resetQueue(localizedPayload);
    setQueueSeedSignature(nextSignature);
  }, [
    computeQueueHash,
    readyPopups,
    readySignature,
    remoteQueueLoaded,
    remoteQueuePayload,
    remoteQueueSignature,
    resetQueue,
    user,
    queueSeedSignature,
    language,
  ]);



  const queueSourceLabel = houseSequence
    ? `${houseSequence.house} · ${houseSequence.sport}`
    : language === 'pt'
    ? 'Demo oficial Legacy'
    : language === 'es'
    ? 'Demo oficial Legacy'
    : 'Legacy demo sequence';

  const queueMode = houseSequence ? 'live' : 'demo';
  const queueModeCopy = useMemo(() => {
    if (language === 'pt') {
      return {
        live: {
          badge: 'Live',
          description: 'Motor oficial ligado à tua House.',
        },
        demo: {
          badge: 'Demo',
          description: 'Sequência fundacional (sem dados reais).',
        },
      };
    }
    if (language === 'es') {
      return {
        live: {
          badge: 'Live',
          description: 'Motor oficial conectado a tu House.',
        },
        demo: {
          badge: 'Demo',
          description: 'Secuencia fundacional (sin datos reales).',
        },
      };
    }
    return {
      live: {
        badge: 'Live',
        description: 'Official engine synced with your House.',
      },
      demo: {
        badge: 'Demo',
        description: 'Foundational sequence (no live data).',
      },
    };
  }, [language]);
  const queueStatusCopy = queueModeCopy[queueMode];
  const queueBadgeClass =
    queueMode === 'live'
      ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
      : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100';
  const queueLastUpdateLabel = useMemo(() => {
    if (!remoteQueueUpdatedAt) return null;
    const when = new Date(remoteQueueUpdatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (language === 'pt') return `Atualizado às ${when}`;
    if (language === 'es') return `Actualizado a las ${when}`;
    return `Updated at ${when}`;
  }, [language, locale, remoteQueueUpdatedAt]);
  const queueRefreshLabel =
    language === 'pt' ? 'Sincronizar fila' : language === 'es' ? 'Sincronizar fila' : 'Sync queue';
  const refreshQueue = useCallback(() => {
    if (!user) return;
    setQueueReloadKey((key) => key + 1);
  }, [user]);
  const queueRefreshing = Boolean(user) && !remoteQueueLoaded;
  const refreshAnalytics = useCallback(() => {
    setAnalyticsReloadKey((key) => key + 1);
  }, []);

  const queueResetLabel = houseSequence
    ? language === 'pt'
      ? 'Recarregar sequência da House'
      : language === 'es'
      ? 'Recargar secuencia de la House'
      : 'Reload House sequence'
    : language === 'pt'
    ? 'Repor sequência demo'
    : language === 'es'
    ? 'Reiniciar demo'
    : 'Reset demo sequence';

  const formatTriggerRequirement = useCallback(
    (popup: OnboardingPopupData) => {
      if (!popup.trigger) {
        return language === 'pt'
          ? 'Sem trigger configurado.'
          : language === 'es'
          ? 'Sin trigger configurado.'
          : 'No trigger configured.';
      }
      if (popup.trigger.type === 'xp') {
        const value = popup.trigger.value ?? 0;
        return language === 'pt'
          ? `Necessário atingir ${value} XP`
          : language === 'es'
          ? `Necesitas alcanzar ${value} XP`
          : `Need at least ${value} XP`;
      }
      const label =
        popup.trigger.label ??
        popup.trigger.contentTitle ??
        popup.trigger.contentId ??
        (language === 'pt'
          ? 'Conteúdo requerido'
          : language === 'es'
          ? 'Contenido requerido'
          : 'Required content');
      if (language === 'pt') return `Concluir ${label}`;
      if (language === 'es') return `Completar ${label}`;
      return `Complete ${label}`;
    },
    [language],
  );

  const blockedTitle =
    language === 'pt'
      ? 'Pop-ups bloqueados'
      : language === 'es'
      ? 'Pop-ups bloqueados'
      : 'Blocked pop-ups';
  const blockedSubtitle =
    language === 'pt'
      ? 'Precisas de concluir o requisito abaixo antes da House mandar o próximo passo.'
      : language === 'es'
      ? 'Necesitas completar el requisito abajo antes de recibir el siguiente paso.'
      : 'Complete the requirement below before the House delivers the next step.';
  const blockedCtaLabel =
    language === 'pt'
      ? 'Ir para o conteúdo'
      : language === 'es'
      ? 'Ir al contenido'
      : 'Go to content';

  const courseProgressLabel =
    progressStats.totalCourses > 0
      ? formatCourseProgress(language, progressStats.completedCourses, progressStats.totalCourses)
      : progressCopy.noCourses;
  const coursePercent =
    progressStats.totalCourses > 0 ? Math.round((progressStats.completedCourses / progressStats.totalCourses) * 100) : 0;

  const readyIdSet = useMemo(() => new Set(readyPopups.map((popup) => popup.id)), [readyPopups]);

  const sequencePreview = useMemo(
    () =>
      localizedQueueSource.map((popup) => ({
        popup,
        status: readyIdSet.has(popup.id) ? 'ready' : 'blocked',
      })),
    [localizedQueueSource, readyIdSet],
  );

  const diagnostics = useMemo(
    () =>
      [
        {
          key: 'house',
          label: diagnosticsCopy.labels.house,
          loading: houseLoading,
          error: houseError,
          updatedAt: houseUpdatedAt,
        },
        {
          key: 'xp',
          label: diagnosticsCopy.labels.xp,
          loading,
          error,
          updatedAt: xpUpdatedAt,
        },
        {
          key: 'missions',
          label: diagnosticsCopy.labels.missions,
          loading: comboLoading,
          error: comboError,
          updatedAt: comboUpdatedAt,
        },
        {
          key: 'progress',
          label: diagnosticsCopy.labels.progress,
          loading: progressLoading,
          error: progressError,
          updatedAt: progressUpdatedAt,
        },
      ] as const,
    [
      diagnosticsCopy.labels.house,
      diagnosticsCopy.labels.xp,
      diagnosticsCopy.labels.missions,
      diagnosticsCopy.labels.progress,
      houseLoading,
      houseError,
      houseUpdatedAt,
      loading,
      error,
      xpUpdatedAt,
      comboLoading,
      comboError,
      comboUpdatedAt,
      progressLoading,
      progressError,
      progressUpdatedAt,
    ],
  );

  const blockedSummary = useMemo(() => {
    const initial = {
      xp: 0,
      content: {
        lesson: 0,
        course: 0,
        blog: 0,
      },
    };
    filteredBlockedPopups.forEach((popup) => {
      if (!popup.trigger) return;
      if (popup.trigger.type === 'xp') {
        initial.xp += 1;
      } else if (popup.trigger.type === 'content') {
        const type = popup.trigger.contentType;
        initial.content[type] = (initial.content[type] || 0) + 1;
      }
    });
    return initial;
  }, [filteredBlockedPopups]);

  const contentTypeLabels =
    language === 'pt'
      ? { lesson: 'Lições/Módulos', course: 'Cursos', blog: 'Artigos do blog' }
      : language === 'es'
      ? { lesson: 'Lecciones/Módulos', course: 'Cursos', blog: 'Artículos del blog' }
      : { lesson: 'Lessons/Modules', course: 'Courses', blog: 'Blog posts' };

  const handlePopupAction = useCallback(
    ({ id, action }: { id: string; action: 'primary' | 'secondary' | 'dismiss' }) => {
      recordAction(action);
      void logRemoteAction(id, action);
    },
    [recordAction, logRemoteAction],
  );

  const refreshProgress = useCallback(() => {
    setProgressError(null);
    setProgressReloadKey((key) => key + 1);
  }, []);
  const refreshAllSystems = useCallback(() => {
    setHouseReloadKey((key) => key + 1);
    setXpReloadKey((key) => key + 1);
    setComboReloadKey((key) => key + 1);
    refreshProgress();
    refreshQueue();
    refreshAnalytics();
  }, [refreshProgress, refreshQueue, refreshAnalytics]);

  const resolveBlockedHref = useCallback((popup: OnboardingPopupData) => {
    if (popup.trigger?.type !== 'content') return null;
    const slug = (popup.trigger.contentId || '').replace(/^\/+/, '');
    if (!slug) return null;
    if (popup.trigger.contentType === 'blog') {
      return `/blog/${slug}`;
    }
    if (popup.trigger.contentType === 'course') {
      return `/education/courses/${slug}`;
    }
    return `/education/lessons/${slug}`;
  }, []);



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

        if (token) headers.Authorization = 'Bearer ' + token;



        const response = await fetch('/api/education/xp', {

          cache: 'no-store',

          headers,

        });



        const data = (await response.json()) as ApiResponse;

        if (!active) return;



        if (data.success) {

          setXpData({

            rewards: data.rewards ?? [],

            thresholds: data.thresholds ?? [],

          });

          setError(null);

          setXpUpdatedAt(Date.now());

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

  }, [user, getToken, copy.errorsFallback, xpReloadKey]);



  useEffect(() => {

    if (!user) {

      setComboProgress(DEFAULT_COMBO_PROGRESS);

      setComboMissionState(createDefaultComboMeta());

      setComboLoading(false);

      setComboError(null);

      return;

    }



    let active = true;



    const fetchCombos = async () => {

      try {

        setComboLoading(true);

        setComboError(null);

        const token = getToken?.();

        const headers: HeadersInit = {};

        if (token) headers.Authorization = 'Bearer ' + token;



        const response = await fetch(`/api/missions/generate?userId=${user.id}`, {

          cache: 'no-store',

          headers,

        });



        const data = await response.json();

        if (!active) return;



        if (data.success) {

          const mergedProgress: ComboProgressState = {

            ...DEFAULT_COMBO_PROGRESS,

            ...(data.combo_progress ?? {}),

          };



          const missionMeta = createDefaultComboMeta();

          (data.missions || []).forEach((mission: any) => {

            if (!mission?.type) return;

            const comboKey = COMBO_KEY_BY_MISSION[mission.type as string];

            if (!comboKey) return;

            const missionData = Array.isArray(mission.user_missions)

              ? mission.user_missions[0]

              : mission.user_missions;

            missionMeta[comboKey] = {

              xp: typeof mission?.xp_reward === 'number' ? mission.xp_reward : DEFAULT_COMBO_META[comboKey].xp,

              completed: Boolean(missionData?.completed),

            };

          });



          setComboProgress(mergedProgress);

          setComboMissionState(missionMeta);

          setComboUpdatedAt(Date.now());

        } else {

          setComboError(data.error || copy.errorsFallback);

        }

      } catch (err) {

        if (!active) return;

        setComboError(copy.errorsFallback);

      } finally {

        if (active) setComboLoading(false);

      }

    };



    void fetchCombos();



    return () => {

      active = false;

    };

  }, [user, getToken, copy.errorsFallback, comboReloadKey]);







  useEffect(() => {
    if (!user) {
      setProgressSummary(null);
      setProgressLoading(false);
      setProgressError(null);
      return;
    }

    let active = true;

    const fetchProgress = async () => {
      try {
        setProgressLoading(true);
        setProgressError(null);
        const token = getToken?.();
        const headers: HeadersInit = {};
        if (token) headers.Authorization = 'Bearer ' + token;

        const response = await fetch('/api/education/progress', {
          cache: 'no-store',
          headers,
        });

        const data = (await response.json()) as
          | {
              success: true;
              summary: {
                startHere?: { slug?: string; isCompleted?: boolean };
                startCourse?: { slug?: string | null; title?: unknown };
                coursesByLevel?: Record<string, ProgressCourseSummaryLite[]>;
              };
            }
          | { success: false; error?: string };

        if (!active) return;
        if (!response.ok || !data.success) {
          const message = !data.success ? data.error || 'Failed to load progress' : 'Failed to load progress';
          throw new Error(message);
        }
        const startSlug = data.summary.startHere?.slug || data.summary.startCourse?.slug || 'start-here';
        const startCourseSlug = data.summary.startCourse?.slug || startSlug;
        const startCourseTitle = resolveI18nText(data.summary.startCourse?.title, language);

        setProgressSummary({
          startHere: { slug: startSlug, isCompleted: Boolean(data.summary.startHere?.isCompleted) },
          startCourse: startCourseSlug ? { slug: startCourseSlug, title: startCourseTitle || undefined } : null,
          coursesByLevel: data.summary.coursesByLevel ?? {},
        });
        setProgressError(null);
        setProgressUpdatedAt(Date.now());
      } catch (err) {
        if (!active) return;
        console.error('[education/xp] progress fetch failed', err);
        setProgressSummary(null);
        setProgressError(progressCopy.error);
      } finally {
        if (active) setProgressLoading(false);
      }
    };

    void fetchProgress();

    return () => {
      active = false;
    };
  }, [user, getToken, language, progressReloadKey, progressCopy.error]);



  /** ---------- Dados derivados ---------- */

  const rewardMap = useMemo(() => {

    const map = new Map<string, XpReward>();

    (xpData?.rewards ?? []).forEach((r) => map.set(r.action_type, r));

    return map;

  }, [xpData?.rewards]);



  const visibleRewards = useMemo(() => {

    // Mantém referência útil sem ruído: esconde o que já explicamos em "Consistência"

    const hiddenActions = new Set(['streak_7', 'streak_30']);

    return (xpData?.rewards ?? []).filter(

      (r) => !hiddenActions.has(r.action_type),

    );

  }, [xpData?.rewards]);



  const groupedRewards = useMemo(() => {

    const r = visibleRewards;



    const group = {

      learn: [] as XpReward[],

      profile: [] as XpReward[],


      consistency: [] as XpReward[],

      other: [] as XpReward[],

    };



    r.forEach((item) => {

      const a = item.action_type;

      if (a === 'lesson_complete' || a === 'blog_read' || a === 'glossary_term_read') group.learn.push(item);

      else if (a === 'profile_complete') group.profile.push(item);


      else if (a.startsWith('mission_') || a.startsWith('streak_')) group.consistency.push(item);

      else group.other.push(item);

    });



    return group;

  }, [visibleRewards]);



  const thresholds = xpData?.thresholds ?? [];



  const xpFallbackByKey: Record<ComboKey, string> = {

    quick: copy.planQuickXP || '+13 XP',

    base: copy.planBaseXP || '+21 XP',

    serious: copy.planSeriousXP || '+47 XP',

  };



  const planCardBase: Record<ComboKey, { title: string; desc: string; href: string; icon: typeof Eye; featured?: boolean }> = {

    quick: { title: copy.planQuick, desc: copy.planQuickDesc, href: '/blog', icon: Eye },

    base: { title: copy.planBase, desc: copy.planBaseDesc, href: '/education', icon: Target, featured: true },

    serious: { title: copy.planSerious, desc: copy.planSeriousDesc, href: '/education/courses', icon: CheckCircle2 },

  };



  const comboCounts: Record<RequirementKey, number> = {

    glossary: comboProgress.glossary_count,

    blog: comboProgress.blog_count,

    lesson: comboProgress.lesson_count,

  };



  const planCards = COMBO_KEYS.map((comboKey) => {

    const base = planCardBase[comboKey];

    const missionMeta = comboMissionState[comboKey];

    const xpHint = missionMeta?.xp ? `+${missionMeta.xp} XP` : xpFallbackByKey[comboKey];



    return {

      key: comboKey,

      title: base.title,

      desc: base.desc,

      xpHint,

      icon: base.icon,

      href: base.href,

      cta: copy.planCTA,

      featured: base.featured,

      requirements: COMBO_REQUIREMENTS[comboKey],

      completed: missionMeta?.completed ?? false,

    };

  });



  const summaryItems = REQUIREMENT_ORDER.map((reqKey) => ({

    key: reqKey,

    label: REQUIREMENT_LABELS[reqKey][language],

    value: comboCounts[reqKey],

  }));



  const comboLoadingText =

    language === 'pt'

      ? 'A atualizar o progresso diário...'

      : language === 'es'

      ? 'Actualizando el progreso diario...'

      : 'Updating daily progress...';



  const comboAccumulationText =

    language === 'pt'

      ? 'Consumos acumulam durante o dia e reiniciam às 00h CET.'

      : language === 'es'

      ? 'Se acumula todo lo que consumes y reinicia a las 00h CET.'

      : 'All progress stacks during the day and resets at 00:00 CET.';



  const comboCompletedNote =

    language === 'pt'

      ? 'XP extra já creditado hoje.'

      : language === 'es'

      ? 'XP extra ya acreditado hoy.'

      : 'Bonus XP already granted today.';



  const completedLabel = COMPLETED_LABELS[language];



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

                    ? 'XP existe para progresso real — não para "ver como funciona".'

                    : language === 'es'

                    ? 'XP existe para progreso real — no para "curiosear".'

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

                              ? 'Os streaks existem para premiar disciplina.'

                              : language === 'es'

                              ? 'Los streaks premian la disciplina.'

                              : 'Streaks reward discipline.'}

                          </p>

                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#000c12]/50 px-3 py-2">

                          <Lock className="h-4 w-4 text-[#fdd87c]" />

                          <span className={cn(UI.body, 'text-white')}>

                            {language === 'pt' ? 'Privado' : language === 'es' ? 'Privado' : 'Private'}

                          </span>

                        </div>

                      </div>



                      <div className="mt-4 grid gap-3 sm:grid-cols-2">

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



                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">

                  {summaryItems.map((item) => (

                    <div

                      key={item.key}

                      className="rounded-full border border-white/10 bg-[#000c12]/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200"

                    >

                      {item.label}: <span className="text-white text-base normal-case">{item.value}</span>

                    </div>

                  ))}

                </div>



                {comboError ? (

                  <p className="mt-3 text-sm text-rose-400">{comboError}</p>

                ) : (

                  <p className="mt-3 text-sm text-slate-300">

                    {comboLoading ? comboLoadingText : comboAccumulationText}

                  </p>

                )}



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

                        <CardContent className="p-5 space-y-4">

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <p className={cn(UI.goldStatLabel, p.featured ? 'text-[#fdd87c]' : '')}>{p.title}</p>

                              <p className={cn(UI.body, 'mt-2')}>{p.desc}</p>

                            </div>



                            <div

                              className={cn(

                                'flex items-center gap-2 rounded-2xl border px-3 py-2',

                                p.completed

                                  ? 'border-emerald-500/60 bg-emerald-500/15'

                                  : 'border-white/10 bg-[#000c12]/40',

                              )}

                            >

                              <Icon className={cn('h-4 w-4', p.completed ? 'text-emerald-300' : 'text-cyan-300')} />

                              <span

                                className={cn(

                                  'text-sm font-semibold',

                                  p.completed ? 'text-emerald-100' : 'text-white',

                                )}

                              >

                                {p.xpHint}

                              </span>

                            </div>

                          </div>



                          {comboLoading ? (

                            <p className="text-sm text-slate-400">{comboLoadingText}</p>

                          ) : (

                            <div className="space-y-2">

                              {REQUIREMENT_ORDER.map((reqKey) => {

                                const required = p.requirements[reqKey];

                                if (!required) return null;

                                const value = comboCounts[reqKey];

                                const met = value >= required;

                                return (

                                  <div

                                    key={`${p.key}-${reqKey}`}

                                    className={cn(

                                      'flex items-center justify-between rounded-xl border px-3 py-2',

                                      met ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-[#000c12]/40',

                                    )}

                                  >

                                    <div className="flex items-center gap-2">

                                      {met ? (

                                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />

                                      ) : (

                                        <div className="h-4 w-4 rounded-full border border-white/30" />

                                      )}

                                      <span className={cn('text-sm', met ? 'text-emerald-100' : 'text-slate-200')}>

                                        {REQUIREMENT_LABELS[reqKey][language]}

                                      </span>

                                    </div>

                                    <span className="text-sm text-white">

                                      {Math.min(value, required)}/{required}

                                    </span>

                                  </div>

                                );

                              })}

                              {p.key === 'quick' ? <div className="h-9" aria-hidden="true" /> : null}

                            </div>

                          )}



                          <div className="flex items-center justify-between gap-3">

                            <span className={cn(UI.micro, p.completed ? 'text-emerald-300' : 'text-slate-400')}>

                              {p.completed ? comboCompletedNote : comboAccumulationText}

                            </span>



                            <Link href={p.href}>

                              <Button size="sm" className={cn(UI.ctaPrimary)} disabled={p.completed}>

                                {p.completed ? completedLabel : p.cta}

                                {!p.completed && <ArrowRight className="ml-2 h-4 w-4" />}

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



                  {/* Perfil */}

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

                            : 'Leaderboard is not ego. It\'s visible consistency. It shows who shows up, finishes, and returns.'}

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

                            ? 'Compete contra o "tu de ontem".'

                            : language === 'es'

                            ? 'Compite contra tu "yo de ayer".'

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



                  <div className="mt-3 grid gap-3 sm:grid-cols-2">

                    <div className={cn(UI.cardSurface, 'p-4')}>

                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                        <Flame className="h-4 w-4 text-cyan-300" />

                        7 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}

                      </div>

                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>222 XP</p>

                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[0]}</p>

                    </div>



                    <div className={cn(UI.cardSurface, 'p-4')}>

                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                        <CalendarCheck className="h-4 w-4 text-cyan-300" />

                        30 {language === 'pt' ? 'dias' : language === 'es' ? 'días' : 'days'}

                      </div>

                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>1.111 XP</p>

                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[1]}</p>

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

                            : 'If you miss a day, don\'t dramatise. Restart tomorrow. Streaks train discipline, not punishment.'}

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

            {/* ONBOARDING PERSONALIZADO */}
            <section className={cn(UI.panel, 'px-6 py-8')}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-12 h-60 w-60 rounded-full bg-[#062030]/50 blur-3xl" />
                <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-[#031d2a]/60 blur-3xl" />
              </div>

              <div className="relative space-y-6">
                <div>
                  <p className={UI.eyebrow}>{onboardingCopy.eyebrow}</p>
                  <h2 className={UI.sectionTitle}>{onboardingCopy.title}</h2>
                  <p className={UI.sectionSubtitle}>{onboardingCopy.subtitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-[#000c12]/40 px-3 py-1">
                      {language === 'pt'
                        ? `Sequência ativa: ${queueSourceLabel}`
                        : language === 'es'
                        ? `Secuencia activa: ${queueSourceLabel}`
                        : `Active sequence: ${queueSourceLabel}`}
                    </span>
                    {houseLoading ? (
                      <span className="text-cyan-200">
                        {language === 'pt'
                          ? 'A sincronizar com o Painel Admin...'
                          : language === 'es'
                          ? 'Sincronizando con el Panel Admin...'
                          : 'Syncing with Admin Panel...'}
                      </span>
                    ) : null}
                  </div>
                  {houseError ? (
                    <p className="mt-2 text-sm text-amber-200">{houseError}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className={UI.cardTitle}>{onboardingCopy.featuresTitle}</h3>
                    <p className={cn(UI.bodyMuted, 'max-w-2xl')}>{onboardingCopy.featuresSubtitle}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {onboardingCopy.features.map((feature, index) => {
                      const Icon = ONBOARDING_FEATURE_ICONS[index] ?? Sparkles;
                      return (
                        <Card key={feature.title} className={cn(UI.cardSurface, 'h-full')}>
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-full border border-white/10 bg-[#000c12]/40 p-2">
                                <Icon className="h-4 w-4 text-cyan-300" />
                              </div>
                              <p className={UI.cardTitle}>{feature.title}</p>
                            </div>
                            <p className={UI.body}>{feature.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className={UI.cardTitle}>{onboardingCopy.sequenceTitle}</h3>
                    <p className={cn(UI.bodyMuted, 'max-w-2xl')}>{onboardingCopy.sequenceSubtitle}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {onboardingCopy.steps.map((step) => (
                      <Card key={step.tag} className={cn(UI.cardSurface, 'h-full border-white/15')}>
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className="border-cyan-400/40 bg-[#000c12]/40 text-cyan-200">
                              {step.tag}
                            </Badge>
                            <span className={cn(UI.micro, 'text-slate-200')}>
                              {onboardingCopy.stepLabels.trigger}: {step.trigger}
                            </span>
                          </div>
                          <div>
                            <p className={cn(UI.micro, 'text-slate-400')}>{onboardingCopy.stepLabels.focus}</p>
                            <p className={cn(UI.cardTitle, 'text-[#fdd87c]')}>{step.focus}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
                            <Badge className="border-white/15 bg-[#000c12]/40">{onboardingCopy.stepLabels.cta}</Badge>
                            <span>{step.cta}</span>
                          </div>
                          <p className={cn(UI.bodyMuted)}>{step.note}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card className={cn(UI.cardSurface, 'h-full')}>
                      <CardContent className="p-5 space-y-3">
                        <h3 className={UI.cardTitle}>{onboardingCopy.governanceTitle}</h3>
                        <p className={UI.body}>{onboardingCopy.governanceSubtitle}</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-200">
                          {onboardingCopy.governancePoints.map((point) => (
                            <li key={point} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card className={cn(UI.cardSurface, 'h-full border-amber-300/40')}>
                      <CardContent className="p-5 space-y-2">
                        <p className={UI.goldStatLabel}>{onboardingCopy.noteLabel}</p>
                        <p className={cn(UI.body, 'text-slate-100')}>{onboardingCopy.blockingNote}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className={cn(UI.cardSurface, 'h-full')}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={UI.cardTitle}>
                            {language === 'pt'
                              ? houseSequence
                                ? 'Fila de pop-ups (House)'
                                : 'Fila de pop-ups (demo)'
                              : language === 'es'
                              ? houseSequence
                                ? 'Fila de pop-ups (House)'
                                : 'Fila de pop-ups (demo)'
                              : houseSequence
                              ? 'Pop-up queue (House)'
                              : 'Pop-up queue (demo)'}
                          </p>
                          <p className={cn(UI.micro, 'text-slate-300')}>{queueStatusCopy.description}</p>
                          <p className={cn(UI.micro, 'text-slate-500')}>{queueSourceLabel}</p>
                          {queueLastUpdateLabel ? (
                            <p className={cn(UI.micro, 'text-slate-500')}>{queueLastUpdateLabel}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className={cn('bg-[#000c12]/40 text-xs', queueBadgeClass)}>
                            {queueStatusCopy.badge}
                          </Badge>
                          {user ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={refreshQueue}
                              disabled={queueRefreshing}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              {queueRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {queueRefreshLabel}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4 text-center">
                          <p className={UI.micro}>{language === 'pt' ? 'Pendentes' : language === 'es' ? 'Pendientes' : 'Pending'}</p>
                          <p className="text-2xl font-semibold text-white">{queuePendingCount}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetQueue(readyPopups)}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        {queueResetLabel}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className={cn(UI.cardSurface, 'h-full')}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className={UI.cardTitle}>
                            {language === 'pt'
                              ? 'Logs recentes'
                              : language === 'es'
                              ? 'Logs recientes'
                              : 'Recent logs'}
                          </p>
                          <p className={cn(UI.micro, 'text-slate-400')}>
                            {language === 'pt'
                              ? 'Sincronizado com os registos oficiais da House.'
                              : language === 'es'
                              ? 'Sincronizado con los registros oficiales de la House.'
                              : 'Synced with official House records.'}
                          </p>
                        </div>
                        {user ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={refreshRemoteLogs}
                            disabled={remoteLogsLoading}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            {remoteLogsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {language === 'pt' ? 'Atualizar logs' : language === 'es' ? 'Actualizar logs' : 'Refresh logs'}
                          </Button>
                        ) : null}
                      </div>
                      {remoteLogsError ? (
                        <p className="text-xs text-amber-300">{remoteLogsError}</p>
                      ) : null}
                      {historyLogs.length ? (
                        <ul className="space-y-2">
                          {historyLogs.map((log) => (
                            <li
                              key={`${log.popupId}-${log.timestamp}-${log.action}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#000c12]/40 px-3 py-2"
                            >
                              <span className="font-mono text-xs text-slate-400">{formatLogTime(log.timestamp)}</span>
                              <span className="text-sm text-slate-100">{logLabels[log.action]}</span>
                            </li>
                          ))}
                        </ul>
                      ) : remoteLogsLoading ? (
                        <p className={cn(UI.bodyMuted, 'text-sm')}>
                          {language === 'pt'
                            ? 'A carregar logs...'
                            : language === 'es'
                            ? 'Cargando logs...'
                            : 'Loading logs...'}
                        </p>
                      ) : (
                        <p className={cn(UI.bodyMuted, 'text-sm')}>
                          {language === 'pt'
                            ? 'Ainda sem interações.'
                            : language === 'es'
                            ? 'Sin interacciones todavía.'
                            : 'No interactions yet.'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className={cn(UI.cardSurface, 'border-white/15')}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col gap-1">
                      <p className={UI.cardTitle}>{sequenceCopy.title}</p>
                      <p className={cn(UI.bodyMuted, 'text-sm')}>{sequenceCopy.subtitle}</p>
                    </div>
                    <div className="space-y-3">
                      {sequencePreview.map(({ popup, status }) => (
                        <div
                          key={popup.id}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{popup.title}</p>
                            <p className={cn(UI.micro, 'text-slate-400')}>
                              {popup.trigger?.label || popup.xpGate || 'XP 0'}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              'border-white/10 px-3',
                              status === 'ready'
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                                : 'border-amber-300/40 bg-amber-400/10 text-amber-100',
                            )}
                          >
                            {status === 'ready' ? sequenceCopy.ready : sequenceCopy.blocked}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={() => setPreviewPopup(popup)}
                          >
                            {sequenceCopy.preview}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(UI.cardSurface, 'border-white/15')}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className={UI.cardTitle}>{diagnosticsCopy.title}</p>
                        <p className={cn(UI.bodyMuted, 'text-sm')}>{diagnosticsCopy.subtitle}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={refreshAllSystems}
                        disabled={houseLoading || loading || comboLoading || progressLoading}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {houseLoading || loading || comboLoading || progressLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {diagnosticsCopy.refresh}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {diagnostics.map((item) => {
                        const statusLabel = item.loading
                          ? diagnosticsCopy.status.loading
                          : item.error
                          ? diagnosticsCopy.status.error
                          : diagnosticsCopy.status.ok;
                        const statusClass = item.loading
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                          : item.error
                          ? 'border-amber-300/40 bg-amber-400/10 text-amber-100'
                          : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
                        return (
                          <div
                            key={item.key}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{item.label}</p>
                              <p className={cn(UI.micro, 'text-slate-400')}>
                                {item.error ? item.error : formatDiagTime(item.updatedAt)}
                              </p>
                            </div>
                            <Badge className={cn('px-3', statusClass)}>{statusLabel}</Badge>
                          </div>
                        );
                      })}
                    </div>
                    {blockedFilter !== 'all' ? (
                      <p className={cn(UI.micro, 'text-slate-400')}>
                        {blockedSummaryCopy.filterIndicator(blockedSummaryCopy.filters[blockedFilter])}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {blockedPopups.length ? (
                  <>
                    <Card className={cn(UI.cardSurface, 'border-white/15')}>
                      <CardContent className="p-5 space-y-3">
                        <div className="space-y-3">
                          <p className={UI.cardTitle}>{blockedTitle}</p>
                          <p className={cn(UI.bodyMuted, 'text-sm')}>{blockedSubtitle}</p>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(blockedSummaryCopy.filters) as Array<'all' | 'xp' | 'content'>).map((key) => (
                              <Button
                                key={key}
                                size="sm"
                                variant="outline"
                                onClick={() => setBlockedFilter(key)}
                                className={cn(
                                  'border-white/20 text-white hover:bg-white/10',
                                  blockedFilter === key && 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100',
                                )}
                              >
                                {blockedSummaryCopy.filters[key]}
                              </Button>
                            ))}
                          </div>
                          {blockedFilter !== 'all' ? (
                            <p className={cn(UI.micro, 'text-slate-400')}>
                              {blockedSummaryCopy.filterIndicator(blockedSummaryCopy.filters[blockedFilter])}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          {visibleBlockedPopups.length ? (
                            visibleBlockedPopups.map((popup) => {
                              const targetHref = resolveBlockedHref(popup);
                              return (
                                <div
                                  key={popup.id}
                                  className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-white">{popup.title}</p>
                                      {popup.xpGate ? <p className={cn(UI.micro, 'text-slate-400')}>{popup.xpGate}</p> : null}
                                    </div>
                                    <Badge className="border-amber-300/40 bg-amber-400/10 text-amber-100">
                                      {language === 'pt' ? 'Pendente' : language === 'es' ? 'Pendiente' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <p className={cn(UI.bodyMuted, 'text-sm')}>{formatTriggerRequirement(popup)}</p>
                                  {targetHref ? (
                                    <Link href={targetHref} className="inline-flex">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/20 text-white hover:bg-white/10"
                                      >
                                        {blockedCtaLabel}
                                      </Button>
                                    </Link>
                                  ) : null}
                                </div>
                              );
                            })
                          ) : (
                            <p className={cn(UI.bodyMuted, 'text-sm')}>{blockedSummaryCopy.emptyFiltered}</p>
                          )}
                          {filteredBlockedPopups.length > visibleBlockedPopups.length ? (
                            <p className={cn(UI.bodyMuted, 'text-xs text-slate-400')}>
                              {language === 'pt'
                                ? `+${filteredBlockedPopups.length - visibleBlockedPopups.length} pop-ups adicionais pendentes.`
                                : language === 'es'
                                ? `+${filteredBlockedPopups.length - visibleBlockedPopups.length} pop-ups adicionales pendientes.`
                                : `+${filteredBlockedPopups.length - visibleBlockedPopups.length} additional pop-ups pending.`}
                            </p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className={cn(UI.cardSurface, 'border-white/15')}>
                      <CardContent className="p-5 space-y-3">
                        <div>
                          <p className={UI.cardTitle}>{blockedSummaryCopy.title}</p>
                          <p className={cn(UI.bodyMuted, 'text-sm')}>{blockedSummaryCopy.subtitle}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                            <p className={cn(UI.micro, 'text-slate-300')}>{blockedSummaryCopy.xpLabel}</p>
                            <p className="text-3xl font-semibold text-white">{blockedSummary.xp}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4 space-y-2">
                            <p className={cn(UI.micro, 'text-slate-300')}>{blockedSummaryCopy.contentLabel}</p>
                            {Object.entries(blockedSummary.content).some(([, value]) => value > 0) ? (
                              Object.entries(blockedSummary.content)
                                .filter(([, value]) => value > 0)
                                .map(([type, value]) => (
                                <div key={type} className="flex items-center justify-between text-sm text-slate-100">
                                  <span>{contentTypeLabels[type as keyof typeof contentTypeLabels]}</span>
                                  <span className="font-semibold">{value}</span>
                                </div>
                              ))
                            ) : (
                              <p className={cn(UI.bodyMuted, 'text-sm')}>{blockedSummaryCopy.empty}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}

{user ? (
  <Card className={cn(UI.cardSurface, 'border-white/15')}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className={UI.cardTitle}>{progressCopy.title}</p>
                          <p className={cn(UI.bodyMuted, 'text-sm')}>{progressCopy.subtitle}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshProgress}
                          disabled={progressLoading}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          {progressLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {progressCopy.refresh}
                        </Button>
                      </div>
                      {progressError ? (
                        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                          {progressError}
                        </div>
                      ) : progressLoading && !progressSummary ? (
                        <p className={cn(UI.bodyMuted, 'text-sm')}>{progressCopy.loading}</p>
                      ) : progressSummary ? (
                        <>
                          <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                            <div
                              className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-full',
                                progressStats.startCompleted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200',
                              )}
                            >
                              {progressStats.startCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Lock className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{progressCopy.startLabel}</p>
                              <p className={cn(UI.bodyMuted, 'text-xs')}>
                                {progressStats.startCompleted ? progressCopy.startDone : progressCopy.startPending}
                              </p>
                            </div>
                            {!progressStats.startCompleted && progressSummary?.startCourse?.slug ? (
                              <Link
                                href={`/education/courses/${progressSummary.startCourse.slug}`}
                                className="ml-auto"
                              >
                                <Button size="sm" className="bg-[#fdd87c] text-[#1e1500] hover:bg-[#ffe7a6]/90">
                                  {progressCopy.startCta}
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-200">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{progressCopy.coursesLabel}</p>
                              <p className={cn(UI.bodyMuted, 'text-xs')}>{progressCopy.coursesHint}</p>
                            </div>
                            <div className="text-right">
                              {progressStats.totalCourses > 0 ? (
                                <>
                                  <p className="text-lg font-semibold text-white">{courseProgressLabel}</p>
                                  <p className={cn(UI.micro, 'text-slate-400')}>{coursePercent}%</p>
                                </>
                              ) : (
                                <p className={cn(UI.bodyMuted, 'text-sm text-slate-400')}>{progressCopy.noCourses}</p>
                              )}
                            </div>
                          </div>
                          </div>
                          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#000c12]/30 p-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-white">{progressCopy.coursesNextTitle}</p>
                            <p className={cn(UI.bodyMuted, 'text-xs')}>{progressCopy.coursesNextSubtitle}</p>
                          </div>
                          {pendingCourses.length ? (
                            <div className="space-y-2">
                              {pendingCourses.map((course) => {
                                const href = `/education/courses/${(course.slug || course.id).toLowerCase()}`;
                                const title = course.title || course.slug || course.id;
                                return (
                                  <div
                                    key={course.id}
                                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-white">{title}</p>
                                      <p className={cn(UI.micro, 'text-slate-400')}>
                                        {language === 'pt'
                                          ? 'Conteúdo oficial da House'
                                          : language === 'es'
                                          ? 'Contenido oficial de la House'
                                          : 'Official House content'}
                                      </p>
                                    </div>
                                    <Link href={href}>
                                      <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                        {progressCopy.coursesCtaLabel}
                                      </Button>
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className={cn(UI.bodyMuted, 'text-sm text-slate-400')}>{progressCopy.coursesNextEmpty}</p>
                          )}
                          </div>
                        </>
                      ) : (
                        <p className={cn(UI.bodyMuted, 'text-sm')}>{progressCopy.empty}</p>
                      )}
                  </CardContent>
                </Card>
              ) : null}

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className={cn(UI.micro, 'text-slate-400')}>
                  {language === 'pt'
                    ? 'Fonte das metricas de pop-ups'
                    : language === 'es'
                    ? 'Fuente de las metricas de pop-ups'
                    : 'Pop-up metrics source'}
                </p>
                <Badge className={cn('border px-3', analyticsBadgeClass)}>{analyticsBadgeLabel}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {analyticsCards.map((card) => (
                  <Card key={card.label} className={cn(UI.cardSurface, 'h-full')}>
                      <CardContent className="p-4 space-y-2">
                        <p className={UI.micro}>{card.label}</p>
                        <p className="text-3xl font-semibold text-white">{card.value}</p>
                        <p className={cn(UI.bodyMuted, 'text-xs')}>{card.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {analyticsLoading ? (
                  <p className={cn(UI.bodyMuted, 'text-xs text-slate-400')}>
                    {language === 'pt'
                      ? 'A atualizar métricas reais...'
                      : language === 'es'
                      ? 'Actualizando métricas reales...'
                      : 'Refreshing live metrics...'}
                  </p>
                ) : analyticsError ? (
                  <p className="text-xs text-amber-300">{analyticsError}</p>
                ) : analyticsSource === 'fallback' ? (
                  <p className={cn(UI.bodyMuted, 'text-xs text-slate-400')}>
                    {language === 'pt'
                      ? 'Sem dados reais ainda — a mostrar valores demo.'
                      : language === 'es'
                      ? 'Sin datos reales todavía — mostrando demo.'
                      : 'No live data yet — showing demo values.'}
                  </p>
                ) : analyticsSource === 'sequence' ? (
                  <p className={cn(UI.bodyMuted, 'text-xs text-slate-400')}>
                    {language === 'pt'
                      ? 'A mostrar métricas guardadas no Painel Admin.'
                      : language === 'es'
                      ? 'Mostrando métricas guardadas en el Panel Admin.'
                      : 'Showing metrics stored in the Admin Panel.'}
                  </p>
                ) : null}
              <Card className={cn(UI.cardSurface, 'mt-4')}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className={UI.cardTitle}>{houseXpCopy.title}</h3>
                    <p className={cn(UI.bodyMuted, 'text-sm text-slate-300')}>{houseXpCopy.description}</p>
                  </div>
                  {houseMetricsLoading ? (
                    <p className="text-sm text-slate-300">
                      {language === 'pt'
                        ? 'A carregar XP oficial...'
                        : language === 'es'
                        ? 'Cargando XP oficial...'
                        : 'Loading official House XP...'}
                    </p>
                  ) : houseMetrics ? (
                    <>
                      <div className="space-y-3">
                        {[
                          { label: houseXpCopy.head, value: houseMetrics.xpBreakdown.head },
                          { label: houseXpCopy.moderators, value: houseMetrics.xpBreakdown.moderators },
                          { label: houseXpCopy.members, value: houseMetrics.xpBreakdown.members },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-white">{row.label}</p>
                            <span className="text-lg font-semibold text-[#5af3ff]">
                              {row.value.toLocaleString()} XP
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-[#5af3ff]/30 bg-[#00121c]/60 px-4 py-3 text-white">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{houseXpCopy.total}</p>
                        <p className="text-3xl font-semibold text-[#5af3ff]">
                          {houseMetrics.xpTotal.toLocaleString()} XP
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">{houseMetricsError ?? houseXpCopy.empty}</p>
                  )}
                </CardContent>
              </Card>
              </div>
            </section>

          </div>

        </div>

      </main>



      <Footer />

      {activePopup ? (
        <OnboardingPopup data={activePopup} open lockSeconds={3} onAction={handlePopupAction} />
      ) : null}
      {previewPopup ? (
        <OnboardingPopup data={previewPopup} open lockSeconds={0} onClose={() => setPreviewPopup(null)} />
      ) : null}

    </div>

  );

}
