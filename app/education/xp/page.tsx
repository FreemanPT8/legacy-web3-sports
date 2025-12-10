import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import {
  CalendarCheck,
  Flame,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';

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
};

const heroHighlights = [
  {
    label: 'Limite diário global',
    value: '369 XP',
    detail:
      'Só este valor pode ser somado num dia útil. Depois disso, o conteúdo permanece aberto, mas o XP não acumula.',
    icon: ShieldCheck,
  },
  {
    label: '7 dias consecutivos com XP ganho',
    value: '222 XP',
    detail:
      'Streak curto: exige XP confirmado todos os dias. Login não basta; faltar um dia reinicia a contagem.',
    icon: Flame,
  },
  {
    label: '30 dias consecutivos com XP ganho',
    value: '1.111 XP',
    detail:
      'Streak longo: recompensa quem mantém XP real todos os dias durante 30 dias consecutivos.',
    icon: CalendarCheck,
  },
];

const levelFormula = 'Nível = XP total ÷ 100 (arredondado para baixo)';

const rewardMetadata: Record<string, { title: string; creatorBonus?: string }> = {
  lesson_complete: {
    title: 'Lesson Complete',
    creatorBonus: '+19% quando outros leem — crédito exclusivo para criadores.',
  },
  blog_read: {
    title: 'Blog Read',
    creatorBonus: '+19% quando outros leem — crédito exclusivo para criadores.',
  },
  profile_complete: {
    title: 'Profile Complete',
  },
  forum_post: {
    title: 'Forum Post',
  },
  forum_topic: {
    title: 'Forum Topic',
  },
  forum_comment: {
    title: 'Forum Comment',
    creatorBonus: '+0.5% quando outros leem — crédito exclusivo para criadores.',
  },
  mission_daily: {
    title: 'Mission Daily',
  },
};

async function fetchEducationXpData() {
  const rewardsPromise = supabase.from('xp_rewards').select('*');
  const limitsPromise = supabase.from('xp_daily_limits').select('*');
  const thresholdsPromise = supabase
    .from('xp_thresholds')
    .select('*')
    .order('xp_total', { ascending: true });

  const [rewards, limits, thresholds] = await Promise.all([
    rewardsPromise,
    limitsPromise,
    thresholdsPromise,
  ]);

  if (rewards.error || limits.error || thresholds.error) {
    const message =
      rewards.error?.message ||
      limits.error?.message ||
      thresholds.error?.message ||
      'Falha ao carregar o modelo de XP.';
    throw new Error(message);
  }

  return {
    rewards: rewards.data || [],
    limits: limits.data || [],
    thresholds: thresholds.data || [],
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
      error instanceof Error
        ? error.message
        : 'Erro desconhecido ao carregar os metadados oficiais.';
  }

  const rewardTable = xpData?.rewards ?? [];
  const visibleRewards = rewardTable.filter(
    (reward) => !['streak_7', 'streak_30'].includes(reward.action_type),
  );
  const limitTable = xpData?.limits ?? [];
  const thresholdTable = xpData?.thresholds ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 space-y-10 max-w-5xl">
          <section className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-900/90 px-6 py-10 shadow-xl shadow-slate-950/60">
            <div className="space-y-4">
              <Badge className="bg-sky-500/10 text-sky-200 border border-sky-400/40">
                Legacy XP • Sistema oficial
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-white">XP da Legacy</h1>
              <p className="text-base text-slate-300">
                O Legacy recompensa aprendizagem, criação e participação real. O modelo completo
                está documentado aqui e explica, passo a passo, como cada ação é creditada.
              </p>
              <p className="text-sm text-slate-400">
                Nenhum XP é creditado apenas pelo login; é preciso ganhar crédito legítimo
                completando lições, lendo posts ou contribuindo no fórum.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {heroHighlights.map((highlight) => {
                const Icon = highlight.icon;
                return (
                  <Card
                    key={highlight.label}
                    className="flex flex-col bg-slate-900/80 border border-slate-800 shadow-lg shadow-slate-950/40 transition hover:-translate-y-0.5 hover:border-sky-500/60"
                  >
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        <Icon className="h-4 w-4 text-sky-300" />
                        {highlight.label}
                      </div>
                      <p className="text-2xl font-bold text-white">{highlight.value}</p>
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
                  Não conseguimos carregar os dados oficiais agora: {fetchError}
                </p>
                <p className="text-xs text-rose-300">
                  Confirme se as variáveis de ambiente estão definidas ou tente novamente.
                </p>
              </CardContent>
            </Card>
          )}

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Recompensas
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Cada ação devolve um intervalo oficial de XP
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleRewards.length === 0 ? (
                <Card className="bg-slate-900/70 border border-slate-800/80">
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Nenhuma regra de recompensa foi publicada ainda.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                visibleRewards.map((reward) => {
                  const range =
                    reward.min_xp === reward.max_xp
                      ? `${reward.min_xp ?? 0} XP`
                      : `${reward.min_xp ?? 0} - ${reward.max_xp ?? 0} XP`;
                  const meta = rewardMetadata[reward.action_type];
                  const title =
                    meta?.title ||
                    reward.action_type
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (char) => char.toUpperCase());
                  return (
                    <Card
                      key={reward.action_type}
                      className="bg-slate-900/80 border border-slate-800/90 transition hover:border-sky-500/60 hover:-translate-y-0.5"
                    >
                      <CardContent className="space-y-3 text-sm text-slate-300">
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-white">{title}</h3>
                            <p className="text-xs text-slate-400">Intervalo oficial</p>
                          </div>
                          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                            {range}
                          </span>
                        </div>
                        {(meta?.creatorBonus || reward.creator_bonus_pct) && (
                          <p className="text-xs text-slate-400">
                            {meta?.creatorBonus ||
                              `+${reward.creator_bonus_pct}% quando outros leem — crédito exclusivo para criadores.`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          <section className="grid md:grid-cols-1 gap-5">
            <Card className="bg-slate-900/70 border border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-slate-100">Streaks & consistência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                    Mantemos a chama acesa
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>Ganhar XP todos os dias é obrigatório para manter um streak.</li>
                    <li>Streak de 7 dias rende 222 XP; streak de 30 dias rende 1.111 XP.</li>
                    <li>Faltar um dia quebra o streak e reinicia a contagem.</li>
                    <li>
                      Lesson completions e blog reads garantem que o XP só aparece uma vez por conteúdo
                      e impedem criadores de ganhar XP lendo o próprio material.
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Última ação registada
                      </p>
                      <p className="text-sm text-slate-400">
                        Autentique-se no painel admin para acompanhar o histórico em tempo real.
                      </p>
                    </div>
                    <Sparkles className="h-6 w-6 text-amber-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Notificações via Resend são disparadas quando os streaks de 7 ou 30 dias são concluídos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">
                Progressão e thresholds
              </p>
              <h2 className="text-2xl font-bold text-white">
                Cada milestone desbloqueia acesso extra
              </h2>
              <p className="text-sm text-slate-400">
                O XP total determina privilégios, reputação e desbloqueios. Veja os thresholds oficiais abaixo.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {thresholdTable.length === 0 ? (
                <Card className="bg-slate-900/70 border border-slate-800/80">
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Ainda não há thresholds publicados. A equipa admin pode adicioná-los no painel /admin/xp.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                thresholdTable.map((threshold) => (
                  <Card
                    key={`${threshold.xp_total}-${threshold.feature_name}`}
                    className="bg-slate-900/80 border border-slate-800/80"
                  >
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">{threshold.xp_total} XP</span>
                        <Badge variant="outline" className="text-slate-200 border-slate-700">
                          Desbloqueia
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-white">{threshold.feature_name}</p>
                      {threshold.description && (
                        <p className="text-sm text-slate-400">{threshold.description}</p>
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
                  <p>{levelFormula}, também mostrando o progresso restante rumo ao próximo nível.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-emerald-300" />
                  <p>O ranking global usa xp_transactions para alimentar desafios e gamificação.</p>
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
