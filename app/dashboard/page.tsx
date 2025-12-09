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

  // 🔹 STREAK (continua a usar /api/streak/update porque pode dar bónus)
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

  // 🔹 NOVO: carregar resumo de XP + histórico a partir de /api/me/xp
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

      // Se o streak vier daqui e for maior, sincronizamos o estado local
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

  // ------- DERIVADOS DE XP (sempre que possível a partir de xpSummary) -----

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

    // fallback: calcula a partir de xpHistory (caso falhe xpSummary)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            A carregar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {t('dashboard.welcomeBack').replace(
                '{username}',
                user.username,
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('dashboard.trackProgress')}
            </p>

            {xpError && (
              <p className="mt-2 text-sm text-red-600">{xpError}</p>
            )}
          </div>

          {/* RESUMO RÁPIDO DE XP / STREAK / RANK */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* XP TOTAL + HOJE + LIMITES */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.totalXp')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Trophy className="h-10 w-10 text-blue-600" />
                  <div>
                    <div className="text-3xl font-bold">
                      {xpLoading && !xpSummary ? '...' : xpTotal}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('dashboard.level')} {level}
                    </p>
                  </div>
                </div>

                {/* Progresso global de nível */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">
                      {t('dashboard.nextLevel')}
                    </span>
                    <span className="font-medium">
                      {xpProgress}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>

                {/* 🔥 Bloco de XP diário / limite */}
                <div className="mt-5 border-t pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300">
                      XP ganho hoje
                    </span>
                    <span className="font-semibold">
                      {todayXp} / {DAILY_XP_LIMIT}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        todayXp >= DAILY_XP_LIMIT
                          ? 'bg-amber-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${todayLimitProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    {todayXp >= DAILY_XP_LIMIT
                      ? 'Atingiste o limite diário de XP. Podes continuar a estudar, mas sem ganhar mais XP hoje.'
                      : `Ainda podes ganhar até ${remainingTodayXp} XP hoje.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* STREAK */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.currentStreak')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Flame className="h-10 w-10 text-orange-500" />
                  <div>
                    <div className="text-3xl font-bold">{streak}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('dashboard.days')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('dashboard.keepLearning')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {t('dashboard.bonusAt7Days')}
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('dashboard.longStreakLabel')} {longStreak}/30
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('dashboard.longStreakTooltip')}
                    </p>
                    <p className="text-blue-600">{t('dashboard.bonusAt30Days')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GLOBAL RANK */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('dashboard.globalRank')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-10 w-10 text-green-600" />
                  <div>
                    <div className="text-3xl font-bold">
                      {loadingRank
                        ? '...'
                        : globalRank?.rank
                        ? `#${globalRank.rank}`
                        : '-'}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {globalRank?.rank
                        ? `Among ${globalRank.totalUsers} active learners`
                        : t('dashboard.unranked')}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('dashboard.earnMoreXp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MISSÕES + FEATURES DESBLOQUEADAS */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  {t('dashboard.dailyMissions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMissions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {t('dashboard.loadingMissions')}
                    </p>
                  </div>
                ) : missions.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('dashboard.noMissionsToday')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('dashboard.checkBackTomorrow')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {missions.map((mission: any) => {
                      const missionData = Array.isArray(
                        mission.user_missions,
                      )
                        ? mission.user_missions[0]
                        : mission.user_missions;
                      const progress = missionData?.progress || 0;
                      const completed = missionData?.completed || false;
                      return (
                        <div
                          key={mission.id}
                          className={`flex items-center justify-between p-4 rounded-lg ${
                            completed
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {completed && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  completed ? 'text-green-900' : ''
                                }`}
                              >
                                {mission.description}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {progress}/{mission.target_count}{' '}
                                {t('dashboard.completed')}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={completed ? 'default' : 'outline'}
                            className={completed ? 'bg-green-600' : ''}
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {t('dashboard.unlockedFeatures')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {t('dashboard.basicCourses')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xpTotal >= 99 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        xpTotal >= 99 ? 'text-gray-700' : 'text-gray-400'
                      }
                    >
                      {t('dashboard.profileEditing')} (99 XP)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xpTotal >= 369 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        xpTotal >= 369 ? 'text-gray-700' : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumReadAccess')} (369 XP)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xpTotal >= 444 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        xpTotal >= 444 ? 'text-gray-700' : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumInteract')} (444 XP)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xpTotal >= 555 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        xpTotal >= 555 ? 'text-gray-700' : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumPostCreate')} (555 XP)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {xpTotal >= 3333 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        xpTotal >= 3333 ? 'text-gray-700' : 'text-gray-400'
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
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentXpActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!xpHistory || xpHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('dashboard.noActivityYet')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {xpHistory.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{tx.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-blue-600">
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
