'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface House {
  id: string;
  name: string;
  country_code: string | null;
  status: PublicHouseStatus;
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

function formatStatusLabel(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'UNDER_CONSTRUCTION':
      return 'Em construção';
    case 'IN_DEVELOPMENT':
      return 'Em desenvolvimento';
    default:
      return status;
  }
}

function statusBadgeClass(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
    case 'UNDER_CONSTRUCTION':
      return 'inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] px-2.5 py-0.5 border border-amber-200';
    case 'IN_DEVELOPMENT':
    default:
      return 'inline-flex items-center rounded-full bg-gray-50 text-gray-600 text-[11px] px-2.5 py-0.5 border border-gray-200';
  }
}

export default function HousesOfSportsPage() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

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
        console.error('Error fetching public Houses:', err);
        setError(
          err?.message || 'Erro inesperado ao carregar Houses of Sports.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const filtered = useMemo(() => {
    let list = [...houses];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((h) => {
        const headName =
          (h.head?.full_name || '') + ' ' + (h.head?.username || '');
        return (
          h.name.toLowerCase().includes(term) ||
          (h.sport?.name || '').toLowerCase().includes(term) ||
          (h.sport?.code || '').toLowerCase().includes(term) ||
          (h.country_code || '').toLowerCase().includes(term) ||
          headName.toLowerCase().includes(term)
        );
      });
    }

    return list;
  }, [houses, search]);

  const grouped = useMemo(() => {
    const active: House[] = [];
    const underConstruction: House[] = [];
    const inDevelopment: House[] = [];

    for (const h of filtered) {
      if (h.status === 'ACTIVE') active.push(h);
      else if (h.status === 'UNDER_CONSTRUCTION') underConstruction.push(h);
      else inDevelopment.push(h);
    }

    return { active, underConstruction, inDevelopment };
  }, [filtered]);

  const totalActive = grouped.active.length;
  const totalUnderConstruction = grouped.underConstruction.length;
  const totalInDevelopment = grouped.inDevelopment.length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-b from-blue-50 to-transparent border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
            <div className="grid md:grid-cols-[2fr,1.3fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 mb-3">
                  Houses of Sports · Comunidades por desporto
                </span>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                  As Houses oficiais de cada desporto.
                </h1>
                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-xl">
                  Cada House of Sports representa a comunidade oficial de{' '}
                  <strong>um desporto num país</strong>. É aqui que Heads of
                  House, moderadores e membros se juntam para aprender Web3,
                  explorar a Apertum Blockchain e construir o futuro do
                  desporto em comunidade.
                </p>

                <p className="mt-4 text-xs text-gray-500 max-w-lg">
                  As Houses ativas vão ter missões, XP, conteúdo exclusivo e
                  um chat privado para membros. As Houses em construção estão a
                  montar as bases da comunidade. As em desenvolvimento ainda
                  estão a ganhar forma nos bastidores.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/sports"
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Voltar a Desportos Web3
                  </Link>
                  <Link
                    href="/sports/onboarding"
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Fazer onboarding de desporto
                  </Link>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-2xl border border-blue-100 px-4 py-4 md:px-6 md:py-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Snapshot das Houses
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Houses ativas
                    </span>
                    <span className="font-semibold text-gray-900">
                      {totalActive}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Em construção
                    </span>
                    <span className="font-semibold text-gray-900">
                      {totalUnderConstruction}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Em desenvolvimento
                    </span>
                    <span className="font-semibold text-gray-900">
                      {totalInDevelopment}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t pt-3 text-[11px] text-gray-500">
                  Se representas um desporto, podes vir a liderar a tua própria
                  House. O primeiro passo é fazer o onboarding personalizado de
                  desporto.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS + LISTAS */}
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Search + erro */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Explora as Houses de desporto
              </h2>
              <p className="text-xs text-gray-500 max-w-xl">
                Vê quais as Houses já estão em movimento e quais estão a ser
                preparadas. Algumas vão abrir inscrições para membros em breve.
              </p>
            </div>

            <div className="w-full md:w-64">
              <input
                type="text"
                placeholder="Pesquisar por desporto, país, Head…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">A carregar Houses…</p>
          ) : (
            <>
              {/* ACTIVE */}
              <HousesSection
                title="Houses ativas"
                description="Comunidades que já têm liderança definida e estão prontas a receber membros."
                houses={grouped.active}
                clickable={true}
                emptyMessage="Ainda não existem Houses ativas. Em breve algumas Houses vão abrir as portas para membros."
              />

              {/* UNDER CONSTRUCTION — também clicáveis */}
              <HousesSection
                title="Houses em construção"
                description="Casas que já têm Head of House e/ou moderadores a preparar a comunidade."
                houses={grouped.underConstruction}
                clickable={true}
                emptyMessage="Ainda não existem Houses em construção."
              />

              {/* IN DEVELOPMENT – apenas para Admin / Super Admin */}
              {isAdmin && (
                <HousesSection
                  title="Houses em desenvolvimento (visível só para equipa)"
                  description="Ideias de Houses que ainda estão a ser trabalhadas nos bastidores."
                  houses={grouped.inDevelopment}
                  clickable={false}
                  subtle
                  emptyMessage="Ainda não existem Houses em desenvolvimento."
                />
              )}
            </>
          )}

          {/* CTA final */}
          <div className="mt-6 border-t pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Queres criar ou liderar uma House do teu desporto?
                </h3>
                <p className="text-xs text-gray-500 max-w-xl">
                  Se és profissional ou entusiasta sério de um desporto, podes
                  fazer o onboarding personalizado e ser acompanhado por um Head
                  of House na tua jornada Web3.
                </p>
              </div>
              <Link
                href="/sports/onboarding"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Começar onboarding personalizado
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HousesSection({
  title,
  description,
  houses,
  clickable,
  emptyMessage,
  subtle,
}: {
  title: string;
  description: string;
  houses: House[];
  clickable: boolean;
  emptyMessage: string;
  subtle?: boolean;
}) {
  if (houses.length === 0) {
    return (
      <section className={subtle ? 'opacity-80' : ''}>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-3">{description}</p>
        <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={subtle ? 'opacity-80' : ''}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <p className="text-[11px] text-gray-400">
          {houses.length} {houses.length === 1 ? 'House' : 'Houses'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => {
          const CardContent = (
            <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {house.name}
                  </div>
                  {house.sport && (
                    <div className="text-[11px] uppercase text-gray-400 mt-0.5">
                      {house.sport.name} · {house.sport.code}
                    </div>
                  )}
                </div>
                {house.country_code && (
                  <span className="text-[10px] font-mono uppercase bg-gray-100 rounded px-2 py-0.5">
                    {house.country_code}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className={statusBadgeClass(house.status)}>
                  {formatStatusLabel(house.status)}
                </span>
                {house.created_at && (
                  <span className="text-[10px] text-gray-400">
                    Criada em{' '}
                    {new Date(house.created_at).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </div>

              <div className="mt-1 text-[11px] text-gray-600 flex-1">
                {house.head ? (
                  <>
                    Head of House:{' '}
                    <span className="font-medium">
                      {house.head.full_name || house.head.username}
                    </span>
                    {house.moderators.length > 0 && (
                      <> · {house.moderators.length} moderador(es)</>
                    )}
                  </>
                ) : (
                  <>Head of House ainda não definido.</>
                )}
              </div>

              {!clickable && (
                <p className="mt-3 text-[10px] text-gray-400">
                  Perfil público ainda não disponível. Em breve vais poder ver
                  mais detalhes desta House.
                </p>
              )}

              {clickable && (
                <p className="mt-3 text-[11px] text-blue-700">
                  Ver perfil público →
                </p>
              )}
            </div>
          );

          if (!clickable) {
            return (
              <div key={house.id} className="cursor-default">
                {CardContent}
              </div>
            );
          }

          // clicável: vai para /sports/houses/[houseId]
          return (
            <Link
              key={house.id}
              href={`/sports/houses/${house.id}`}
              className="block"
            >
              {CardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
