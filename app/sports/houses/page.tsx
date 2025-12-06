'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SafeImage } from '@/app/components/SafeImage';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

type Member = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
};

type House = {
  id: string;
  name: string;
  avatar_url?: string | null;
  country_code: string | null;
  status: PublicHouseStatus;
  created_at: string | null;
  sport: {
    id: string;
    code: string;
    name: string;
  } | null;
  head: Member | null;
  moderators: Member[];
};

type HousesApiResponse = {
  success: boolean;
  houses?: House[];
  error?: string;
};

type StatusFilter = PublicHouseStatus | 'ALL';

function formatStatusLabel(status: PublicHouseStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'UNDER_CONSTRUCTION':
      return 'Em construção';
    case 'IN_DEVELOPMENT':
    default:
      return 'Em desenvolvimento';
  }
}

function statusBadgeClass(status: PublicHouseStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] px-2.5 py-0.5 border border-emerald-500/40';
    case 'UNDER_CONSTRUCTION':
      return 'inline-flex items-center rounded-full bg-amber-500/10 text-amber-300 text-[11px] px-2.5 py-0.5 border border-amber-500/40';
    case 'IN_DEVELOPMENT':
    default:
      return 'inline-flex items-center rounded-full bg-slate-700/60 text-slate-200 text-[11px] px-2.5 py-0.5 border border-slate-500';
  }
}

export default function HousesOfSportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const statusParam = searchParams.get('status');
    const sportParam = searchParams.get('sport');
    const countryParam = searchParams.get('country');

    setSearch(q);

    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (
        upper === 'ACTIVE' ||
        upper === 'UNDER_CONSTRUCTION' ||
        upper === 'IN_DEVELOPMENT'
      ) {
        setStatusFilter(upper as PublicHouseStatus);
      } else {
        setStatusFilter('ALL');
      }
    } else {
      setStatusFilter('ALL');
    }

    if (sportParam) setSportFilter(sportParam);
    else setSportFilter('ALL');

    if (countryParam) setCountryFilter(countryParam.toUpperCase());
    else setCountryFilter('ALL');
  }, [searchParams]);

  const updateQueryString = (updates: {
    q?: string;
    status?: StatusFilter;
    sport?: string;
    country?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      if (updates.q.trim()) params.set('q', updates.q.trim());
      else params.delete('q');
    }

    if (updates.status !== undefined) {
      if (updates.status === 'ALL') params.delete('status');
      else params.set('status', updates.status.toLowerCase());
    }

    if (updates.sport !== undefined) {
      if (updates.sport === 'ALL') params.delete('sport');
      else params.set('sport', updates.sport);
    }

    if (updates.country !== undefined) {
      if (updates.country === 'ALL') params.delete('country');
      else params.set('country', updates.country.toUpperCase());
    }

    const searchString = params.toString();
    const url = searchString ? `${pathname}?${searchString}` : pathname;
    router.replace(url);
  };

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
          err?.message || 'Erro inesperado ao carregar Houses of Sports.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const sportOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const h of houses) {
      if (h.sport && !map.has(h.sport.id)) {
        map.set(h.sport.id, h.sport.name);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [houses]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();

    for (const h of houses) {
      if (h.country_code) set.add(h.country_code.toUpperCase());
    }

    return Array.from(set).sort();
  }, [houses]);

  const filtered = useMemo(() => {
    let list = [...houses];

    if (statusFilter !== 'ALL') {
      list = list.filter((h) => h.status === statusFilter);
    }

    if (sportFilter !== 'ALL') {
      list = list.filter((h) => h.sport && h.sport.id === sportFilter);
    }

    if (countryFilter !== 'ALL') {
      list = list.filter(
        (h) => (h.country_code || '').toUpperCase() === countryFilter,
      );
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();

      list = list.filter((h) => {
        const headName = `${h.head?.full_name || ''} ${
          h.head?.username || ''
        }`;
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
  }, [houses, search, statusFilter, sportFilter, countryFilter]);

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

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSportFilter('ALL');
    setCountryFilter('ALL');
    updateQueryString({ q: '', status: 'ALL', sport: 'ALL', country: 'ALL' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1">
        {/* HERO DARK */}
        <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 relative z-10">
            <div className="grid md:grid-cols-[2fr,1.3fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
                  Houses of Sports — Comunidades por desporto
                </span>

                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-heading">
                  As Houses oficiais de cada desporto.
                </h1>

                <p className="mt-3 text-sm md:text-base text-blue-100 max-w-xl">
                  Cada House of Sports representa a comunidade oficial de{' '}
                  <strong>um desporto num país</strong>. É aqui que Heads of
                  House, moderadores e membros se juntam para aprender Web3,
                  explorar a Apertum Blockchain e construir o futuro do desporto
                  em comunidade.
                </p>

                <p className="mt-4 text-xs text-blue-200/80 max-w-lg">
                  As Houses ativas vão ter missões, XP, conteúdo exclusivo e um
                  chat privado para membros. As Houses em construção estão a
                  montar as bases da comunidade. As em desenvolvimento ainda
                  estão a ganhar forma nos bastidores.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/sports"
                    className="inline-flex items-center rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg.gray-100"
                  >
                    Voltar a Desportos Web3
                  </Link>
                  <Link
                    href="/sports/onboarding"
                    className="inline-flex items-center rounded-lg border border-blue-400/70 bg-transparent px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/10"
                  >
                    Fazer onboarding de desporto
                  </Link>
                </div>
              </div>

              <div className="bg-card-custom shadow-lg rounded-2xl border border-custom px-4 py-4 md:px-6 md:py-5">
                <h2 className="text-sm font-semibold text-heading mb-2">
                  Snapshot das Houses
                </h2>

                <div className="space-y-3 text-xs text-body">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Houses ativas
                    </span>
                    <span className="font-semibold text-heading">
                      {totalActive}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Em construção
                    </span>
                    <span className="font-semibold text-heading">
                      {totalUnderConstruction}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Em desenvolvimento
                    </span>
                    <span className="font-semibold text-heading">
                      {totalInDevelopment}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-700/70 pt-3 text-[11px] text-muted-custom">
                  Se representas um desporto, podes liderar a tua própria House.
                  O primeiro passo é fazer o onboarding personalizado de
                  desporto.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS + LISTAS */}
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-heading">
                Explora as Houses de desporto
              </h2>
              <p className="text-xs text-muted-custom max-w-xl">
                Vê quais as Houses já estão em movimento e quais estão a ser
                preparadas. Algumas vão abrir inscrições para membros em breve.
              </p>
            </div>

            <div className="w-full md:w-64">
              <input
                type="text"
                placeholder="Pesquisar por desporto, país, Head."
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  updateQueryString({ q: value });
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-body shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-custom">Filtrar por:</span>

              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value as StatusFilter;
                  setStatusFilter(value);
                  updateQueryString({ status: value });
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-body shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos os estados</option>
                <option value="ACTIVE">Ativas</option>
                <option value="UNDER_CONSTRUCTION">Em construção</option>
                <option value="IN_DEVELOPMENT">Em desenvolvimento</option>
              </select>

              <select
                value={sportFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setSportFilter(value);
                  updateQueryString({ sport: value });
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-body shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos os desportos</option>
                {sportOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={countryFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setCountryFilter(value);
                  updateQueryString({ country: value });
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-body shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos os países</option>
                {countryOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-muted-custom hover:bg-slate-800"
              >
                Limpar filtros
              </button>
            </div>

            <p className="text-[11px] text-muted-custom">
              A mostrar {filtered.length} de {houses.length} Houses.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-custom">A carregar Houses…</p>
          ) : (
            <>
              <HousesSection
                title="Houses ativas"
                description="Comunidades que já têm liderança definida e estão prontas a receber membros."
                houses={grouped.active}
                clickable
                emptyMessage="Ainda não existem Houses ativas. Em breve algumas Houses vão abrir as portas para membros."
              />
              <HousesSection
                title="Houses em construção"
                description="Casas que já têm Head of House e/ou moderadores a preparar a comunidade."
                houses={grouped.underConstruction}
                clickable
                emptyMessage="Ainda não existem Houses em construção."
              />
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

          <div className="mt-6 border-t border-slate-800 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-heading">
                  Queres criar ou liderar uma House do teu desporto?
                </h3>
                <p className="text-xs text-muted-custom max-w-xl">
                  Se és profissional ou entusiasta sério de um desporto, podes
                  fazer o onboarding personalizado e ser acompanhado por um Head
                  of House na tua jornada Web3.
                </p>
              </div>
              <Link
                href="/sports/onboarding"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
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
  const renderAvatar = (house: House) => {
    const initial = house.name?.trim()?.[0]?.toUpperCase() ?? 'H';

    if (house.avatar_url) {
      return (
        <SafeImage
          src={house.avatar_url}
          alt={`Avatar da House ${house.name}`}
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover border border-custom bg-slate-900"
        />
      );
    }

    return (
      <div className="h-12 w-12 rounded-full bg-slate-900 text-muted-custom flex items-center justify-center text-sm font-semibold border border-custom">
        {initial}
      </div>
    );
  };

  if (houses.length === 0) {
    return (
      <section className={subtle ? 'opacity-80' : ''}>
        <h3 className="text-sm font-semibold text-heading mb-1">{title}</h3>
        <p className="text-xs text-muted-custom mb-3">{description}</p>
        <p className="text-xs text-muted-custom italic">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={subtle ? 'opacity-80' : ''}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-heading">{title}</h3>
          <p className="text-xs text-muted-custom">{description}</p>
        </div>
        <p className="text-[11px] text-muted-custom">
          {houses.length} {houses.length === 1 ? 'House' : 'Houses'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => {
          const card = (
            <div className="h-full rounded-xl border border-custom bg-card-custom p-4 shadow-sm hover:border-blue-500/70 hover:shadow-[0_0_22px_rgba(56,189,248,0.18)] transition flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {renderAvatar(house)}
                  <div>
                    <div className="text-sm font-semibold text-heading">
                      {house.name}
                    </div>
                    {house.sport && (
                      <div className="text-[11px] uppercase text-muted-custom mt-0.5">
                        {house.sport.name} · {house.sport.code}
                      </div>
                    )}
                  </div>
                </div>

                {house.country_code && (
                  <span className="text-[10px] font-mono uppercase bg-slate-900 rounded px-2 py-0.5 text-blue-200 border border-slate-700">
                    {house.country_code}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className={statusBadgeClass(house.status)}>
                  {formatStatusLabel(house.status)}
                </span>
                {house.created_at && (
                  <span className="text-[10px] text-muted-custom">
                    Criada em{' '}
                    {new Date(house.created_at).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </div>

              <div className="mt-1 text-[11px] text-body flex-1">
                {house.head ? (
                  <>
                    Head of House:{' '}
                    <span className="font-medium text-heading">
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
                <p className="mt-3 text-[10px] text-muted-custom">
                  Perfil público ainda não disponível. Em breve vais poder ver
                  mais detalhes desta House.
                </p>
              )}

              {clickable && (
                <p className="mt-3 text-[11px] text-blue-400">
                  Ver perfil público →
                </p>
              )}
            </div>
          );

          if (!clickable) {
            return (
              <div key={house.id} className="cursor-default">
                {card}
              </div>
            );
          }

          return (
            <Link
              key={house.id}
              href={`/sports/houses/${house.id}`}
              className="block"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
