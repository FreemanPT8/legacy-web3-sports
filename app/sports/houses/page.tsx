// app/sports/houses/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type PublicLifecycleStatus =
  | 'IN_DEVELOPMENT'
  | 'UNDER_CONSTRUCTION'
  | 'ACTIVE';

interface PublicHouse {
  id: string;
  name: string;
  hero_title: string;
  hero_subtitle: string;
  description: string;
  cover_image_url: string | null;
  country_code: string | null;
  lifecycle_status: PublicLifecycleStatus;
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
    permissions: Record<string, any>;
  }[];
}

interface ApiResponse {
  success: boolean;
  houses?: PublicHouse[];
  error?: string;
}

const STATUS_LABEL: Record<PublicLifecycleStatus, string> = {
  ACTIVE: 'Active',
  UNDER_CONSTRUCTION: 'In construction',
  IN_DEVELOPMENT: 'In development',
};

const STATUS_COLORS: Record<PublicLifecycleStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
};

export default function PublicHousesPage() {
  const [houses, setHouses] = useState<PublicHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'ALL' | PublicLifecycleStatus>('ALL');

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading Houses of Sports.');
          setHouses([]);
          setLoading(false);
          return;
        }

        setHouses(data.houses || []);
      } catch (err) {
        console.error('Error fetching public houses:', err);
        setError('Network error while loading Houses of Sports.');
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const filtered = useMemo(() => {
    let list = [...houses];

    if (statusFilter !== 'ALL') {
      list = list.filter((h) => h.lifecycle_status === statusFilter);
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((h) => {
        const sportName = h.sport?.name ?? '';
        const sportCode = h.sport?.code ?? '';
        const headName =
          (h.head?.full_name || '') + ' ' + (h.head?.username || '');
        return (
          h.name.toLowerCase().includes(s) ||
          sportName.toLowerCase().includes(s) ||
          sportCode.toLowerCase().includes(s) ||
          (h.country_code ?? '').toLowerCase().includes(s) ||
          headName.toLowerCase().includes(s)
        );
      });
    }

    return list;
  }, [houses, search, statusFilter]);

  const grouped = useMemo(() => {
    const active = filtered.filter((h) => h.lifecycle_status === 'ACTIVE');
    const construction = filtered.filter(
      (h) => h.lifecycle_status === 'UNDER_CONSTRUCTION'
    );
    const dev = filtered.filter(
      (h) => h.lifecycle_status === 'IN_DEVELOPMENT'
    );
    return { active, construction, dev };
  }, [filtered]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Houses of Sports
              </h1>
              <p className="mt-3 text-sm md:text-base text-slate-600">
                Descobre as comunidades Web3 oficiais de cada desporto na
                LEGACY. Cada House tem a sua própria liderança, moderadores,
                missões e eventos ligados à Apertum Blockchain.
              </p>
              <p className="mt-2 text-xs md:text-sm text-slate-500">
                Não precisas de conta para explorar as Houses, mas para entrar
                numa comunidade vais precisar de criar o teu perfil e concluir
                o onboarding personalizado.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by sport, House or Head of House..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as 'ALL' | PublicLifecycleStatus
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="UNDER_CONSTRUCTION">In construction</option>
                  <option value="IN_DEVELOPMENT">In development</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mensagem de erro */}
        <div className="max-w-6xl mx-auto px-4">
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Secções de Houses */}
        <section className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          {loading ? (
            <p className="text-sm text-slate-500">Loading Houses…</p>
          ) : houses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              Ainda não existem Houses públicas. Em breve vais poder encontrar
              as primeiras comunidades oficiais de cada desporto aqui.
            </div>
          ) : (
            <>
              {/* ACTIVE */}
              <HouseSection
                title="Active Houses"
                description="Comunidades já lançadas, com liderança definida e plano de missões."
                emptyMessage="Ainda não existem Houses ativas. Em breve vais poder entrar nas primeiras comunidades."
                houses={grouped.active}
              />

              {/* UNDER CONSTRUCTION */}
              <HouseSection
                title="Houses in construction"
                description="Liderança definida e comunidade a ser preparada para o lançamento."
                emptyMessage="Ainda não existem Houses em construção."
                houses={grouped.construction}
              />

              {/* IN DEVELOPMENT */}
              <HouseSection
                title="Houses in development"
                description="Ideias de Houses a serem estruturadas. Podem ainda não ter líder definido."
                emptyMessage="Ainda não existem Houses em desenvolvimento."
                houses={grouped.dev}
              />
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HouseSection({
  title,
  description,
  emptyMessage,
  houses,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  houses: PublicHouse[];
}) {
  if (houses.length === 0) {
    return (
      <div className="space-y-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-xs text-slate-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-slate-400">
          {houses.length} House{houses.length !== 1 && 's'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {houses.map((house) => (
          <Link
            key={house.id}
            href={`/sports/houses/${house.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-colors"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                      {house.hero_title}
                    </h3>
                    {house.country_code && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[10px] font-mono uppercase text-slate-600">
                        {house.country_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {house.hero_subtitle}
                  </p>
                </div>
                <span className={STATUS_COLORS[house.lifecycle_status]}>
                  {STATUS_LABEL[house.lifecycle_status]}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3">
                {house.description}
              </p>

              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-700">
                    {house.sport?.name ?? 'Unknown sport'}
                  </span>
                  <span className="uppercase text-[10px] tracking-wide text-slate-400">
                    {house.sport?.code}
                  </span>
                </div>
                <div className="text-right">
                  {house.head ? (
                    <>
                      <div className="font-medium text-slate-700">
                        {house.head.full_name || house.head.username}
                      </div>
                      {house.head.username && (
                        <div className="text-[10px] text-slate-400">
                          Head of House · @{house.head.username}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Head of House to be announced
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
