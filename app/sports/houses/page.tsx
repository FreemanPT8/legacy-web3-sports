'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

const STATUS_LABELS: Record<PublicHouseStatus | 'ALL', string> = {
  ALL: 'All statuses',
  ACTIVE: 'Active',
  UNDER_CONSTRUCTION: 'Under construction',
  IN_DEVELOPMENT: 'In development',
};

const STATUS_BADGE_CLASSES: Record<PublicHouseStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700',
};

export default function HousesCatalogPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PublicHouseStatus>(
    'ALL'
  );

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const data: HousesApiResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error loading Houses of Sports.');
        }

        setHouses(data.houses || []);
      } catch (err: any) {
        console.error('Error loading Houses catalog:', err);
        setError(
          err?.message || 'Unexpected error while loading Houses of Sports.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const filtered = useMemo(() => {
    let list = [...houses];

    if (statusFilter !== 'ALL') {
      list = list.filter((h) => h.status === statusFilter);
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

    // ordenar por estado + data
    return list.sort((a, b) => {
      const order: Record<PublicHouseStatus, number> = {
        ACTIVE: 0,
        UNDER_CONSTRUCTION: 1,
        IN_DEVELOPMENT: 2,
      };
      const diff = order[a.status] - order[b.status];
      if (diff !== 0) return diff;

      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
  }, [houses, search, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <section className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <p className="text-xs uppercase text-gray-500 mb-1">
              Web3 Sports · LEGACY Houses
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Houses of Sports
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">
              Aqui podes explorar todas as{' '}
              <strong>Houses of Sports</strong> da plataforma: comunidades
              oficiais de cada disciplina, organizadas por país. Algumas Houses
              já estão ativas, outras estão em construção ou ainda em fase de
              desenvolvimento.
            </p>
            <p className="mt-2 text-xs text-gray-500 max-w-2xl">
              Utilizadores autenticados terão acesso a mais funcionalidades
              (missões, XP, chat privado da House, etc.), mas esta página é
              pública para qualquer pessoa descobrir o ecossistema.
            </p>
          </div>
        </section>

        {/* FILTROS */}
        <section className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by sport, country or Head of House..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as 'ALL' | PublicHouseStatus
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_CONSTRUCTION">Under construction</option>
                <option value="IN_DEVELOPMENT">In development</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Showing {filtered.length} of {houses.length} Houses.
          </p>
        </section>

        {/* LISTA DE HOUSES */}
        <section className="max-w-6xl mx-auto px-4 pb-10">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-6 text-sm text-gray-500">
              A carregar Houses of Sports…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-sm text-gray-500">
              Nenhuma House corresponde aos filtros atuais.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((house) => (
                <Link
                  key={house.id}
                  href={`/sports/houses/${house.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        {house.name}
                      </h2>
                      {house.sport && (
                        <p className="text-[11px] uppercase text-gray-400 mt-0.5">
                          {house.sport.name} · {house.sport.code}
                        </p>
                      )}
                    </div>
                    {house.country_code && (
                      <span className="text-[10px] font-mono uppercase bg-gray-100 rounded px-2 py-0.5">
                        {house.country_code}
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className={STATUS_BADGE_CLASSES[house.status]}>
                      {STATUS_LABELS[house.status]}
                    </span>
                  </div>

                  {house.head ? (
                    <p className="text-xs text-gray-600 mb-1">
                      Head of House:{' '}
                      <span className="font-medium">
                        {house.head.full_name || house.head.username}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mb-1">
                      Head of House a definir.
                    </p>
                  )}

                  <p className="text-[11px] text-gray-500 mb-2">
                    {house.moderators.length > 0
                      ? `${house.moderators.length} moderator(es) a apoiar esta comunidade.`
                      : 'Ainda não existem moderadores definidos.'}
                  </p>

                  {house.created_at && (
                    <p className="text-[10px] text-gray-400">
                      Created on{' '}
                      {new Date(house.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
