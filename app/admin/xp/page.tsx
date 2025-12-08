'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Award, Zap } from 'lucide-react';

const xpMetrics = [
  { label: 'XP total distribuído', value: 126_400 },
  { label: 'Novos eventos (24h)', value: 18 },
  { label: 'Criadores ativos', value: 62 },
  { label: 'XP médio por evento', value: 400 },
];

const topEarners = [
  { name: 'Marta Campos', xp: 8200, role: 'Líder de Houses' },
  { name: 'Thiago Dias', xp: 7100, role: 'Mentor de Projetos' },
  { name: 'LEGACY Crew', xp: 6600, role: 'Operações' },
];

const rewardStreams = [
  { label: 'Cursos', xp: 54_200 },
  { label: 'Blog & News', xp: 21_800 },
  { label: 'Houses', xp: 28_500 },
  { label: 'Experiências & Lives', xp: 21_900 },
];

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-xs uppercase text-muted-custom">{label}</p>
    <p className="text-3xl font-semibold text-heading">
      {value.toLocaleString('pt-PT')}
    </p>
  </div>
);

export default function AdminXpPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar XP...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin ƒ?" XP
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-300" />
            XP Control Room
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Monitora como XP circula, premia quem importa e detecta fluxos críticos.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Métricas principais
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Um painel rápido de onde o XP reage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {xpMetrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-400" />
                Top creators da semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topEarners.map((creator) => (
                <div
                  key={creator.name}
                  className="flex items-center justify-between border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {creator.name}
                    </p>
                    <p className="text-xs text-muted-custom">{creator.role}</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {creator.xp.toLocaleString('pt-PT')} XP
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Fluxos de recompensa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rewardStreams.map((stream) => (
                <div
                  key={stream.label}
                  className="flex items-center justify-between border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                >
                  <p className="text-sm text-muted-custom">{stream.label}</p>
                  <Badge variant="outline">
                    {stream.xp.toLocaleString('pt-PT')} XP
                  </Badge>
                </div>
              ))}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/admin')}
              >
                Revisitar métricas gerais
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
