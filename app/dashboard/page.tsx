'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Target,
  Flame,
  TrendingUp,
  Award,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTitle,
  HeroTextColumn,
} from '@/components/sections/HeroSection';
import type { ComboProgressState, ComboMissionMeta, ComboKey } from '@/lib/comboMissions';

const DAILY_XP_LIMIT = 369;

type XpTransaction = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
  reference_label?: string | null;
};

type XpSummary = {
  xp_total: number;
  xp_today: number;
  xp_last_7_days: number;
  xp_last_30_days: number;
  streak_count: number;
  streak_updated_at: string | null;
  streak_long_count: number;
  streak_long_updated_at: string | null;
  recent_transactions: XpTransaction[];
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { t } = useLanguage();

  const [mounted, setMounted] = useState(false);

  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [xpLoading, setXpLoading] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);

  const [missions, setMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [comboProgress, setComboProgress] = useState<ComboProgressState | null>(null);
  const [comboMeta, setComboMeta] = useState<Record<ComboKey, ComboMissionMeta> | null>(null);
  const [comboError, setComboError] = useState<string | null>(null);

  const [streak, setStreak] = useState(0);
  const [longStreak, setLongStreak] = useState(0);

  const [globalRank, setGlobalRank] = useState<{
    rank: number | null;
    totalUsers: number;
  } | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  const fetchMissions = useCallback(async () => {
    if (!user) return;
    try {
      setComboError(null);
      const response = await fetch(`/api/missions/generate?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setMissions(data.missions || []);
        if (data.combo_progress) {
          setComboProgress(data.combo_progress as ComboProgressState);
        }
        if (Array.isArray(data.missions)) {
          const mapping: Record<ComboKey, ComboMissionMeta> = {
            quick: { xp: 13, completed: false },
            base: { xp: 21, completed: false },
            serious: { xp: 47, completed: false },
          };
          data.missions.forEach((mission: any) => {
            const missionType: string | undefined = mission?.type;
            if (!missionType) return;
            const missionData = Array.isArray(mission.user_missions)
              ? mission.user_missions[0]
              : mission.user_missions;
            if (missionType === 'combo_quick') {
              mapping.quick = {
                xp: mission?.xp_reward ?? 13,
                completed: Boolean(missionData?.completed),
              };
            } else if (missionType === 'combo_base') {
              mapping.base = {
                xp: mission?.xp_reward ?? 21,
                completed: Boolean(missionData?.completed),
              };
            } else if (missionType === 'combo_serious') {
              mapping.serious = {
                xp: mission?.xp_reward ?? 47,
                completed: Boolean(missionData?.completed),
              };
            }
          });
          setComboMeta(mapping);
        }
      } else if (data.error) {
        setComboError(data.error as string);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
      setComboError(t('dashboard.comboError') || 'Erro ao carregar combo diário.');
    } finally {
      setLoadingMissions(false);
    }
  }, [user]);

  const updateStreak = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/streak/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        if (typeof data.newStreak === 'number') {
          setStreak(data.newStreak);
        }
        if (typeof data.longStreak === 'number') {
          setLongStreak(data.longStreak);
        }
      }
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }, [user]);

  const fetchGlobalRank = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingRank(true);
      const response = await fetch(`/api/leaderboard/rank?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setGlobalRank({
          rank: typeof data.rank === 'number' ? data.rank : null,
          totalUsers: typeof data.totalUsers === 'number' ? data.totalUsers : 0,
        });
      } else {
        console.error('Failed to fetch global rank:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch global rank:', error);
    } finally {
      setLoadingRank(false);
    }
  }, [user]);

  const fetchXpSummary = useCallback(async () => {
    if (!user) return;
    const token = getToken();
    if (!token) {
      setXpError('Token inválido ou expirado');
      return;
    }

    try {
      setXpLoading(true);
      setXpError(null);

      const response = await fetch('/api/me/xp', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to fetch XP summary:', data.error);
        setXpError(data.error || 'Falha ao carregar XP');
        return;
      }

      const xpData = data.xp as XpSummary;
      setXpSummary(xpData);

      if (typeof xpData.streak_long_count === 'number') {
        setLongStreak(xpData.streak_long_count);
      }
      if (typeof xpData.streak_count === 'number' && xpData.streak_count > 0) {
        setStreak(xpData.streak_count);
      }
    } catch (error) {
      console.error('Failed to fetch XP summary:', error);
      setXpError('Falha ao carregar XP');
    } finally {
      setXpLoading(false);
    }
  }, [getToken, user]);

  useEffect(() => {
    if (user) {
      fetchMissions();
      updateStreak();
      fetchGlobalRank();
      fetchXpSummary();
    }
  }, [user, fetchMissions, updateStreak, fetchGlobalRank, fetchXpSummary]);

  const xpTotal = useMemo(() => {
    if (xpSummary) return xpSummary.xp_total;
    return typeof user?.xp_total === 'number' ? user.xp_total : 0;
  }, [xpSummary, user?.xp_total]);

  const level = useMemo(
    () => (xpTotal ? Math.floor(xpTotal / 100) : 0),
    [xpTotal],
  );

  const xpProgress = useMemo(
    () => (xpTotal ? xpTotal % 100 : 0),
    [xpTotal],
  );

  const xpHistory = useMemo(
    () => xpSummary?.recent_transactions || [],
    [xpSummary],
  );

  const todayXp = useMemo(() => {
    if (xpSummary) return xpSummary.xp_today || 0;
    if (!xpHistory || xpHistory.length === 0) return 0;

    const now = new Date();
    return xpHistory.reduce((sum, tx) => {
      if (!tx.created_at || typeof tx.xp_earned !== 'number') return sum;
      const d = new Date(tx.created_at);
      if (isSameDay(now, d)) {
        return sum + tx.xp_earned;
      }
      return sum;
    }, 0);
  }, [xpSummary, xpHistory]);

  const todayLimitProgress = useMemo(() => {
    if (DAILY_XP_LIMIT <= 0) return 0;
    const ratio = (todayXp / DAILY_XP_LIMIT) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
  }, [todayXp]);

  const remainingTodayXp = useMemo(
    () => Math.max(DAILY_XP_LIMIT - todayXp, 0),
    [todayXp],
  );

  if (loading || !user || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
          <p className="mt-4 text-sm text-slate-300">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto w-full max-w-6xl px-4 space-y-10">
          <HeroSection className="px-6 py-6">
            <HeroTextColumn className="space-y-3">
              <HeroEyebrow>LEGACY XP</HeroEyebrow>
              <HeroTitle>
                {t('dashboard.welcomeBack').replace('{username}', user.username)}
              </HeroTitle>
              <HeroDescription className="max-w-3xl text-slate-100">
                {t('dashboard.trackProgress')}
              </HeroDescription>
              {xpError && <p className="text-sm text-rose-400">{xpError}</p>}
            </HeroTextColumn>
          </HeroSection>

          <section className="grid gap-6 md:grid-cols-3">
            {/* XP TOTAL + HOJE + LIMITE */}
            <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_20px_50px_rgba(2,10,20,0.6)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  {t('dashboard.totalXp')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-10 w-10 text-cyan-400" />
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {xpLoading && !xpSummary ? '...' : xpTotal}
                    </div>
                    <p className="text-sm text-slate-400">
                      {t('dashboard.level')} {level}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-400">
                      {t('dashboard.nextLevel')}
                    </span>
                    <span className="font-medium text-white">
                      {xpProgress}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#020b11]">
                    <div
                      className="h-2 rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-300">
                    <span>XP ganho hoje</span>
                    <span className="font-semibold text-white">
                      {todayXp} / {DAILY_XP_LIMIT}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#020b11]">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        todayXp >= DAILY_XP_LIMIT
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${todayLimitProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {todayXp >= DAILY_XP_LIMIT
                      ? 'Atingiste o limite diário de XP. Podes continuar a estudar, mas sem ganhar mais XP hoje.'
                      : `Ainda podes ganhar até ${remainingTodayXp} XP hoje.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* STREAK */}
            <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_20px_50px_rgba(2,10,20,0.6)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  {t('dashboard.currentStreak')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Flame className="h-10 w-10 text-orange-500" />
                  <div>
                    <div className="text-3xl font-bold text-white">{streak}</div>
                    <p className="text-sm text-slate-400">
                      {t('dashboard.currentStreakLabel')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-300">
                  <p>
                    {t('dashboard.longStreakLabel')} {longStreak}/30
                  </p>
                  <p>{t('dashboard.longStreakTooltip')}</p>
                  <p className="text-cyan-300">
                    {t('dashboard.bonusAt30Days')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* GLOBAL RANK */}
            <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_20px_50px_rgba(2,10,20,0.6)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  {t('dashboard.globalRank')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-10 w-10 text-emerald-400" />
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {loadingRank
                        ? '...'
                        : globalRank?.rank
                        ? `#${globalRank.rank}`
                        : '-'}
                    </div>
                    <p className="text-sm text-slate-400">
                      {globalRank?.rank
                        ? `Entre ${globalRank.totalUsers} membros ativos`
                        : t('dashboard.unranked')}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-300">
                    {t('dashboard.earnMoreXp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* MISSÕES + FEATURES DESBLOQUEADAS */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Target className="h-5 w-5 text-cyan-400" />
                  {t('dashboard.dailyMissions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMissions ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-400" />
                    <p className="mt-2 text-sm text-slate-300">
                      {t('dashboard.loadingMissions')}
                    </p>
                  </div>
                ) : !comboProgress && missions.length === 0 ? (
                  <div className="py-8 text-center">
                    <Target className="mx-auto mb-3 h-12 w-12 text-slate-500" />
                    <p className="text-slate-300">
                      {t('dashboard.noMissionsToday')}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {t('dashboard.checkBackTomorrow')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comboError && (
                      <p className="text-sm text-rose-300">{comboError}</p>
                    )}
                    <div className="rounded-2xl border border-white/10 bg-[#04131b]/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-200">
                            {t('dashboard.comboProgress')}
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            {t('dashboard.comboHint')}
                          </p>
                        </div>
                        <Sparkles className="h-4 w-4 text-[#fdd87c]" />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          { key: 'glossary', label: t('dashboard.glossaryTerms') },
                          { key: 'blog', label: t('dashboard.blogReads') },
                          { key: 'lesson', label: t('dashboard.lessons') },
                        ].map((item) => {
                          const count =
                            item.key === 'glossary'
                              ? comboProgress?.glossary_count ?? 0
                              : item.key === 'blog'
                              ? comboProgress?.blog_count ?? 0
                              : comboProgress?.lesson_count ?? 0;
                          return (
                            <div
                              key={item.key}
                              className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                            >
                              <p className="text-[10px] uppercase tracking-[0.35em] text-[#fdd87c]">
                                {item.label}
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-white">
                                {count}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {[
                      {
                        key: 'quick',
                        title: t('dashboard.comboQuick'),
                        xp: comboMeta?.quick?.xp ?? 13,
                        completed: comboMeta?.quick?.completed ?? false,
                        requirements: { glossary: 0, blog: 1, lesson: 1 },
                      },
                      {
                        key: 'base',
                        title: t('dashboard.comboBase'),
                        xp: comboMeta?.base?.xp ?? 21,
                        completed: comboMeta?.base?.completed ?? false,
                        requirements: { glossary: 2, blog: 1, lesson: 1 },
                      },
                      {
                        key: 'serious',
                        title: t('dashboard.comboSerious'),
                        xp: comboMeta?.serious?.xp ?? 47,
                        completed: comboMeta?.serious?.completed ?? false,
                        requirements: { glossary: 5, blog: 2, lesson: 2 },
                      },
                    ].map((route) => (
                      <div
                        key={route.key}
                        className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.4em] text-[#fdd87c]">
                              {route.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">
                              {route.completed
                                ? t('dashboard.completedMission')
                                : t('dashboard.inProgress')}
                            </p>
                          </div>
                          <Badge
                            variant={route.completed ? 'default' : 'outline'}
                            className={
                              route.completed
                                ? 'bg-emerald-500 text-emerald-50'
                                : 'border-white/20 text-slate-200'
                            }
                          >
                            {route.completed ? t('dashboard.completedMission') : `+${route.xp} XP`}
                          </Badge>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {route.requirements.glossary > 0 && (
                            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">
                                {t('dashboard.glossaryTerms')}
                              </p>
                              <p className="mt-2 text-base font-semibold text-white">
                                {Math.min(comboProgress?.glossary_count ?? 0, route.requirements.glossary)}/
                                {route.requirements.glossary}
                              </p>
                              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                                <div
                                  className="h-1.5 rounded-full bg-cyan-400"
                                  style={{
                                    width: `${Math.min(
                                      (comboProgress?.glossary_count ?? 0) /
                                        route.requirements.glossary,
                                      1,
                                    ) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {route.requirements.blog > 0 && (
                            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">
                                {t('dashboard.blogReads')}
                              </p>
                              <p className="mt-2 text-base font-semibold text-white">
                                {Math.min(comboProgress?.blog_count ?? 0, route.requirements.blog)}/
                                {route.requirements.blog}
                              </p>
                              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                                <div
                                  className="h-1.5 rounded-full bg-cyan-400"
                                  style={{
                                    width: `${Math.min(
                                      (comboProgress?.blog_count ?? 0) /
                                        route.requirements.blog,
                                      1,
                                    ) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {route.requirements.lesson > 0 && (
                            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">
                                {t('dashboard.lessons')}
                              </p>
                              <p className="mt-2 text-base font-semibold text-white">
                                {Math.min(comboProgress?.lesson_count ?? 0, route.requirements.lesson)}/
                                {route.requirements.lesson}
                              </p>
                              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                                <div
                                  className="h-1.5 rounded-full bg-cyan-400"
                                  style={{
                                    width: `${Math.min(
                                      (comboProgress?.lesson_count ?? 0) /
                                        route.requirements.lesson,
                                      1,
                                    ) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020c18] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="rounded-lg bg-cyan-500/10 p-2">
                    <Award className="h-5 w-5 text-cyan-400" />
                  </div>
                  {t('dashboard.unlockedFeatures')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { threshold: 0, label: t('dashboard.basicCourses') },
                    { threshold: 99, label: `${t('dashboard.profileEditing')} (99 XP)` },
                    { threshold: 369, label: `${t('dashboard.privateCommentsAccess')} (369 XP)` },
                    { threshold: 3333, label: `${t('dashboard.hallOfFame')} (3333 XP)` },
                  ].map((item) => {
                    const unlocked = xpTotal >= item.threshold;
                    return (
                      <div key={item.threshold} className="flex items-center gap-3">
                        {unlocked ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-white/20" />
                        )}
                        <span
                          className={
                            unlocked ? 'text-sm text-slate-100' : 'text-sm text-slate-500'
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* HISTÓRICO DE XP */}
          <Card className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]">
            <CardHeader>
              <CardTitle className="text-white">
                {t('dashboard.recentXpActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!xpHistory || xpHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="mx-auto mb-3 h-12 w-12 text-slate-500" />
                  <p className="text-slate-300">
                    {t('dashboard.noActivityYet')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {xpHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {tx.reference_label || tx.action}
                        </p>
                        {tx.reference_label && (
                          <p className="text-xs text-slate-400">
                            {tx.action}
                          </p>
                        )}
                        <p className="text-sm text-slate-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="border border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                        +{tx.xp_earned} XP
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
