'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Target,
  Flame,
  TrendingUp,
  Award,
  CheckCircle2,
} from 'lucide-react';

const DAILY_XP_LIMIT = 369;

type XPSummary = {
  xp_total: number;
  xp_today: number;
  xp_last_7_days: number;
  xp_last_30_days: number;
  streak_count: number;
  streak_updated_at: string | null;
  streak_long_count: number;
  streak_long_updated_at: string | null;
  recent_transactions: {
    id: string;
    action: string;
    xp_earned: number;
    created_at: string;
  }[];
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

  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null);
  const [xpLoading, setXpLoading] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);

  const [missions, setMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  const [streak, setStreak] = useState(0);
  const [longStreak, setLongStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

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
  }, [user, loading, router]);

  // 🔹 MISSÕES
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

  // 🔹 STREAK
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
        setStreak(data.newStreak);
        if (typeof data.longStreak === 'number') {
          setLongStreak(data.longStreak);
        }
      }
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }, [user]);

  // 🔹 GLOBAL RANK
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

  // 🔹 RESUMO DE XP
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

      const xpData = data.xp as XPSummary;
      setXpSummary(xpData);
      setLongStreak(xpData.streak_long_count ?? 0);

      if (typeof xpData.streak_count === 'number' && xpData.streak_count > 0) {
        setStreak(xpData.streak_count);
      }
    } catch (error) {
      console.error('Failed to fetch XP summary:', error);
      setXpError('Falha ao carregar XP');
    } finally {
      setXpLoading(false);
    }
  }, [user, getToken]);

  // 🔹 Efeito principal
  useEffect(() => {
    if (user) {
      fetchMissions();
      updateStreak();
      fetchGlobalRank();
      fetchXpSummary();
    }
  }, [user, fetchMissions, updateStreak, fetchGlobalRank, fetchXpSummary]);

  // ------- DERIVADOS DE XP -----

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

  // ------------- LOADING --------------

  if (loading || !user || !mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto" />
            <p className="mt-4 text-slate-300">A carregar...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ------------- PAGE --------------

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-50">
              {t('dashboard.welcomeBack').replace('{username}', user.username)}
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              {t('dashboard.trackProgress')}
            </p>

            {xpError && (
              <p className="mt-2 text-sm text-red-400">{xpError}</p>
            )}
          </div>

          {/* RESUMO RÁPIDO DE XP / STREAK / RANK */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* XP TOTAL */}
            <Card className="bg-slate-900/80 border border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {t('dashboard.totalXp')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Trophy className="h-10 w-10 text-sky-400" />
                  <div>
                    <div className="text-3xl font-bold text-slate-50">
                      {xpLoading && !xpSummary ? '...' : xpTotal}
                    </div>
                    <p className="text-sm text-slate-400">
                      {t('dashboard.level')} {level}
                    </p>
                  </div>
                </div>

                {/* Progresso de nível */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">
                      {t('dashboard.nextLevel')}
                    </span>
                    <span className="font-medium text-slate-100">
                      {xpProgress}/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>

                {/* XP diário */}
                <div className="mt-5 border-t border-slate-800 pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">XP ganho hoje</span>
                    <span className="font-semibold text-slate-100">
                      {todayXp} / {DAILY_XP_LIMIT}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
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
            <Card className="bg-slate-900/80 border border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {t('dashboard.currentStreak')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Flame className="h-10 w-10 text-orange-500" />
                  <div>
                    <div className="text-3xl font-bold text-slate-50">
                      {streak}
                    </div>
                    <p className="text-sm text-slate-400">
                      {t('dashboard.days')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-300">
                    {t('dashboard.keepLearning')}
                  </p>
                  <p className="text-xs text-sky-400 mt-1">
                    {t('dashboard.bonusAt7Days')}
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-300">
                      {t('dashboard.longStreakLabel')} {longStreak}/30
                    </p>
                    <p className="text-slate-400">
                      {t('dashboard.longStreakTooltip')}
                    </p>
                    <p className="text-sky-400">{t('dashboard.bonusAt30Days')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GLOBAL RANK */}
            <Card className="bg-slate-900/80 border border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {t('dashboard.globalRank')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-10 w-10 text-emerald-400" />
                  <div>
                    <div className="text-3xl font-bold text-slate-50">
                      {loadingRank
                        ? '...'
                        : globalRank?.rank
                        ? `#${globalRank.rank}`
                        : '-'}
                    </div>
                    <p className="text-sm text-slate-400">
                      {globalRank?.rank
                        ? `Among ${globalRank.totalUsers} active learners`
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
          </div>

          {/* MISSÕES + FEATURES DESBLOQUEADAS */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* MISSÕES */}
            <Card className="bg-slate-900/80 border border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-50">
                  <Target className="h-5 w-5 text-sky-400" />
                  {t('dashboard.dailyMissions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMissions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto" />
                    <p className="mt-2 text-sm text-slate-300">
                      {t('dashboard.loadingMissions')}
                    </p>
                  </div>
                ) : missions.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-300">
                      {t('dashboard.noMissionsToday')}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
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
                          className={`flex items-center justify-between p-4 rounded-lg border border-slate-800 ${
                            completed
                              ? 'bg-emerald-950/40'
                              : 'bg-slate-900/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {completed && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  completed
                                    ? 'text-emerald-200'
                                    : 'text-slate-100'
                                }`}
                              >
                                {mission.description}
                              </p>
                              <p className="text-sm text-slate-400">
                                {progress}/{mission.target_count}{' '}
                                {t('dashboard.completed')}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={completed ? 'default' : 'outline'}
                            className={
                              completed
                                ? 'bg-emerald-400 text-emerald-950 border-emerald-300'
                                : 'border-slate-600 text-slate-200'
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

            {/* FEATURES DESBLOQUEADAS */}
            <Card className="bg-slate-900/80 border border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-50">
                  <div className="p-2 bg-sky-500/10 rounded-lg">
                    <Award className="h-5 w-5 text-sky-300" />
                  </div>
                  {t('dashboard.unlockedFeatures')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-slate-200">
                      {t('dashboard.basicCourses')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {xpTotal >= 99 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
                    )}
                    <span
                      className={
                        xpTotal >= 99 ? 'text-slate-200' : 'text-slate-500'
                      }
                    >
                      {t('dashboard.profileEditing')} (99 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {xpTotal >= 369 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
                    )}
                    <span
                      className={
                        xpTotal >= 369 ? 'text-slate-200' : 'text-slate-500'
                      }
                    >
                      {t('dashboard.forumReadAccess')} (369 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {xpTotal >= 444 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
                    )}
                    <span
                      className={
                        xpTotal >= 444 ? 'text-slate-200' : 'text-slate-500'
                      }
                    >
                      {t('dashboard.forumInteract')} (444 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {xpTotal >= 555 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
                    )}
                    <span
                      className={
                        xpTotal >= 555 ? 'text-slate-200' : 'text-slate-500'
                      }
                    >
                      {t('dashboard.forumPostCreate')} (555 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {xpTotal >= 3333 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
                    )}
                    <span
                      className={
                        xpTotal >= 3333 ? 'text-slate-200' : 'text-slate-500'
                      }
                    >
                      {t('dashboard.hallOfFame')} (3333 XP)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HISTÓRICO DE XP */}
          <Card className="bg-slate-900/80 border border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-50">
                {t('dashboard.recentXpActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!xpHistory || xpHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-300">
                    {t('dashboard.noActivityYet')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {xpHistory.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800"
                    >
                      <div>
                        <p className="font-medium text-slate-100">
                          {tx.action}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-sky-500 text-slate-950">
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
