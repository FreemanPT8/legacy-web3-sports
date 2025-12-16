'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Target, Trophy } from 'lucide-react';

type MissionProgress = {
  progress: number;
  completed: boolean;
  completed_at?: string | null;
};

type MissionWithProgress = {
  id: string;
  type: string;
  description: string;
  xp_reward: number;
  target_count: number;
  user_missions?: MissionProgress | null;
};

export default function AdminMissionsPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [missions, setMissions] = useState<MissionWithProgress[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  const fetchMissions = useCallback(async () => {
    if (!user) return;
    setLoadingMissions(true);
    try {
      const response = await fetch(
        `/api/missions/generate?userId=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load missions.');
      }
      setMissions(Array.isArray(data.missions) ? data.missions : []);
      setError(null);
    } catch (err: any) {
      console.error('Admin missions fetch error', err);
      setError(err?.message || 'Failed to load missions.');
      setMissions([]);
    } finally {
      setLoadingMissions(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchMissions();
    }
  }, [isAdmin, fetchMissions]);

  const stats = useMemo(() => {
    if (!missions.length) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        xpPotential: 0,
        xpCompleted: 0,
        avgProgress: 0,
      };
    }
    const completed = missions.filter(
      (mission) => mission.user_missions?.completed,
    ).length;
    const xpPotential = missions.reduce(
      (sum, mission) => sum + (mission.xp_reward || 0),
      0,
    );
    const xpCompleted = missions.reduce((sum, mission) => {
      const isDone = mission.user_missions?.completed;
      return sum + (isDone ? mission.xp_reward || 0 : 0);
    }, 0);
    const avgProgress =
      missions.reduce((sum, mission) => {
        const target = mission.target_count || 1;
        const progress = mission.user_missions?.progress ?? 0;
        return (
          sum + Math.min(100, Math.round((progress / target) * 100 || 0))
        );
      }, 0) / missions.length;

    return {
      total: missions.length,
      completed,
      pending: missions.length - completed,
      xpPotential,
      xpCompleted,
      avgProgress: Math.round(avgProgress),
    };
  }, [missions]);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/missions/generate', {
        method: 'POST',
        headers,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to generate missions.');
      }
      toast({
        title: 'Missions updated',
        description: payload.message || 'New missions generated for today.',
      });
      fetchMissions();
    } catch (err: any) {
      console.error('Generate missions error', err);
      toast({
        title: 'Error',
        description: err?.message || 'Could not generate missions.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }, [generating, getToken, fetchMissions, toast]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          Loading missions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000c12] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#05212b] px-6 py-8 shadow-2xl shadow-black/40">
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
              LEGACY ADMIN
            </p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Daily Missions Control
            </h1>
            <p className="text-sm text-slate-300 md:text-base max-w-3xl">
              Supervisiona as missoes diarias, gera novos desafios e acompanha a
              execucao em tempo real para toda a comunidade.
            </p>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                className="gap-2"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                Generate missions
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-white/30 text-white hover:text-cyan-300"
                onClick={fetchMissions}
                disabled={loadingMissions}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh list
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Total missions', value: stats.total },
            { label: 'Completed', value: stats.completed },
            { label: 'Pending', value: stats.pending },
            { label: 'XP potential', value: stats.xpPotential },
            { label: 'XP completed', value: stats.xpCompleted },
            { label: 'Avg progress', value: `${stats.avgProgress}%` },
          ].map((item) => (
            <Card
              key={item.label}
              className="border border-white/10 bg-[#05212b] p-4 shadow-sm shadow-black/30"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="border border-white/20 bg-transparent text-cyan-300">
                  Reports
                </Badge>
                <CardTitle className="text-white">
                  Mission performance
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-300">
                Monitor the daily progress of each mission and how much XP is
                unlocked.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    <th className="py-3 pr-4">Mission</th>
                    <th className="py-3 pr-4">XP</th>
                    <th className="py-3 pr-4">Progress</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.length === 0 && !loadingMissions ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-slate-400"
                      >
                        No missions available today.
                      </td>
                    </tr>
                  ) : (
                    missions.map((mission) => {
                      const progress = mission.user_missions?.progress ?? 0;
                      const target = mission.target_count || 1;
                      const percent = Math.min(
                        100,
                        Math.round((progress / target) * 100),
                      );
                      const completed = mission.user_missions?.completed;
                      return (
                        <tr
                          key={mission.id}
                          className="border-t border-white/5 text-sm"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">
                                {mission.description}
                              </span>
                              <span className="text-xs text-slate-400">
                                {mission.type}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{mission.xp_reward} XP</td>
                          <td className="py-3 pr-4">
                            <div className="w-full">
                              <div className="h-2 rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-cyan-400"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-slate-400">
                                {progress} / {target}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              className={`border border-white/20 bg-transparent ${
                                completed
                                  ? 'text-emerald-300'
                                  : 'text-amber-300'
                              }`}
                            >
                              {completed ? 'Completed' : 'In progress'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold">Mission queue</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(loadingMissions ? Array.from({ length: 3 }) : missions).map(
              (mission, index) => (
                <Card
                  key={mission?.id || index}
                  className="border border-white/10 bg-[#05212b] p-5 shadow-sm shadow-black/30"
                >
                  {mission ? (
                    <>
                      <Badge className="border border-white/20 bg-transparent text-cyan-300">
                        {mission.type.replace(/_/g, ' ')}
                      </Badge>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {mission.description}
                      </h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Reward: {mission.xp_reward} XP
                      </p>
                      <p className="text-sm text-slate-400">
                        Target: {mission.target_count || 1}
                      </p>
                    </>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-slate-400">
                      Loading...
                    </div>
                  )}
                </Card>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
