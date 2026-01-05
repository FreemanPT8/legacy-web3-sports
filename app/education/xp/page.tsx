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

    title: 'XP nÃ£o Ã© um jogo. Ã um filtro.',

    subtitle:

      'Serve para separar curiosidade de compromisso. Para te obrigar a ganhar base. Para provar consistÃªncia antes de desbloquear camadas mais exigentes.',

    manifestoTitle: 'Porque existe XP',

    manifestoPoints: [

      'Filtra quem âanda a verâ de quem executa.',

      'Reduz atalhos fracos: aprender fora de ordem cria confianÃ§a falsa.',

      'Sinaliza quem merece desbloqueios e acompanhamento mais prÃ³ximo.',

    ],

    badge: 'Legacy XP â Sistema oficial',



    stickyLabel: 'Atalhos',

    ctaLeaderboard: 'Leaderboard',

    ctaGlossary: 'GlossÃ¡rio',

    ctaBlog: 'Blog',

    ctaCourses: 'Cursos',



    todayKicker: 'PLANO',

    todayTitle: 'O teu plano de hoje',

    todayDesc:

      'Escolhe uma rota. Faz. Fecha. Volta amanhÃ£. Isto Ã© como se ganha vantagem â sem teatro e sem pressa.',



    rewardsKicker: 'REGRAS',

    rewardsTitle: 'Como se ganha XP (regras oficiais)',

    rewardsDesc:

      'Isto Ã© referÃªncia, nÃ£o Ã© ruÃ­do: intervalos oficiais, auditÃ¡veis, e desenhados para premiar esforÃ§o real.',



    consistencyKicker: 'CONSISTÃNCIA',

    consistencyTitle: 'Streaks existem para premiar disciplina real',

    consistencyIntro:

      'Streaks nÇo contam presenÇõa. Contam XP ganho. Precisas de iniciar sessÇo e ganhar XP pelo menos uma vez por dia. Um dia sem XP e a contagem reinicia.',

    consistencyPoints: [

      'Limite diÃ¡rio global: 369 XP.',

      'Streak de 7 dias: 222 XP (XP ganho em 7 dias seguidos).',

      'Streak de 30 dias: 1.111 XP (XP ganho em 30 dias seguidos).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'LiÃ§Ãµes e leituras contam uma vez por utilizador. Criadores nÃ£o ganham XP ao consumir o prÃ³prio conteÃºdo. O bÃ³nus de criador existe quando outros completam â nÃ£o quando o autor âfaz farmingâ.',



    thresholdsKicker: 'DESBLOQUEIOS',

    thresholdsTitle: 'Milestones: XP total desbloqueia acesso extra',

    thresholdsDesc:

      'O teu XP total determina o que podes desbloquear. NÃ£o Ã© status. Ã contexto e responsabilidade.',

    levelNote: 'NÃ­vel = XP total / 100 (arredondado para baixo).',

    unlockNote:

      'Ao atingir marcos, desbloqueias casas, fÃ³runs privados, missÃµes e desafios. O objectivo Ã© elevar o padrÃ£o, nÃ£o coleccionar âpontosâ.',



    glossaryNote:

      'GlossÃ¡rio Legacy: cada leitura validada (progress reading) dÃ¡ 2 XP por termo e sÃ³ conta uma vez por utilizador (inclui o autor). NÃ£o existe bÃ³nus extra para criadores neste caso.',

    errorsFallback: 'Falha ao carregar dados de XP.',

    loadingRewards: 'A carregar regras...',

    loadingThresholds: 'A carregar desbloqueios...',

    noThresholds:

      'Ainda nÃ£o hÃ¡ milestones publicados. (Admin: adiciona-os no painel /admin/xp.)',



    gateTitle: 'Inicia sessÃ£o para ver o teu XP',

    gateDesc:

      'Esta pÃ¡gina Ã© privada porque XP existe para guardar progresso real, desbloqueios e consistÃªncia â nÃ£o para âespreitarâ.',

    gateLogin: 'Iniciar sessÃ£o',

    gateSignup: 'Criar conta',



    planQuick: 'Rota RÃ¡pida',

    planBase: 'Rota Base',

    planSerious: 'Rota SÃ©ria',

    planCTA: 'Executar',



    planQuickDesc: '3 termos no glossÃ¡rio + 1 leitura de blog.',

    planBaseDesc: '1 liÃ§Ã£o + 1 blog post + 5 termos no glossÃ¡rio.',

    planSeriousDesc: '2 liÃ§Ãµes + 2 blog posts + 10 termos no glossÃ¡rio.',

    planQuickXP: '15 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '33 XP extra',



    rangeLabel: 'Intervalo',

    creatorBonusLabel: 'BÃ³nus de criador',

    officialRulesLabel: 'Regras oficiais',

  },

  es: {

    eyebrow: 'SISTEMA XP',

    title: 'XP no es un juego. Es un filtro.',

    subtitle:

      'Sirve para separar curiosidad de compromiso. Para obligarte a construir base. Para probar consistencia antes de desbloquear capas mÃ¡s exigentes.',

    manifestoTitle: 'Por quÃ© existe XP',

    manifestoPoints: [

      'Filtra a quien âmiraâ de quien ejecuta.',

      'Reduce atajos dÃ©biles: aprender fuera de orden crea falsa confianza.',

      'SeÃ±ala quiÃ©n merece desbloqueos y acompaÃ±amiento mÃ¡s cercano.',

    ],

    badge: 'Legacy XP â Sistema oficial',



    stickyLabel: 'Atajos',

    ctaLeaderboard: 'Leaderboard',

    ctaGlossary: 'Glosario',

    ctaBlog: 'Blog',

    ctaCourses: 'Cursos',



    todayKicker: 'PLAN',

    todayTitle: 'Tu plan de hoy',

    todayDesc:

      'Elige una ruta. Hazla. CiÃ©rrala. Vuelve maÃ±ana. AsÃ­ se gana ventaja â sin teatro y sin prisa.',



    rewardsKicker: 'REGLAS',

    rewardsTitle: 'CÃ³mo se gana XP (reglas oficiales)',

    rewardsDesc:

      'Esto es referencia, no ruido: intervalos oficiales, auditables, diseÃ±ados para premiar esfuerzo real.',



    consistencyKicker: 'CONSISTENCIA',

    consistencyTitle: 'Los streaks premian disciplina real',

    consistencyIntro:

      'Los streaks no cuentan presencia. Cuentan XP ganado. Debes iniciar sesiÇün y ganar XP al menos una vez al dÇða. Un dÇða sin XP y la racha se reinicia.',

    consistencyPoints: [

      'LÃ­mite diario global: 369 XP.',

      'Racha de 7 dÃ­as: 222 XP (XP ganado 7 dÃ­as seguidos).',

      'Racha de 30 dÃ­as: 1.111 XP (XP ganado 30 dÃ­as seguidos).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'Lecciones y lecturas cuentan una vez por usuario. Los creadores no ganan XP al consumir su propio contenido. El bonus de creador existe cuando otros completan â no con âfarmingâ.',



    thresholdsKicker: 'DESBLOQUEOS',

    thresholdsTitle: 'Hitos: XP total desbloquea acceso extra',

    thresholdsDesc:

      'Tu XP total define lo que puedes desbloquear. No es status. Es contexto y responsabilidad.',

    levelNote: 'Nivel = XP total / 100 (redondeado hacia abajo).',

    unlockNote:

      'Al alcanzar hitos, desbloqueas casas, foros privados, misiones y desafÃ­os. El objetivo es elevar el estÃ¡ndar, no coleccionar âpuntosâ.',



    glossaryNote:

      'Glosario Legacy: cada lectura validada da 2 XP por tÃ©rmino y cuenta una sola vez por usuario (incluye al autor). No hay bonus extra para creadores en este caso.',

    errorsFallback: 'Error al cargar datos de XP.',

    loadingRewards: 'Cargando reglas...',

    loadingThresholds: 'Cargando desbloqueos...',

    noThresholds:

      'AÃºn no hay hitos publicados. (Admin: aÃ±Ã¡delos en /admin/xp.)',



    gateTitle: 'Inicia sesiÃ³n para ver tu XP',

    gateDesc:

      'Esta pÃ¡gina es privada porque XP existe para guardar progreso real, desbloqueos y consistencia â no para âcuriosearâ.',

    gateLogin: 'Iniciar sesiÃ³n',

    gateSignup: 'Crear cuenta',



    planQuick: 'Ruta RÃ¡pida',

    planBase: 'Ruta Base',

    planSerious: 'Ruta Seria',

    planCTA: 'Ejecutar',



    planQuickDesc: '3 tÃ©rminos en el glosario + 1 lectura de blog.',

    planBaseDesc: '1 lecciÃ³n + 1 blog post + 5 tÃ©rminos en el glosario.',

    planSeriousDesc: '2 lecciones + 2 blog posts + 10 tÃ©rminos en el glosario.',

    planQuickXP: '15 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '33 XP extra',



    rangeLabel: 'Rango',

    creatorBonusLabel: 'Bonus de creador',

    officialRulesLabel: 'Reglas oficiales',

  },

  en: {

    eyebrow: 'XP SYSTEM',

    title: 'XP is not a game. Itâs a filter.',

    subtitle:

      'It separates curiosity from commitment. It forces a foundation. It proves consistency before unlocking higher layers.',

    manifestoTitle: 'Why XP exists',

    manifestoPoints: [

      'Filters âjust browsingâ from execution.',

      'Prevents weak shortcuts: learning out of order creates fake confidence.',

      'Signals who deserves unlocks and closer guidance.',

    ],

    badge: 'Legacy XP â Official system',



    stickyLabel: 'Shortcuts',

    ctaLeaderboard: 'Leaderboard',

    ctaGlossary: 'Glossary',

    ctaBlog: 'Blog',

    ctaCourses: 'Courses',



    todayKicker: 'PLAN',

    todayTitle: 'Your plan for today',

    todayDesc:

      'Pick a route. Do it. Close it. Come back tomorrow. Thatâs how you build advantage â without noise.',



    rewardsKicker: 'RULES',

    rewardsTitle: 'How XP is earned (official rules)',

    rewardsDesc:

      'Reference, not noise: official, auditable ranges designed to reward real effort.',



    consistencyKicker: 'CONSISTENCY',

    consistencyTitle: 'Streaks reward real discipline',

    consistencyIntro:

      'Streaks don\'t count presence. They count XP earned. You must sign in and earn XP at least once every day. One day without XP resets the streak.',

    consistencyPoints: [

      'Global daily cap: 369 XP.',

      '7-day streak: 222 XP (XP earned 7 days in a row).',

      '30-day streak: 1,111 XP (XP earned 30 days in a row).',

    ],

    monitoringTitle: 'Fair Play',

    monitoringBody:

      'Lessons and reads count once per user. Creators donât earn XP by consuming their own content. Creator bonus happens when others complete it â not via farming.',



    thresholdsKicker: 'UNLOCKS',

    thresholdsTitle: 'Milestones: total XP unlocks extra access',

    thresholdsDesc:

      'Your total XP defines what you can unlock. Not status. Context and responsibility.',

    levelNote: 'Level = total XP / 100 (rounded down).',

    unlockNote:

      'Hit milestones to unlock houses, private comments, missions, and challenges. The goal is standards, not points.',



    glossaryNote:

      'Legacy Glossary: each validated progress reading grants 2 XP per term and counts once per user (including the author). No creator bonus applies here.',

    errorsFallback: 'Failed to load XP data.',

    loadingRewards: 'Loading rules...',

    loadingThresholds: 'Loading unlocks...',

    noThresholds: 'No milestones published yet. (Admin: add them in /admin/xp.)',



    gateTitle: 'Sign in to view your XP',

    gateDesc:

      'This page is private because XP exists to track real progress, unlocks, and consistency â not browsing.',

    gateLogin: 'Log in',

    gateSignup: 'Create account',



    planQuick: 'Quick Route',

    planBase: 'Base Route',

    planSerious: 'Serious Route',

    planCTA: 'Execute',



    planQuickDesc: '3 glossary terms + 1 blog read.',

    planBaseDesc: '1 lesson + 1 blog post + 5 glossary terms.',

    planSeriousDesc: '2 lessons + 2 blog posts + 10 glossary terms.',

    planQuickXP: '15 XP extra',

    planBaseXP: '21 XP extra',

    planSeriousXP: '33 XP extra',



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

  quick: { glossary: 3, blog: 1, lesson: 0 },

  base: { glossary: 5, blog: 1, lesson: 1 },

  serious: { glossary: 10, blog: 2, lesson: 2 },

};



const MISSION_TYPE_BY_KEY: Record<ComboKey, string> = {

  quick: 'combo_quick',

  base: 'combo_base',

  serious: 'combo_serious',

};



const DEFAULT_COMBO_META: Record<ComboKey, ComboMissionMeta> = {

  quick: { xp: 15, completed: false },

  base: { xp: 21, completed: false },

  serious: { xp: 33, completed: false },

};



const COMBO_KEYS: ComboKey[] = ['quick', 'base', 'serious'];



const COMBO_KEY_BY_MISSION: Record<string, ComboKey> = COMBO_KEYS.reduce((acc, key) => {

  acc[MISSION_TYPE_BY_KEY[key]] = key;

  return acc;

}, {} as Record<string, ComboKey>);



const REQUIREMENT_ORDER = ['glossary', 'blog', 'lesson'] as const;



type RequirementKey = (typeof REQUIREMENT_ORDER)[number];



const REQUIREMENT_LABELS: Record<RequirementKey, Record<SupportedCopyLang, string>> = {

  glossary: { pt: 'Termos no glossÃ¡rio', es: 'TÃ©rminos en el glosario', en: 'Glossary terms' },

  blog: { pt: 'Leituras no blog', es: 'Lecturas en el blog', en: 'Blog reads' },

  lesson: { pt: 'LiÃ§Ãµes', es: 'Lecciones', en: 'Lessons' },

};



const COMPLETED_LABELS: Record<SupportedCopyLang, string> = {

  pt: 'ConcluÃ­da',

  es: 'Completada',

  en: 'Completed',

};



const createDefaultComboMeta = (): Record<ComboKey, ComboMissionMeta> => {

  return COMBO_KEYS.reduce((acc, key) => {

    acc[key] = { ...DEFAULT_COMBO_META[key] };

    return acc;

  }, {} as Record<ComboKey, ComboMissionMeta>);

};



/** ---------- UI tokens (coerÃªncia com o teu sistema visual dark premium) ---------- */

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
        description: 'Mensagens respeitam limites 1/dia e 3/semana com bloqueio anti-fechar e auditoria automatica.',
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
      'Motor aplica os limites globais (1 pop-up por dia e 3 por semana).',
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
      'Los Heads definen pop-ups, triggers y copy dentro del Panel Admin. El onboarding sigue justo, auditado y en tres idiomas.',
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
        description: 'Mensajes respetan limites 1/dia y 3/semana con bloqueo anti-cierre y auditoria automatica.',
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
      'El motor aplica los limites globales (1 pop-up por dia y 3 por semana).',
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
      'Heads design pop-ups, triggers, and copy inside the Admin Panel so onboarding stays fair, auditable, and multilingual.',
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
      'The engine enforces the global limits (1 per day, 3 per week).',
      'Logs keep trigger, language, CTA clicks, and the 3 second lock proof.',
      'User map displays sent pop-ups, upcoming triggers, and pending requests.',
    ],
    noteLabel: 'Official note',
    blockingNote:
      'Every pop-up stays fixed for 3 seconds before the user can close or navigate away. After that, the experience remains optional and pressure-free.',
  },
};



const rewardMetadata: Record<

  string,

  {

    title: Record<SupportedCopyLang, string>;

    creatorBonus?: Record<SupportedCopyLang, string>;

  }

> = {

  lesson_complete: {

    title: { pt: 'LiÃ§Ã£o concluÃ­da', es: 'LecciÃ³n completada', en: 'Lesson completed' },

    creatorBonus: {

      pt: '+19% quando outros completam a tua liÃ§Ã£o (criador).',

      es: '+19% cuando otros completan tu lecciÃ³n (creador).',

      en: '+19% when others complete your lesson (creator).',

    },

  },

  blog_read: {

    title: { pt: 'Artigo lido', es: 'ArtÃ­culo leÃ­do', en: 'Article read' },

    creatorBonus: {

      pt: '+19% quando outros leem o teu artigo (criador).',

      es: '+19% cuando otros leen tu artÃ­culo (creador).',

      en: '+19% when others read your article (creator).',

    },

  },

  profile_complete: {

    title: { pt: 'Perfil completo', es: 'Perfil completado', en: 'Profile completed' },

  },

  glossary_term_read: {

    title: { pt: 'GlossÃ¡rio â termo lido', es: 'Glosario â tÃ©rmino leÃ­do', en: 'Glossary â term read' },

  },

  mission_daily: { title: { pt: 'MissÃ£o diÃ¡ria', es: 'MisiÃ³n diaria', en: 'Daily mission' } },

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

type CommentRulesCopy = {
  title: string;
  intro: string;
  points: string[];
  badge: string;
};

const COMMENT_RULES_COPY: Record<SupportedCopyLang, CommentRulesCopy> = {
  pt: {
    title: 'Sistema de comentarios privados',
    intro: 'Desbloqueias aos 369 XP e partilhas contexto dentro de licoes, blog posts e Houses com login feito.',
    points: [
      '0 XP base: comentarios servem para contexto, nao para farming.',
      'Limites diarios: 8 comentarios por dia para membros (33 para Super Admin, Admin, Heads e Moderadores).',
      'Limites de emoji: +1 (5/dia), fogo (1/dia) e -1 (1/dia). Nenhum gera XP direto.',
      'Casas sao privadas: apenas administracao, moderadores e membros dessa House leem.',
    ],
    badge: 'O comentario publico com mais reaction points (positivo + 2*fogo) na semana recebe 88 XP + o badge "Comentario da Semana".',
  },
  es: {
    title: 'Sistema de comentarios privados',
    intro: 'Se desbloquea a los 369 XP para que solo miembros comprometidos comenten en lecciones, posts y Houses.',
    points: [
      '0 XP base: comentar sirve para aportar contexto, no para farmear.',
      'Limites diarios: 8 comentarios por miembro (33 para Super Admin, Admin, Heads y Moderadores).',
      'Limites de emoji: +1 (5/dia), fuego (1/dia) y -1 (1/dia). Ninguno da XP directo.',
      'Los comentarios en Houses privadas solo son visibles para administradores, moderadores y miembros de esa House.',
    ],
    badge: 'El comentario publico con mas reaction points (positivo + 2*fuego) en la semana gana 88 XP + el badge "Comentario de la Semana".',
  },
  en: {
    title: 'Private comments system',
    intro: 'Unlocks at 369 XP so committed members interact inside lessons, blog posts, and Houses.',
    points: [
      '0 XP base: comments exist for context, not XP farming.',
      'Daily limits: 8 comments per member (33 for Super Admin, Admin, Heads, and Moderators).',
      'Emoji limits: +1 (5/day), fire (1/day), -1 (1/day). None award XP directly.',
      'House conversations stay private to admins, moderators, and members of that House.',
    ],
    badge: 'The public comment with the most reaction points (positive + 2*fire) each week earns 88 XP and the "Comment of the Week" badge.',
  },
};

const formatRange = (min: number | null, max: number | null) => {

  const a = typeof min === 'number' ? min : 0;

  const b = typeof max === 'number' ? max : 0;

  if (a === b) return `${a} XP`;

  return `${a}â${b} XP`;

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

  const commentRulesCopy = COMMENT_RULES_COPY[language] ?? COMMENT_RULES_COPY.en;

  const onboardingCopy = ONBOARDING_COPY[language] ?? ONBOARDING_COPY.en;



  const [xpData, setXpData] = useState<EducationXpData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [comboProgress, setComboProgress] = useState<ComboProgressState>(DEFAULT_COMBO_PROGRESS);

  const [comboMissionState, setComboMissionState] = useState<Record<ComboKey, ComboMissionMeta>>(

    createDefaultComboMeta(),

  );

  const [comboLoading, setComboLoading] = useState(true);

  const [comboError, setComboError] = useState<string | null>(null);



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

        if (token) headers.Authorization = `Bearer ${token}`;



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

  }, [user, getToken, copy.errorsFallback]);



  /** ---------- Dados derivados ---------- */

  const rewardMap = useMemo(() => {

    const map = new Map<string, XpReward>();

    (xpData?.rewards ?? []).forEach((r) => map.set(r.action_type, r));

    return map;

  }, [xpData?.rewards]);



  const dailyCap = useMemo(() => {

    // tenta ler de limits/metadata; fallback para o valor oficial do copy

    // (mantemos o nÃºmero do copy como fonte de verdade visual)

    return 369;

  }, []);



  const visibleRewards = useMemo(() => {

    // MantÃ©m referÃªncia Ãºtil sem ruÃ­do: esconde o que jÃ¡ explicamos em âConsistÃªnciaâ

    const hiddenActions = new Set(['streak_7', 'streak_30']);

    return (xpData?.rewards ?? []).filter(

      (r) => !hiddenActions.has(r.action_type) && !r.action_type?.startsWith('forum_'),

    );

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


      else if (a.startsWith('mission_') || a.startsWith('streak_')) group.consistency.push(item);

      else group.other.push(item);

    });



    return group;

  }, [visibleRewards]);



  const thresholds = xpData?.thresholds ?? [];



  const xpFallbackByKey: Record<ComboKey, string> = {

    quick: copy.planQuickXP || '+15 XP',

    base: copy.planBaseXP || '+21 XP',

    serious: copy.planSeriousXP || '+33 XP',

  };



  const planCardBase: Record<ComboKey, { title: string; desc: string; href: string; icon: typeof Eye; featured?: boolean }> = {

    quick: { title: copy.planQuick, desc: copy.planQuickDesc, href: '/education/glossary', icon: Eye },

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

      ? 'A atualizar o progresso diÃ¡rio...'

      : language === 'es'

      ? 'Actualizando el progreso diario...'

      : 'Updating daily progress...';



  const comboAccumulationText =

    language === 'pt'

      ? 'Consumos acumulam durante o dia e reiniciam Ã s 00h CET.'

      : language === 'es'

      ? 'Se acumula todo lo que consumes y reinicia a las 00h CET.'

      : 'All progress stacks during the day and resets at 00:00 CET.';



  const comboCompletedNote =

    language === 'pt'

      ? 'XP extra jÃ¡ creditado hoje.'

      : language === 'es'

      ? 'XP extra ya acreditado hoy.'

      : 'Bonus XP already granted today.';



  const completedLabel = COMPLETED_LABELS[language];



  /** ---------- Gate (pÃ¡gina fechada) ---------- */

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

                    ? 'XP existe para progresso real â nÃ£o para âver como funcionaâ.'

                    : language === 'es'

                    ? 'XP existe para progreso real â no para âcuriosearâ.'

                    : 'XP exists for real progress â not browsing.'}

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

            {/* HERO (curto, sÃ©rio, sem stock) */}

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

                          ? 'O conteÃºdo Ã© livre. O progresso Ã© merecido.'

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

                              ? 'Limite diÃ¡rio global e streaks existem para travar spam e premiar disciplina.'

                              : language === 'es'

                              ? 'El lÃ­mite diario y los streaks frenan spam y premian disciplina.'

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

                            {language === 'pt' ? 'Limite diÃ¡rio' : language === 'es' ? 'LÃ­mite diario' : 'Daily cap'}

                          </div>

                          <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>{dailyCap} XP</p>

                          <p className={cn(UI.micro, 'mt-1')}>

                            {language === 'pt'

                              ? 'Depois disso, aprendes na mesma â mas nÃ£o acumulas XP.'

                              : language === 'es'

                              ? 'DespuÃ©s, sigues aprendiendo â pero no acumulas XP.'

                              : 'After that, you can still learn â XP stops accumulating.'}

                          </p>

                        </div>



                        <div className={cn('rounded-2xl border border-white/10 bg-[#000c12]/40 p-4')}>

                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                            <Flame className="h-4 w-4 text-cyan-300" />

                            7 {language === 'pt' ? 'dias' : language === 'es' ? 'dÃ­as' : 'days'}

                          </div>

                          <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>222 XP</p>

                          <p className={cn(UI.micro, 'mt-1')}>

                            {language === 'pt'

                              ? 'XP ganho todos os dias. Sem desculpas.'

                              : language === 'es'

                              ? 'XP ganado cada dÃ­a. Sin excusas.'

                              : 'XP earned daily. No excuses.'}

                          </p>

                        </div>



                        <div className={cn('rounded-2xl border border-white/10 bg-[#000c12]/40 p-4')}>

                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                            <CalendarCheck className="h-4 w-4 text-cyan-300" />

                            30 {language === 'pt' ? 'dias' : language === 'es' ? 'dÃ­as' : 'days'}

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



            {/* STICKY BAR (premium, utilitÃ¡ria) */}

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

                            ? 'A base: liÃ§Ãµes, leituras e glossÃ¡rio.'

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

                              <p className={UI.bodyMuted}>{loading ? copy.loadingRewards : 'â'}</p>

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

                            ? 'Credibilidade mÃ­nima para acompanhar o teu progresso.'

                            : language === 'es'

                            ? 'Credibilidad mÃ­nima para seguir tu progreso.'

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

                              <p className={UI.bodyMuted}>{loading ? copy.loadingRewards : 'â'}</p>

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

                            ? 'Comentarios privados desbloqueiam aos 369 XP e vivem dentro de licoes, blog posts e Houses.'

                            : language === 'es'

                            ? 'Los comentarios privados se desbloquean a los 369 XP y viven dentro de lecciones, posts y Houses.'

                            : 'Private comments unlock at 369 XP and live inside lessons, blog posts, and Houses.'}

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



                          <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">

                            <p className="text-sm font-semibold text-white">{commentRulesCopy.title}</p>

                            <p className={cn(UI.micro, 'mt-1 text-slate-300')}>{commentRulesCopy.intro}</p>

                            <ul className="mt-3 space-y-2 text-sm text-slate-200">

                              {commentRulesCopy.points.map((point) => (

                                <li key={point} className="flex items-start gap-2">

                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />

                                  <span>{point}</span>

                                </li>

                              ))}

                            </ul>

                            <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-400/10 p-3 text-xs text-amber-100">

                              {commentRulesCopy.badge}

                            </div>

                          </div>

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

                          {language === 'pt' ? 'Liga Ã  evidÃªncia' : language === 'es' ? 'Evidencia' : 'Evidence'}

                        </p>

                        <p className={cn(UI.body, 'mt-2')}>

                          {language === 'pt'

                            ? 'Leaderboard nÃ£o Ã© ego. Ã consistÃªncia visÃ­vel. Mostra quem aparece, termina e volta.'

                            : language === 'es'

                            ? 'El leaderboard no es ego. Es consistencia visible. Muestra quiÃ©n aparece, termina y vuelve.'

                            : 'Leaderboard is not ego. Itâs visible consistency. It shows who shows up, finishes, and returns.'}

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

                            ? 'Compete contra o âtu de ontemâ.'

                            : language === 'es'

                            ? 'Compite contra tu âyo de ayerâ.'

                            : 'Compete against yesterday you.'}

                        </p>

                      </CardContent>

                    </Card>

                  </div>

                </div>

              </div>

            </section>



            {/* CONSISTÃNCIA */}

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

                        {language === 'pt' ? 'Limite diÃ¡rio' : language === 'es' ? 'LÃ­mite diario' : 'Daily cap'}

                      </div>

                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>369 XP</p>

                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[0]}</p>

                    </div>



                    <div className={cn(UI.cardSurface, 'p-4')}>

                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                        <Flame className="h-4 w-4 text-cyan-300" />

                        7 {language === 'pt' ? 'dias' : language === 'es' ? 'dÃ­as' : 'days'}

                      </div>

                      <p className={cn('mt-2 text-3xl font-semibold text-[#5af3ff]')}>222 XP</p>

                      <p className={cn(UI.micro, 'mt-1')}>{copy.consistencyPoints[1]}</p>

                    </div>



                    <div className={cn(UI.cardSurface, 'p-4')}>

                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">

                        <CalendarCheck className="h-4 w-4 text-cyan-300" />

                        30 {language === 'pt' ? 'dias' : language === 'es' ? 'dÃ­as' : 'days'}

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

                          ? 'Um curso de cada vez. Termina. SÃ³ depois avanÃ§as. Isto cria capacidade real.'

                          : language === 'es'

                          ? 'Un curso a la vez. Termina. Luego avanzas. Esto crea capacidad real.'

                          : 'One course at a time. Finish it. Then move forward. That builds real capacity.'}

                      </p>

                      <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">

                        <p className={UI.goldStatLabel}>

                          {language === 'pt' ? 'Dica de execuÃ§Ã£o' : language === 'es' ? 'Consejo' : 'Execution tip'}

                        </p>

                        <p className={cn(UI.body, 'mt-2')}>

                          {language === 'pt'

                            ? 'Se falhas um dia, nÃ£o dramatizes. RecomeÃ§a no dia seguinte. O streak existe para treinar disciplina, nÃ£o para te castigar.'

                            : language === 'es'

                            ? 'Si fallas un dÃ­a, no dramatices. Reinicia al dÃ­a siguiente. El streak entrena disciplina, no castigo.'

                            : 'If you miss a day, donât dramatise. Restart tomorrow. Streaks train discipline, not punishment.'}

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
              </div>
            </section>

          </div>

        </div>

      </main>



      <Footer />

    </div>

  );

}



