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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const [xpHistory, setXpHistory] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchMissions = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(
        `/api/missions/generate?userId=${user.id}`,
      );
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
        setStreak(data.newStreak);
      }
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }, [user]);

  const fetchXpHistory = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(
        `/api/xp/history?userId=${user.id}&limit=20`,
      );
      const data = await response.json();
      if (data.success) {
        setXpHistory(data.history || []);
      } else {
        console.error('Failed to fetch XP history:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch XP history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMissions();
      updateStreak();
      fetchXpHistory();
    }
  }, [user, fetchMissions, updateStreak, fetchXpHistory]);

  const xpProgress = useMemo(
    () => (user?.xp_total ? user.xp_total % 100 : 0),
    [user?.xp_total],
  );

  const level = useMemo(
    () => (user?.xp_total ? Math.floor(user.xp_total / 100) : 0),
    [user?.xp_total],
  );

  if (loading || !user || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
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
          {/* Título e intro */}
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
          </div>

          {/* Cards XP total, streak, rank */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                      {user.xp_total}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('dashboard.level')} {level}
                    </p>
                  </div>
                </div>
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
              </CardContent>
            </Card>

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
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('dashboard.keepLearning')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {t('dashboard.bonusAt7Days')}
                  </p>
                </div>
              </CardContent>
            </Card>

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
                    <div className="text-3xl font-bold">-</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('dashboard.unranked')}
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

          {/* Missões + funcionalidades desbloqueadas */}
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
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
                      const completed =
                        missionData?.completed || false;

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
                            variant={
                              completed ? 'default' : 'outline'
                            }
                            className={
                              completed ? 'bg-green-600' : ''
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
                    {user.xp_total >= 99 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        user.xp_total >= 99
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }
                    >
                      {t('dashboard.profileEditing')} (99 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.xp_total >= 369 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        user.xp_total >= 369
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumReadAccess')} (369 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.xp_total >= 444 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        user.xp_total >= 444
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumInteract')} (444 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.xp_total >= 555 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        user.xp_total >= 555
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }
                    >
                      {t('dashboard.forumPostCreate')} (555 XP)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.xp_total >= 3333 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={
                        user.xp_total >= 3333
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }
                    >
                      {t('dashboard.hallOfFame')} (3333 XP)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Atividade XP Recente */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('dashboard.recentXpActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {xpHistory.length === 0 ? (
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
                        <p className="font-medium">
                          {tx.action}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {new Date(
                            tx.created_at,
                          ).toLocaleString()}
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
