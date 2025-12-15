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
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DAILY_XP_LIMIT = 369;

type XpTransaction = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
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
      const response = await fetch(`/api/missions/generate?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
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
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
              LEGACY XP
            </p>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              {t('dashboard.welcomeBack').replace('{username}', user.username)}
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              {t('dashboard.trackProgress')}
            </p>
            {xpError && (
              <p className="text-sm text-rose-400">{xpError}</p>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {/* XP TOTAL + HOJE + LIMITE */}
            <Card className="border border-white/10 bg-[#05212b]">
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
            <Card className="border border-white/10 bg-[#05212b]">
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
            <Card className="border border-white/10 bg-[#05212b]">
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
            <Card className="border border-white/10 bg-[#000c12]">
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
                ) : missions.length === 0 ? (
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
                    {missions.map((mission: any) => {
                      const missionData = Array.isArray(mission.user_missions)
                        ? mission.user_missions[0]
                        : mission.user_missions;
                      const progress = missionData?.progress || 0;
                      const completed = missionData?.completed || false;

                      return (
                        <div
                          key={mission.id}
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            completed
                              ? 'border-emerald-500/60 bg-emerald-500/10'
                              : 'border-white/10 bg-[#000c12]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {completed && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  completed ? 'text-emerald-300' : 'text-white'
                                }`}
                              >
                                {mission.description}
                              </p>
                              <p className="text-sm text-slate-300">
                                {progress}/{mission.target_count}{' '}
                                {t('dashboard.completed')}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={completed ? 'default' : 'outline'}
                            className={
                              completed
                                ? 'bg-emerald-500 text-emerald-50'
                                : 'border-white/20 text-slate-200'
                            }
                          >
                            {completed
                              ? t('dashboard.completedMission')
                              : `+${mission.xp_reward} XP`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#05212b]">
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
                    { threshold: 369, label: `${t('dashboard.forumReadAccess')} (369 XP)` },
                    { threshold: 444, label: `${t('dashboard.forumInteract')} (444 XP)` },
                    { threshold: 555, label: `${t('dashboard.forumPostCreate')} (555 XP)` },
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
          <Card className="border border-white/10 bg-[#000c12]">
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
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#000c12] p-4"
                    >
                      <div>
                        <p className="font-medium text-white">{tx.action}</p>
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
