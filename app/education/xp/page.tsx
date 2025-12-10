import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  Flame,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';

const APOLLO_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

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
  streak: {
    action: string;
    latestXp: number;
  } | null;
};

async function fetchEducationXpData() {
  const res = await fetch(`${APOLLO_APP_URL}/api/education/xp`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      payload?.error || `Recebi ${res.status} ao carregar XP oficial.`,
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    error?: string;
    rewards: XpReward[];
    limits: XpLimit[];
    thresholds: XpThreshold[];
    streak?: EducationXpData['streak'];
  };

  if (!data.success) {
    throw new Error(data.error || 'Falha ao carregar os dados de XP.');
  }

  return {
    rewards: data.rewards || [],
    limits: data.limits || [],
    thresholds: data.thresholds || [],
    streak: data.streak || null,
  } satisfies EducationXpData;
}

export default async function EducationXpPage() {
  let xpData: EducationXpData | null = null;
  let fetchError: string | null = null;

  try {
    xpData = await fetchEducationXpData();
  } catch (error) {
    console.error('/education/xp falha ao buscar dados', error);
    fetchError =
      error instanceof Error ? error.message : 'Erro desconhecido ao carregar XP.';
  }

  const rewardTable = xpData?.rewards ?? [];
  const limitTable = xpData?.limits ?? [];
  const thresholdTable = xpData?.thresholds ?? [];

  const heroHighlights = [
    {
      label: 'Limite diário global',
      value: '369 XP',
      detail:
        'É o teto de XP que um membro pode ganhar num só dia. A partir daí, o conteúdo continua disponível mas sem crédito adicional.',
      icon: ShieldCheck,
    },
    {
      label: 'Streak curto (7 dias)',
      value: '222 XP',
      detail:
        'Para completar o streak, o utilizador tem de ganhar XP todos os dias (não basta fazer login).',
      icon: Flame,
    },
    {
      label: 'Streak longo (30 dias)',
      value: '1.111 XP',
      detail:
        'Mantém a consistência por 30 dias seguidos de XP diário e recebe uma recompensa premium.',
      icon: CalendarCheck,
    },
  ];

  const levelFormula = 'Nível = XP total ÷ 100 (arredondado para baixo)';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 space-y-12 max-w-6xl">
          <section className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-900/90 px-6 py-10 shadow-xl shadow-slate-900/60">
            <div className="max-w-3xl space-y-4">
              <Badge className="bg-sky-500/10 text-sky-200 border border-sky-400/40">
                Legacy XP • Sistema oficial
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                XP da Legacy
              </h1>
              <p className="text-base text-slate-300">
                Aprenda como o XP recompensa aprendizado, criação e participação.
                Os limites, streaks e thresholds descritos aqui são mantidos em
                base de dados e podem ser geridos por admins autorizados via{' '}
                <span className="text-sky-300 font-semibold">
                  /admin/xp
                </span>
                .
              </p>
              <p className="text-sm text-slate-400">
                Não há XP por simples login: é necessário ganhar crédito
                legítimo, seja lendo um blog, completando uma lição ou
                participando no fórum.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {heroHighlights.map((highlight) => {
                const Icon = highlight.icon;
                return (
                  <Card
                    key={highlight.label}
                    className="bg-slate-900/80 border border-slate-800 shadow-lg shadow-sky-900/30"
                  >
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Icon className="h-4 w-4 text-sky-300" />
                        {highlight.label}
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {highlight.value}
                      </p>
                      <p className="text-sm text-slate-400">{highlight.detail}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {fetchError && (
            <Card className="bg-rose-950/80 border border-rose-600">
              <CardContent>
                <p className="text-sm text-rose-200">
                  Não conseguimos carregar os metadados oficiais agora.{' '}
                  {fetchError}
                </p>
              </CardContent>
            </Card>
          )}

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Recompensas
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Cada ação tem um intervalo oficial
                </h2>
              </div>
              <Badge variant="outline" className="text-slate-100 border-slate-700">
                Baseado em XP_rewards
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {rewardTable.length === 0 ? (
                <Card className="bg-slate-900/70 border border-slate-800/80">
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Ainda não existem regras de recompensa configuradas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                rewardTable.map((reward) => {
                  const range =
                    reward.min_xp === reward.max_xp
                      ? `${reward.min_xp ?? 0} XP`
                      : `${reward.min_xp ?? 0} - ${reward.max_xp ?? 0} XP`;
                  return (
                    <Card
                      key={reward.action_type}
                      className="bg-slate-900/80 border border-slate-800/90"
                    >
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm font-semibold text-slate-100">
                          {reward.action_type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-slate-300">
                        <div>
                          <p className="text-xs text-slate-500 uppercase">
                            XP ganho por ação
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {range}
                          </p>
                        </div>
                        {typeof reward.creator_bonus_pct === 'number' && (
                          <div className="flex items-center justify-between w-full text-slate-400 text-xs">
                            <span>Bónus do criador</span>
                            <span className="text-white">
                              +{reward.creator_bonus_pct}% pelo alcance
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/70 border border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-slate-100">Limites diários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p className="text-xs text-slate-500">
                  Para evitar farming, cada ação possui teto de XP e contagem.
                </p>
                {limitTable.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nenhum limite definido. O admin pode configurar via
                    /admin/xp.
                  </p>
                ) : (
                  limitTable.map((limit) => (
                    <div
                      key={limit.action_type}
                      className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/40 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {limit.action_type}
                        </p>
                        <p className="text-xs text-slate-400">
                          Até {limit.count ?? 0} ações por dia
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-emerald-300">
                          {limit.xp_earned ?? 0} XP
                        </p>
                        <p className="text-xs text-slate-500">
                          total por limite
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-slate-100">Streaks & consistência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                    Como mantemos a chama acesa
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>
                      Ganhar XP todos os dias é obrigatório para estender qualquer
                      streak: login puro não conta.
                    </li>
                    <li>
                      Streak de 7 dias rende 222 XP, enquanto o streak de 30 dias
                      vale 1.111 XP e recomeça ao cair um único dia.
                    </li>
                    <li>
                      O backend valida cada ação via tabelas{' '}
                      <span className="text-slate-100">lesson_completions</span> e{' '}
                      <span className="text-slate-100">blog_reads</span> para evitar
                      duplicados e XP de criador lendo o próprio conteúdo.
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Última ação com XP
                      </p>
                      {xpData?.streak ? (
                        <p className="text-sm text-slate-200">
                          {xpData.streak.action} (+{xpData.streak.latestXp} XP)
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">
                          Ative o painel com creds para visualizar o histórico.
                        </p>
                      )}
                    </div>
                    <Sparkles className="h-6 w-6 text-amber-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    O servidor também envia notificações (Resend) quando um streak
                    de 7 ou 30 dias é concluído.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">
                Progressão e thresholds
              </p>
              <h2 className="text-2xl font-bold text-white">
                Cada milestone desbloqueia acesso extra
              </h2>
              <p className="text-sm text-slate-400">
                O XP total também define privilégios e reputação. Veja abaixo os
                thresholds da comunidade.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {thresholdTable.length === 0 ? (
                <Card className="bg-slate-900/70 border border-slate-800/80">
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Ainda não há thresholds publicados. Admins podem adicionar
                      esses dados via /admin/xp.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                thresholdTable.map((threshold) => (
                  <Card
                    key={threshold.xp_total + threshold.feature_name}
                    className="bg-slate-900/80 border border-slate-800/80"
                  >
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          {threshold.xp_total} XP
                        </span>
                        <Badge variant="outline" className="text-slate-200 border-slate-700">
                          Desbloqueia
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {threshold.feature_name}
                      </p>
                      {threshold.description && (
                        <p className="text-sm text-slate-400">
                          {threshold.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <Card className="bg-slate-900/80 border border-slate-800/80">
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <p>
                    Nível = XP total ÷ 100, com progresso calculado pelo resto (%) de
                    XP rumo ao próximo nível.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-emerald-300" />
                  <p>
                    O ranking global é alimentado pelas transações na tabela{' '}
                    <span className="text-slate-100">xp_transactions</span>,
                    permitindo novos desafios competitivos.
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {levelFormula}
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
