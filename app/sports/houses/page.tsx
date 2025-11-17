'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface House {
  id: string;
  title: string; // ex: "House of Sports Climbing Portugal"
  sport_name: string | null;
  country_code: string;
  status: HouseStatus;
  head_username: string | null;
  head_full_name: string | null;
  moderators_count: number;
  created_at: string;
}

const STATUS_LABELS: Record<HouseStatus, string> = {
  IN_DEVELOPMENT: 'In Development',
  UNDER_CONSTRUCTION: 'Under Construction',
  ACTIVE: 'Active',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800',
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
};

export default function HousesOfSportsPage() {
  const { user, getToken } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HouseStatus>('ALL');

  // 1) Carregar Houses a partir da API admin
  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getToken();

        if (!token) {
          setError('No authentication token provided');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/houses', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading Houses');
          setLoading(false);
          return;
        }

        setHouses(data.houses ?? []);
      } catch (err) {
        console.error('Error fetching Houses:', err);
        setError('Network error while loading Houses');
      } finally {
        setLoading(false);
      }
    };

    // Só tenta carregar se o user existir (estás autenticado)
    if (user) {
      fetchHouses();
    } else {
      setLoading(false);
      setError('You must be logged in as Admin / Super Admin to view Houses.');
    }
  }, [user, getToken]);

  // 2) Aplicar filtros e pesquisa
  const filteredHouses = useMemo(() => {
    let list = [...houses];

    if (statusFilter !== 'ALL') {
      list = list.filter((h) => h.status === statusFilter);
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((h) => {
        return (
          h.title.toLowerCase().includes(s) ||
          (h.sport_name ?? '').toLowerCase().includes(s) ||
          h.country_code.toLowerCase().includes(s) ||
          (h.head_username ?? '').toLowerCase().includes(s) ||
          (h.head_full_name ?? '').toLowerCase().includes(s) ||
          h.id.toLowerCase().includes(s)
        );
      });
    }

    return list;
  }, [houses, search, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 py-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Título + descrição */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Houses of Sports
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              View and manage Houses, Heads of House and House Moderators.
            </p>
          </div>

          {/* Filtros */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by sport, country or Head of House..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | HouseStatus)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_CONSTRUCTION">Under Construction</option>
                <option value="IN_DEVELOPMENT">In Development</option>
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

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Lista de Houses */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    🏆 Houses list
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Showing {filteredHouses.length} of {houses.length} Houses.
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {loading ? (
                <p className="py-6 text-sm text-gray-500">Loading Houses…</p>
              ) : filteredHouses.length === 0 ? (
                <p className="py-6 text-sm text-gray-500">
                  No Houses found. Create the first House directly in the
                  database or via future admin tools.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-3">Sport</th>
                        <th className="px-3 py-3">Country</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Head of House</th>
                        <th className="px-3 py-3">Moderators</th>
                        <th className="px-3 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredHouses.map((house) => (
                        <tr key={house.id} className="hover:bg-gray-50/60">
                          <td className="px-3 py-3 align-top">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {house.title}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {house.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                              {house.country_code}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span className={STATUS_BADGE_CLASSES[house.status]}>
                              {STATUS_LABELS[house.status]}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-gray-700">
                            {house.head_username ? (
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {house.head_full_name || house.head_username}
                                </span>
                                <span className="text-xs text-gray-500">
                                  @{house.head_username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No Head defined
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-gray-700">
                            {house.moderators_count}
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-gray-700">
                            {house.created_at
                              ? new Date(house.created_at).toLocaleDateString(
                                  'pt-PT'
                                )
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER GLOBAL */}
      <Footer />
    </div>
  );
}
