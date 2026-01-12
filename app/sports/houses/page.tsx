'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/app/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import {
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface House {
  id: string;
  name: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  member_count?: number;
  xp_total?: number;
  country_code: string | null;
  status: HouseStatus;
  created_at: string | null;
  sport: {
    id: string;
    code: string;
    name: string;
  } | null;
  head: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
  moderators: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  }[];
}

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

const STATUS_LABELS: Record<HouseStatus, string> = {
  ACTIVE: 'Ativa',
  UNDER_CONSTRUCTION: 'Em construção',
  IN_DEVELOPMENT: 'Em desenvolvimento',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-200',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-slate-400/40 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-medium text-slate-200',
};

export default function HousesPage() {
  const { user } = useAuth();
  const isLegacyTeam = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const json: HousesApiResponse = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Erro ao carregar Houses of Sports.');
        }

        setHouses(json.houses || []);
      } catch (err: any) {
        console.error('Erro ao carregar Houses:', err);
        setError(err?.message || 'Erro inesperado ao carregar Houses.');
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const { active, underConstruction, inDevelopment } = useMemo(() => {
    const active: House[] = [];
    const underConstruction: House[] = [];
    const inDevelopment: House[] = [];

    for (const h of houses) {
      if (h.status === 'ACTIVE') active.push(h);
      else if (h.status === 'UNDER_CONSTRUCTION') underConstruction.push(h);
      else inDevelopment.push(h);
    }

    return { active, underConstruction, inDevelopment };
  }, [houses]);

  const totalActive = active.length;
  const totalUnderConstruction = underConstruction.length;
  const totalInDevelopment = inDevelopment.length;

  const visibleInDevelopment = isLegacyTeam ? inDevelopment : [];

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />

      <main className="flex-1 bg-[#000c12]">
        {/* HERO / INTRO */}
        <div className="px-6 py-12 md:py-16">
          <HeroSection>
            <HeroTextColumn className="mx-auto max-w-5xl space-y-6">
              <div className="space-y-4">
                <HeroEyebrow>HOUSES OF SPORTS</HeroEyebrow>
                <HeroTitle className="text-3xl md:text-4xl">Explora as Houses</HeroTitle>
                <HeroDescription className="max-w-3xl text-slate-200 md:text-base">
                  Cada House of Sports é uma comunidade que junta desporto, formação Web3 e networking local. Descobre onde estas Houses já estão ativas, quais estão em construção e as próximas a chegar ao ecossistema LEGACY.
                </HeroDescription>
                <HeroDescription className="max-w-3xl text-slate-200 md:text-base">
                  Escolhe a House alinhada com o teu desporto e contexto ou usa este mapa para perceber onde podes liderar uma nova iniciativa.
                </HeroDescription>
              </div>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#04131b]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.65)] md:grid-cols-3 md:p-6">
                <StatusSummaryItem
                  label="Houses ativas"
                  value={totalActive}
                  description="Comunidades que já estão a receber membros de forma estruturada."
                />
                <StatusSummaryItem
                  label="Houses em construção"
                  value={totalUnderConstruction}
                  description="Equipas a formar e primeiros membros a serem ligados."
                />
                <StatusSummaryItem
                  label="Houses em desenvolvimento"
                  value={totalInDevelopment}
                  description="Mapeadas pela equipa LEGACY. Visíveis apenas para a equipa LEGACY."
                />
              </div>

              <div className="grid gap-6 border-t border-white/10 pt-6 md:grid-cols-[1.8fr,1.2fr]">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    COMO ESTA PÁGINA SE LIGA AO TEU CAMINHO
                  </h2>
                  <ul className="space-y-2 text-sm text-slate-200">
                    <li>
                      Na página de entrada do LEGACY tu entendes{' '}
                      <strong>o que é o portal</strong> e porque é que a Apertum
                      se cruza com desporto.
                    </li>
                    <li>
                      Aqui vês{' '}
                      <strong>onde já existem comunidades a nascer</strong> – por
                      desporto, país e estado das Houses (ativas, em
                      construção ou em desenvolvimento).
                    </li>
                    <li>
                      No passo seguinte, através de um{' '}
                      <strong>formulário simples de onboarding</strong>,
                      mostras quem és e o que procuras. A partir daí a equipa
                      consegue orientar-te com muito mais precisão.
                    </li>
                  </ul>
                  <p className="text-xs text-slate-200">
                    Não precisas de &quot;entrar em tudo&quot;. A ideia é
                    perceber onde faz sentido colocar a tua energia – como
                    membro, como líder ou simplesmente como alguém que quer
                    aprender com estrutura.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#04131b]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    PRÓXIMO PASSO
                  </p>
                  <p className="text-sm text-slate-200">
                    Quando te sentires pronto, faz o onboarding e diz-nos qual é
                    a tua relação com o desporto, o teu contexto e o que
                    queres construir. A partir daí a equipa LEGACY ajuda-te a
                    encontrar a House certa – ou a preparar o terreno para
                    uma nova.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      asChild
                      size="sm"
                      className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      <Link href="/sports/onboarding">Fazer Onboarding</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      <Link href="/education/courses">Começar pela Academia</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </HeroTextColumn>
          </HeroSection>
        </div>

        {/* LISTAS DE HOUSES */}
        <section className="relative px-6 py-12 md:py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-10">
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#04131b] px-6 py-10 text-center shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                <p className="text-sm font-medium text-white">
                  A carregar Houses of Sports...
                </p>
                <p className="text-xs text-slate-200">
                  Estamos a buscar o mapa atualizado das Houses. Isto pode
                  demorar alguns segundos.
                </p>
              </div>
            ) : houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#04131b] px-6 py-10 text-center shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                <p className="text-sm font-medium text-white">
                  Ainda não existem Houses of Sports visíveis.
                </p>
                <p className="text-xs text-slate-200">
                  A equipa do LEGACY está a preparar a primeira vaga de
                  comunidades. Mantém-te atento ao portal e à Academia.
                </p>
              </div>
            ) : (
              <>
                <HousesSection
                  title="Houses ativas"
                  description="Comunidades que já estão a receber membros e a testar formatos de aprendizagem, treino e networking."
                  houses={active}
                />

                <HousesSection
                  title="Houses em construção"
                  description="Houses a ganhar forma: definição de equipa, visão interna e primeiros membros próximos da comunidade."
                  houses={underConstruction}
                />

                <HousesSection
                  title="Houses em desenvolvimento"
                  description={
                    isLegacyTeam
                      ? 'Visão interna para quem está a desenhar o futuro do mapa de Houses e do ecossistema LEGACY.'
                      : 'Houses em fase inicial de desenho e validação internas. Visíveis apenas para a equipa LEGACY.'
                  }
                  houses={visibleInDevelopment}
                />
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatusSummaryItem(props: {
  label: string;
  value: number;
  description: string;
}) {
  const { label, value, description } = props;

  return (
    <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-200">{description}</p>
    </div>
  );
}

function HousesSection({
  title,
  description,
  houses,
}: {
  title: string;
  description: string;
  houses: House[];
}) {
  if (!houses || houses.length === 0) return null;

  const subset = houses.slice(0, 9);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-md font-semibold text-[#fdd87c]">{title}</h3>
          <p className="text-xs text-slate-200">{description}</p>
        </div>
        <p className="text-[11px] text-slate-300">
          {houses.length} {houses.length === 1 ? 'House' : 'Houses'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subset.map((house) => {
          const headUsername = house.head?.username
            ? `@${house.head.username}`
            : null;
          const firstModerator = house.moderators?.[0];
          const moderatorUsername = firstModerator?.username
            ? `@${firstModerator.username}`
            : null;

          const initialsSource = house.head?.username || house.name || 'H';

          const initials = initialsSource
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <Link key={house.id} href={`/sports/houses/${house.id}`}>
              <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_20px_60px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/70 hover:shadow-[0_0_22px_rgba(34,211,238,0.32)]">
                <div className="-mx-4 -mt-4 mb-3 h-40 overflow-hidden rounded-t-xl border-b border-white/10 bg-[#000c12] sm:h-48">
                  {house.cover_image_url || house.avatar_url ? (
                    <SafeImage
                      src={house.cover_image_url || house.avatar_url || ''}
                      alt={house.name}
                      className="h-full w-full object-cover"
                      width={3750}
                      height={875}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950" />
                  )}
                </div>

                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">
                      {house.name}
                    </p>
                    {house.sport && (
                      <p className="truncate text-[11px] text-slate-200">
                        {house.sport.name} · {house.sport.code}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[10px]">
                    <span className="rounded px-2 py-0.5 font-mono uppercase text-slate-100 border border-white/20 bg-[#020b16]">
                      {initials}
                    </span>
                    {house.country_code && (
                      <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase text-cyan-100 border border-white/20 bg-[#020b16]">
                        {house.country_code}
                      </span>
                    )}
                    {headUsername && (
                      <span className="text-[10px] text-slate-200">
                        Head {headUsername}
                      </span>
                    )}
                    {moderatorUsername && (
                      <span className="text-[10px] text-slate-400">
                        Mod {moderatorUsername}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span className={STATUS_BADGE_CLASSES[house.status]}>
                    {STATUS_LABELS[house.status]}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {house.created_at
                      ? new Date(house.created_at).toLocaleDateString('pt-PT')
                      : 'Data por definir'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-200">
                  {headUsername ? (
                    <p>
                      Head of House:{' '}
                      <span className="font-medium text-white">{headUsername}</span>
                    </p>
                  ) : (
                    <p className="text-slate-400">Head of House a definir.</p>
                  )}
                  <p className="text-slate-400">
                    {house.moderators.length > 0
                      ? `${house.moderators.length} moderador(es) atribuídos.`
                      : 'Sem moderadores definidos ainda.'}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-[#020b16] px-3 py-2 text-xs text-slate-200">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Membros
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {(house.member_count ?? 0).toLocaleString('pt-PT')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      XP Total
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {(house.xp_total ?? 0).toLocaleString('pt-PT')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
