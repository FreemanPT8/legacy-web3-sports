'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarCheck,
  Flame,
  ShieldCheck,
  Sparkles,
  Trophy,
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

const HERO_IMAGE_FALLBACK =
  process.env.NEXT_PUBLIC_XP_HERO_IMAGE ||
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80';

const XP_COPY: Record<
  SupportedCopyLang,
  {
    heroTitle: string;
    heroIntro: string;
    heroSub: string;
    heroBadge: string;
    heroHighlights: Array<{
      label: string;
      value: string;
      detail: string;
      icon: typeof ShieldCheck;
    }>;
    rewardsKicker: string;
    rewardsTitle: string;
    rewardsDescription: string;
    streaksKicker: string;
    streaksIntro: string;
    streaksPoints: string[];
    monitoringTitle: string;
    monitoringBody: string;
    alertsTitle: string;
    alertsBody: string;
    thresholdsKicker: string;
    thresholdsTitle: string;
    thresholdsDescription: string;
    levelNote: string;
    unlockNote: string;
  }
> = {
  pt: {
    heroTitle: 'XP do Legacy',
    heroIntro:
      'O Legacy recompensa aprendizagem, criação e participação real. O modelo completo está documentado aqui e explica, passo a passo, como cada ação é creditada.',
    heroSub:
      'Nenhum XP é creditado apenas pelo login; é preciso ganhar crédito legítimo completando lições, lendo conteúdos ou contribuindo no fórum.',
    heroBadge: 'Legacy XP — Sistema oficial',
    heroHighlights: [
      {
        label: 'Limite diário global',
        value: '369 XP',
        detail:
          'Só este valor pode ser somado num dia útil. Depois disso, o conteúdo permanece aberto, mas o XP não acumula.',
        icon: ShieldCheck,
      },
      {
        label: '7 dias com XP ganho',
        value: '222 XP',
        detail:
          'Streak curto: exige XP confirmado todos os dias. Login não basta; faltar um dia reinicia a contagem.',
        icon: Flame,
      },
      {
        label: '30 dias com XP ganho',
        value: '1.111 XP',
        detail:
          'Streak longo: recompensa quem mantém XP real todos os dias durante 30 dias consecutivos.',
        icon: CalendarCheck,
      },
    ],
    rewardsKicker: 'Recompensas',
    rewardsTitle: 'Cada ação devolve XP por esforço real',
    rewardsDescription:
      'XP é um sinal público: quem aprende, cria e contribui cresce. Todos os intervalos aqui são oficiais e auditáveis.',
    streaksKicker: 'Streaks & consistência',
    streaksIntro:
      'Streaks existem para premiar consistência real, não apenas presença. A contagem é zerada se algum dia passar sem XP.',
    streaksPoints: [
      'Ganhar XP todos os dias é obrigatório para manter um streak.',
      'Streak de 7 dias rende 222 XP; streak de 30 dias rende 1.111 XP.',
      'Conclusões de lições e leituras contam uma única vez por utilizador e impedem criadores de ler o próprio conteúdo para ganhar XP.',
    ],
    monitoringTitle: 'Como monitorizamos',
    monitoringBody:
      'Leituras e lições só contam uma vez por utilizador. Criadores não recebem XP ao consumir o próprio conteúdo; ganham 19% quando outros completam.',
    alertsTitle: 'Alertas automáticos',
    alertsBody:
      'Quando um streak fecha, o Legacy envia uma notificação oficial e atualiza o histórico público da tua conta.',
    thresholdsKicker: 'Progressão e thresholds',
    thresholdsTitle: 'Cada milestone desbloqueia acesso extra',
    thresholdsDescription:
      'O XP total determina privilégios, reputação e desbloqueios. Vê abaixo o que precisas para cada etapa.',
    levelNote: 'Nível = XP total / 100 (arredondado para baixo).',
    unlockNote: 'Ao atingir novos marcos, desbloqueias casas, fóruns privados, missões e desafios.',
  },
  es: {
    heroTitle: 'XP de Legacy',
    heroIntro:
      'Legacy recompensa aprendizaje, creación y participación reales. Aquí está documentado el modelo completo y cómo se acredita cada acción.',
    heroSub:
      'No se otorga XP solo por iniciar sesión; debes conseguirlo completando lecciones, leyendo contenidos o aportando al foro.',
    heroBadge: 'Legacy XP — Sistema oficial',
    heroHighlights: [
      {
        label: 'Límite diario global',
        value: '369 XP',
        detail:
          'Solo este valor se suma en un día. Después, el contenido sigue abierto pero el XP deja de acumular.',
        icon: ShieldCheck,
      },
      {
        label: '7 días con XP ganado',
        value: '222 XP',
        detail:
          'Streak corto: requiere XP confirmado cada día. El inicio de sesión no basta; faltar un día reinicia la cuenta.',
        icon: Flame,
      },
      {
        label: '30 días con XP ganado',
        value: '1.111 XP',
        detail:
          'Streak largo: premia a quien mantiene XP real durante 30 días consecutivos.',
        icon: CalendarCheck,
      },
    ],
    rewardsKicker: 'Recompensas',
    rewardsTitle: 'Cada acción devuelve XP por esfuerzo real',
    rewardsDescription:
      'El XP es una señal pública: quien aprende, crea y contribuye avanza. Estos intervalos son oficiales y auditables.',
    streaksKicker: 'Streaks y consistencia',
    streaksIntro:
      'Los streaks existen para premiar consistencia real. Si un día pasa sin XP, la racha se reinicia.',
    streaksPoints: [
      'Ganar XP cada día es obligatorio para mantener una racha.',
      'La racha de 7 días otorga 222 XP; la de 30 días otorga 1.111 XP.',
      'Lecciones y lecturas cuentan una sola vez por usuario e impiden que los creadores se otorguen XP leyendo su propio contenido.',
    ],
    monitoringTitle: 'Cómo lo monitorizamos',
    monitoringBody:
      'Una lectura o lección solo cuenta una vez por usuario. Los creadores no reciben XP al consumir su propio contenido; obtienen 19% cuando otros lo completan.',
    alertsTitle: 'Alertas automáticas',
    alertsBody:
      'Cuando cierras una racha, Legacy envía una notificación oficial y actualiza el historial público de tu cuenta.',
    thresholdsKicker: 'Progresión y thresholds',
    thresholdsTitle: 'Cada hito desbloquea acceso extra',
    thresholdsDescription:
      'El XP total define privilegios, reputación y desbloqueos. Consulta cuánto XP necesitas en cada etapa.',
    levelNote: 'Nivel = XP total / 100 (redondeado hacia abajo).',
    unlockNote: 'Cada nuevo hito abre casas, foros privados, misiones y desafíos especiales.',
  },
  en: {
    heroTitle: 'Legacy XP',
    heroIntro:
      'Legacy rewards learning, creation, and genuine participation. This page documents the entire model and shows how every action is credited.',
    heroSub:
      'No XP is granted just for logging in—you need to earn it by completing lessons, reading content, or contributing to the forum.',
    heroBadge: 'Legacy XP — Official system',
    heroHighlights: [
      {
        label: 'Global daily limit',
        value: '369 XP',
        detail:
          'Only this amount counts each day. After that, content stays open but XP stops increasing.',
        icon: ShieldCheck,
      },
      {
        label: '7 days with XP',
        value: '222 XP',
        detail:
          'Short streak: requires verified XP every day. Missing a day resets the counter.',
        icon: Flame,
      },
      {
        label: '30 days with XP',
        value: '1,111 XP',
        detail:
          'Long streak: rewards people who keep earning real XP for 30 consecutive days.',
        icon: CalendarCheck,
      },
    ],
    rewardsKicker: 'Rewards',
    rewardsTitle: 'Every action returns XP for real effort',
    rewardsDescription:
      'XP is a public signal: those who learn, build, and show up progress. These intervals are official and auditable.',
    streaksKicker: 'Streaks & consistency',
    streaksIntro:
      'Streaks exist to reward real consistency. Skip a day without XP and the streak restarts.',
    streaksPoints: [
      'Earning XP every day is mandatory to keep a streak.',
      'A 7-day streak yields 222 XP; a 30-day streak yields 1,111 XP.',
      'Lessons and reads count once per user and prevent creators from farming their own content.',
    ],
    monitoringTitle: 'How we monitor',
    monitoringBody:
      'Lessons/articles count once per user. Creators don’t earn XP by consuming their own content; they get 19% whenever someone else completes it.',
    alertsTitle: 'Automatic alerts',
    alertsBody:
      'When you finish a streak, Legacy sends an official notification and updates your public history.',
    thresholdsKicker: 'Progression & thresholds',
    thresholdsTitle: 'Every milestone unlocks extra access',
    thresholdsDescription:
      'Total XP defines privileges, reputation, and unlocks. Check how much XP each stage requires.',
    levelNote: 'Level = total XP / 100 (rounded down).',
    unlockNote: 'Hitting new milestones opens houses, private forums, missions, and special challenges.',
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
    title: {
      pt: 'Lição concluída',
      es: 'Lección completada',
      en: 'Lesson completed',
    },
    creatorBonus: {
      pt: '+19% quando outros completam a tua lição — exclusivo para criadores.',
      es: '+19% cuando otros completan tu lección — exclusivo para creadores.',
      en: '+19% whenever someone completes your lesson—creator-only bonus.',
    },
  },
  blog_read: {
    title: {
      pt: 'Artigo lido',
      es: 'Artículo leído',
      en: 'Article read',
    },
    creatorBonus: {
      pt: '+19% quando outros leem o teu artigo — exclusivo para criadores.',
      es: '+19% cuando otros leen tu artículo — exclusivo para creadores.',
      en: '+19% whenever someone else reads your article—creator-only bonus.',
    },
  },
  profile_complete: {
    title: {
      pt: 'Perfil completo',
      es: 'Perfil completado',
      en: 'Profile completed',
    },
  },
  forum_post: {
    title: {
      pt: 'Publicação no fórum',
      es: 'Publicación en el foro',
      en: 'Forum post',
    },
  },
  forum_topic: {
    title: {
      pt: 'Tópico no fórum',
      es: 'Tema en el foro',
      en: 'Forum topic',
    },
  },
  forum_comment: {
    title: {
      pt: 'Comentário no fórum',
      es: 'Comentario en el foro',
      en: 'Forum comment',
    },
    creatorBonus: {
      pt: '+0.5% quando outros interagem com o teu comentário — exclusivo para criadores.',
      es: '+0,5% cuando otros interactúan con tu comentario — exclusivo para creadores.',
      en: '+0.5% whenever someone interacts with your comment—creator-only bonus.',
    },
  },
  mission_daily: {
    title: {
      pt: 'Missão diária',
      es: 'Misión diaria',
      en: 'Daily mission',
    },
  },
};

const getRewardMeta = (
  action: string,
  language: SupportedCopyLang,
): { title: string; creatorBonus?: string } => {
  const meta = rewardMetadata[action];
  if (!meta) {
    const fallback = action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return { title: fallback };
  }
  return {
    title: meta.title[language] ?? meta.title.en,
    creatorBonus: meta.creatorBonus ? meta.creatorBonus[language] ?? meta.creatorBonus.en : undefined,
  };
};

export default function EducationXpPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = XP_COPY[language] ?? XP_COPY.en;
  const [xpData, setXpData] = useState<EducationXpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch('/api/education/xp', { cache: 'no-store' });
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
          setError(data.error || 'Failed to load XP metadata.');
        }
      } catch (err) {
        if (!active) return;
        setError('Failed to load XP metadata.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchXp();
    return () => {
      active = false;
    };
  }, [user]);

  const visibleRewards = useMemo(() => {
    const hiddenActions = new Set([
      'streak_7',
      'streak_30',
      'forum_post',
      'forum_topic',
      'forum_comment',
    ]);
    return (xpData?.rewards ?? []).filter(
      (reward) => !hiddenActions.has(reward.action_type),
    );
  }, [xpData?.rewards]);

  const thresholdTable = xpData?.thresholds ?? [];

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center">
          <div className="container mx-auto max-w-3xl px-4">
            <Card className="border border-white/10 bg-[#03141d] shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
              <CardContent className="py-10 space-y-4 text-center">
                <h1 className="text-3xl font-semibold text-white">
                  {language === 'es'
                    ? 'Inicia sesión para ver tu XP'
                    : language === 'pt'
                    ? 'Inicia sessão para ver o teu XP'
                    : 'Sign in to view your XP'}
                </h1>
                <p className="text-sm text-slate-300">
                  {language === 'es'
                    ? 'El modelo XP es exclusivo para miembros conectados. Entra para seguir tu progreso real.'
                    : language === 'pt'
                    ? 'O modelo XP é exclusivo para membros autenticados. Entra para acompanhar o teu progresso real.'
                    : 'The XP model is exclusive to signed-in members. Log in to track your real progress.'}
                </p>
                <div className="flex justify-center gap-4">
                  <Link href="/login">
                    <Button className="px-8">
                      {language === 'es'
                        ? 'Iniciar sesión'
                        : language === 'pt'
                        ? 'Iniciar sessão'
                        : 'Log in'}
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" className="px-8 border-white/40 text-white">
                      {language === 'es'
                        ? 'Crear cuenta'
                        : language === 'pt'
                        ? 'Criar conta'
                        : 'Create account'}
                    </Button>
                  </Link>
                </div>
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
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 space-y-10 max-w-6xl">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-12 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
            </div>
            <div className="relative grid gap-10 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">XP SYSTEM</p>
                  <h1 className="text-4xl font-semibold text-[#fdd87c] md:text-5xl">
                    {copy.heroTitle}
                  </h1>
                  <p className="text-base text-slate-100/95 leading-relaxed">{copy.heroIntro}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{copy.heroSub}</p>
                </div>
                <Badge className="w-fit border border-white/10 bg-cyan-500/15 text-cyan-100">
                  {copy.heroBadge}
                </Badge>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {copy.heroHighlights.map((highlight) => {
                    const Icon = highlight.icon;
                    return (
                      <div
                        key={highlight.label}
                        className="rounded-2xl border border-white/15 bg-[#000c12]/40 p-4 shadow-lg shadow-black/40"
                      >
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#fdd87c]">
                          <Icon className="h-4 w-4 text-cyan-300" />
                          {highlight.label}
                        </div>
                        <p className="text-3xl font-semibold text-[#5af3ff] mt-2">
                          {highlight.value}
                        </p>
                        <p className="text-sm text-slate-300 mt-1">{highlight.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
                <Image
                  src={HERO_IMAGE_FALLBACK}
                  alt="Legacy XP"
                  fill
                  priority
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#000c12]/80 via-[#031821]/20 to-transparent" />
              </div>
            </div>
          </section>

          {/* Error state */}
          {error && (
            <Card className="bg-rose-950/80 border border-rose-600/80">
              <CardContent className="space-y-2 py-4">
                <p className="text-sm text-rose-100">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Rewards */}
          <section className="space-y-5">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-amber-300 uppercase tracking-[0.2em]">
                {copy.rewardsKicker}
              </p>
              <h2 className="text-2xl font-bold text-white">{copy.rewardsTitle}</h2>
              <p className="text-sm text-slate-300">{copy.rewardsDescription}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleRewards.length === 0 ? (
                <Card className="bg-[#000c12] border border-white/10">
                  <CardContent className="py-6">
                    <p className="text-sm text-slate-300">
                      {loading ? 'Carregando...' : 'Ainda não existem regras publicadas.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                visibleRewards.map((reward) => {
                  const range =
                    reward.min_xp === reward.max_xp
                      ? `${reward.min_xp ?? 0} XP`
                      : `${reward.min_xp ?? 0} - ${reward.max_xp ?? 0} XP`;
                  const meta = getRewardMeta(reward.action_type, language);

                  return (
                    <Card
                      key={reward.action_type}
                      className="bg-[#05212b] border border-white/10 transition hover:border-cyan-400/60 hover:-translate-y-0.5"
                    >
                      <CardContent className="space-y-3 text-sm text-slate-200 py-5">
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-primary">{meta.title}</h3>
                          </div>
                          <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white">
                            {range}
                          </span>
                        </div>
                        {meta.creatorBonus && (
                          <p className="text-xs text-slate-300">{meta.creatorBonus}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          {/* Limits & streaks */}
          <section className="space-y-4">
            <Card className="bg-[#05212b] border border-white/10">
              <CardContent className="grid gap-6 py-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
                    {copy.streaksKicker}
                  </p>
                  <p className="text-sm text-slate-200">{copy.streaksIntro}</p>
                  <ul className="space-y-2 list-disc pl-5 text-sm text-slate-200">
                    {copy.streaksPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#000c12]/80 p-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {copy.monitoringTitle}
                    </p>
                    <p className="text-sm text-slate-300">{copy.monitoringBody}</p>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {copy.alertsTitle}
                    </p>
                    <p className="text-sm text-slate-300">{copy.alertsBody}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Thresholds */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-amber-300 uppercase tracking-[0.2em]">
                {copy.thresholdsKicker}
              </p>
              <h2 className="text-2xl font-bold text-white">{copy.thresholdsTitle}</h2>
              <p className="text-sm text-slate-300">{copy.thresholdsDescription}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {thresholdTable.length === 0 ? (
                <Card className="bg-[#05212b] border border-white/10">
                  <CardContent className="py-5">
                    <p className="text-sm text-slate-200">
                      {loading
                        ? 'Carregando thresholds...'
                        : 'Ainda não há thresholds publicados. A equipa admin pode adicioná-los no painel /admin/xp.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                thresholdTable.map((threshold) => {
                  const needsXpText =
                    language === 'es'
                      ? `Necesitas ${threshold.xp_total} XP totales`
                      : language === 'en'
                      ? `You need ${threshold.xp_total} total XP`
                      : `Precisas de ${threshold.xp_total} XP totais`;
                  const featureTitle = threshold.feature_name;
                  const extraHint =
                    !threshold.description && /compet/i.test(featureTitle)
                      ? {
                          pt: 'Acesso às provas oficiais do Legacy representando a tua casa ou país.',
                          es: 'Acceso a las competiciones oficiales de Legacy representando tu casa o país.',
                          en: 'Access to Legacy’s official competitions representing your house or country.',
                        }[language]
                      : threshold.description;

                  return (
                    <Card
                      key={`${threshold.xp_total}-${threshold.feature_name}`}
                      className="bg-[#05212b] border border-white/10 hover:border-cyan-400/50 transition"
                    >
                      <CardContent className="space-y-3 py-5">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>{needsXpText}</span>
                          <Badge variant="outline" className="text-white border-white/30">
                            {language === 'es'
                              ? 'Desbloqueo'
                              : language === 'en'
                              ? 'Unlock'
                              : 'Desbloqueio'}
                          </Badge>
                        </div>
                        <p className="text-lg font-semibold text-primary">{featureTitle}</p>
                        {extraHint && <p className="text-sm text-slate-200">{extraHint}</p>}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            <Card className="bg-[#05212b] border border-white/10">
              <CardContent className="space-y-3 text-sm text-slate-200 py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <p>{copy.levelNote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-emerald-300" />
                  <p>{copy.unlockNote}</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
