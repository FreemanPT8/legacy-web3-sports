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
  Target,
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

const levelFormula = 'Nível = XP total / 100 (arredondado para baixo)';

const rewardMetadata: Record<string, { title: string; creatorBonus?: string }> = {
  lesson_complete: {
    title: 'Lição concluída',
    creatorBonus: '+19% quando outros completam a tua lição — crédito exclusivo para criadores.',
  },
  blog_read: {
    title: 'Artigo lido',
    creatorBonus: '+19% quando outros leem o teu artigo — crédito exclusivo para criadores.',
  },
  profile_complete: {
    title: 'Perfil completo',
  },
  forum_post: {
    title: 'Publicação no fórum',
  },
  forum_topic: {
    title: 'Tópico no fórum',
  },
  forum_comment: {
    title: 'Comentário no fórum',
    creatorBonus:
      '+0.5% quando outros interagem com o teu comentário — crédito exclusivo para criadores.',
  },
  mission_daily: {
    title: 'Missão diária',
  },
};

async function fetchEducationXpData(): Promise<EducationXpData> {
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
  };
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
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 space-y-10 max-w-6xl">
          {/* Hero */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-12 shadow-2xl shadow-black/40">
            <div className="grid gap-10 lg:grid-cols-[1.15fr,0.85fr] items-center">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">XP SYSTEM</p>
                  <h1 className="text-4xl font-semibold text-white md:text-5xl">XP do Legacy</h1>
                  <p className="text-base text-slate-100/90 leading-relaxed">
                    O Legacy recompensa aprendizagem, criação e participação real. O modelo completo
                    está documentado aqui e explica, passo a passo, como cada ação é creditada.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Nenhum XP é creditado apenas pelo login; é preciso ganhar crédito legítimo
                    completando lições, lendo conteúdos ou contribuindo no fórum.
                  </p>
                </div>
                <Badge className="bg-cyan-500/10 text-cyan-100 border border-cyan-400/40">
                  Legacy XP — Sistema oficial
                </Badge>

                <div className="grid gap-4 md:grid-cols-3">
                  {heroHighlights.map((highlight) => {
                    const Icon = highlight.icon;
                    return (
                      <Card
                        key={highlight.label}
                        className="flex flex-col bg-[#03141d]/80 border border-white/10 shadow-lg shadow-black/60 transition hover:-translate-y-0.5 hover:border-cyan-400/60"
                      >
                        <CardContent className="space-y-2 py-6">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                            <Icon className="h-4 w-4 text-cyan-300" />
                            {highlight.label}
                          </div>
                          <p className="text-2xl font-bold text-white">{highlight.value}</p>
                          <p className="text-sm text-slate-300">{highlight.detail}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="relative h-full w-full">
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-[#010b11] shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.3),transparent_55%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(16,185,129,0.25),transparent_45%)]" />
                  <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                        <Target className="h-3.5 w-3.5 text-cyan-300" />
                        XP TRACKER
                      </div>
                      <p className="text-2xl font-semibold leading-snug">
                        Ganha XP por cada ação real dentro do Legacy.
                      </p>
                      <p className="text-sm text-slate-200/80">
                        As métricas são auditadas automaticamente e alimentam o ranking, desbloqueios
                        e streaks globais.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">XP disponível hoje</span>
                        <span className="text-2xl font-bold text-cyan-200">369 XP</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-400">
                        O limite renova todos os dias às 00:00 UTC. Todo XP acima disso é ignorado,
                        garantindo justiça para toda a comunidade.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Error state */}
          {fetchError && (
            <Card className="bg-rose-950/80 border border-rose-600/80">
              <CardContent className="space-y-2 py-4">
                <p className="text-sm text-rose-100">
                  Não conseguimos carregar os dados oficiais agora: {fetchError}
                </p>
                <p className="text-xs text-rose-200">
                  Confirma se as variáveis de ambiente estão definidas e tenta novamente.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rewards */}
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
                <Card className="bg-[#000c12] border border-white/10">
                  <CardContent className="py-6">
                    <p className="text-sm text-slate-300">
                      Ainda não existem regras de recompensa publicadas. Assim que forem criadas no
                      painel admin, aparecem aqui.
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
                  const creatorBonusText =
                    meta?.creatorBonus ||
                    (reward.creator_bonus_pct != null
                      ? `+${reward.creator_bonus_pct}% quando outros interagem com o conteúdo — crédito exclusivo para criadores.`
                      : null);

                  return (
                    <Card
                      key={reward.action_type}
                      className="bg-[#05212b] border border-white/10 transition hover:border-cyan-400/60 hover:-translate-y-0.5"
                    >
                      <CardContent className="space-y-3 text-sm text-slate-200 py-5">
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-white">{title}</h3>
                            <p className="text-xs text-slate-400">Intervalo oficial</p>
                          </div>
                          <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-slate-100">
                            {range}
                          </span>
                        </div>
                        {creatorBonusText && (
                          <p className="text-xs text-slate-300">{creatorBonusText}</p>
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
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Streaks & consistência
                  </p>
                  <p className="text-sm text-slate-200">
                    Streaks são pensados para premiar consistência real, não apenas presença.
                  </p>
                  <ul className="space-y-2 list-disc pl-5 text-sm text-slate-200">
                    <li>Ganhar XP todos os dias é obrigatório para manter um streak.</li>
                    <li>Streak de 7 dias rende 222 XP; streak de 30 dias rende 1.111 XP.</li>
                    <li>Faltar um dia quebra o streak e reinicia a contagem.</li>
                    <li>
                      Conclusões de lições e leituras de blog garantem que o XP só é contado uma vez
                      por conteúdo e impedem criadores de ganhar XP lendo o próprio material.
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#000c12]/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Última ação registada
                      </p>
                      <p className="text-sm text-slate-300">
                        Autentica-te no painel admin para acompanhar o histórico em tempo real.
                      </p>
                    </div>
                    <Sparkles className="h-6 w-6 text-amber-300" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Notificações via Resend são disparadas quando os streaks de 7 ou 30 dias são
                    concluídos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Thresholds */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">
                Progressão e thresholds
              </p>
              <h2 className="text-2xl font-bold text-white">
                Cada milestone desbloqueia acesso extra
              </h2>
              <p className="text-sm text-slate-300">
                O XP total determina privilégios, reputação e desbloqueios. Vê abaixo os thresholds
                oficiais definidos pela equipa.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {thresholdTable.length === 0 ? (
                <Card className="bg-[#05212b] border border-white/10">
                  <CardContent className="py-5">
                    <p className="text-sm text-slate-200">
                      Ainda não há thresholds publicados. A equipa admin pode adicioná-los no painel{' '}
                      <span className="font-semibold">/admin/xp</span>.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                thresholdTable.map((threshold) => (
                  <Card
                    key={`${threshold.xp_total}-${threshold.feature_name}`}
                    className="bg-[#05212b] border border-white/10"
                  >
                    <CardContent className="space-y-2 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">{threshold.xp_total} XP</span>
                        <Badge variant="outline" className="text-slate-100 border-white/30">
                          Desbloqueia
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {threshold.feature_name}
                      </p>
                      {threshold.description && (
                        <p className="text-sm text-slate-300">{threshold.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <Card className="bg-[#05212b] border border-white/10">
              <CardContent className="space-y-3 text-sm text-slate-200 py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <p>
                    {levelFormula}, também mostrando o progresso restante rumo ao próximo nível.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-emerald-300" />
                  <p>
                    O ranking global usa <code className="text-xs">xp_transactions</code> para
                    alimentar desafios e gamificação.
                  </p>
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
