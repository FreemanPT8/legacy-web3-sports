'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trophy, Loader2, Plus, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { SafeImage } from '@/app/components/SafeImage';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface AdminHouse {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  avatar_url?: string | null;
  head?: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  moderators_count?: number;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  houses?: AdminHouse[];
}

const statusOptions: { value: 'all' | HouseStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'development', label: 'In development' },
];

function StatusBadge({ status }: { status: HouseStatus }) {
  const map: Record<
    HouseStatus,
    { label: string; variant: 'default' | 'secondary' | 'outline' }
  > = {
    active: { label: 'Active', variant: 'default' },
    under_construction: { label: 'In construction', variant: 'secondary' },
    development: { label: 'In development', variant: 'outline' },
  };
  const config = map[status];
  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}

export default function AdminHousesPage() {
  const router = useRouter();
  const { user, getToken, loading: authLoading } = useAuth();

  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HouseStatus>('all');

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }

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
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load Houses of Sports');
          setHouses([]);
          setLoading(false);
          return;
        }

        setHouses(data.houses || []);
      } catch (err) {
        console.error('Error loading houses in /admin/houses:', err);
        setError('Unexpected error while loading Houses of Sports');
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, [authLoading, user, getToken, router]);

  const filtered = useMemo(() => {
    return houses.filter((house) => {
      if (statusFilter !== 'all' && house.status !== statusFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();

      const headName =
        (house.head?.full_name || '') + ' ' + (house.head?.username || '');

      return (
        (house.sport_name || '').toLowerCase().includes(term) ||
        (house.sport_code || '').toLowerCase().includes(term) ||
        (house.country_code || '').toLowerCase().includes(term) ||
        headName.toLowerCase().includes(term)
      );
    });
  }, [houses, search, statusFilter]);

  if (
    authLoading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading Houses of Sports...</span>
        </div>
      </div>
    );
  }

  const totalHouses = houses.length;
  const activeHouses = houses.filter((h) => h.status === 'active').length;
  const buildingHouses = houses.filter(
    (h) => h.status === 'under_construction',
  ).length;
  const developingHouses = houses.filter(
    (h) => h.status === 'development',
  ).length;
  const missingHeads = houses.filter((h) => !h.head).length;

  return (
    <div className="w-full space-y-8">
      {/* HERO — MESMO ESTILO DO /admin */}
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Houses of Sports
          </span>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-amber-300" />
            Houses of Sports
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Visão global das Houses, países, estado de desenvolvimento e
            liderança. É aqui que percebes se o ecossistema das Houses está a
            crescer de forma saudável ou se alguma precisa da tua atenção.
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-400">{error}</p>
          )}
        </div>
      </section>

      <section className="space-y-8">
        {/* RESUMO DAS HOUSES (mesmo padrão de secções do admin) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Resumo das Houses
          </h2>
          <Card className="bg-card-custom border-custom shadow-lg shadow-amber-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading text-sm">
                Estado atual do ecossistema
              </CardTitle>
              <CardDescription className="text-muted-custom text-xs">
                Totais e estados das Houses of Sports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border-custom bg-card-custom p-3">
                  <p className="text-xs text-muted-custom uppercase">
                    Total Houses
                  </p>
                  <p className="mt-1 text-2xl font-bold text-heading">
                    {totalHouses}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3">
                  <p className="text-xs font-medium text-emerald-200 uppercase">
                    Active
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {activeHouses}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-3">
                  <p className="text-xs font-medium text-amber-200 uppercase">
                    Under construction
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-400">
                    {buildingHouses}
                  </p>
                </div>
                <div className="rounded-lg border border-sky-900/60 bg-sky-950/40 p-3">
                  <p className="text-xs font-medium text-sky-200 uppercase">
                    In development
                  </p>
                  <p className="mt-1 text-2xl font-bold text-sky-400">
                    {developingHouses}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3">
                  <p className="text-xs font-medium text-rose-200 uppercase">
                    Missing Head
                  </p>
                  <p className="mt-1 text-2xl font-bold text-rose-400">
                    {missingHeads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTROS (card no mesmo estilo do resto do admin) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Filtros
          </h2>
          <Card className="bg-card-custom border-custom">
            <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Search by sport, country or Head of House..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="w-full md:w-60">
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as 'all' | HouseStatus)
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full md:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="border-slate-700 text-slate-200"
                >
                  Clear filters
                </Button>
                <Link href="/admin/houses/create">
                  <Button
                    type="button"
                    className="bg-sky-600 hover:bg-sky-500 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create new House
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA DE HOUSES */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-custom">
            Houses list
          </h2>
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                <Trophy className="h-5 w-5 text-amber-400" />
                Houses list
              </CardTitle>
              <CardDescription className="text-xs text-muted-custom">
                Showing {filtered.length} of {houses.length} Houses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-custom gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Houses of Sports...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-custom text-sm">
                  {houses.length === 0
                    ? 'No Houses found. Create the first House using the button above.'
                    : 'No Houses match the current filters.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Sport
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Country
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Head of House
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Moderators
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-custom">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((house) => (
                        <tr
                          key={house.id}
                          className="border-b border-slate-800 hover:bg-slate-900 cursor-pointer"
                          onClick={() =>
                            router.push(`/admin/houses/${house.id}`)
                          }
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-md overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0 flex items-center justify-center text-xs text-slate-400">
                                {house.avatar_url &&
                                house.avatar_url.trim() !== '' ? (
                                  <SafeImage
                                    src={house.avatar_url}
                                    alt={house.sport_name || 'House'}
                                    className="w-full h-full object-cover"
                                    width={64}
                                    height={64}
                                  />
                                ) : (
                                  <span className="font-semibold">
                                    {house.sport_code
                                      ?.slice(0, 3)
                                      ?.toUpperCase() ||
                                      house.country_code?.slice(0, 2) ||
                                      'H'}
                                  </span>
                                )}
                              </div>
                              <Link
                                href={`/admin/houses/${house.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block"
                              >
                                <div className="font-medium text-sky-400 hover:underline">
                                  {house.sport_name || 'Unknown sport'}
                                </div>
                                <div className="text-xs text-slate-500 uppercase">
                                  {house.sport_code}
                                </div>
                              </Link>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {house.id}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="uppercase text-xs font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-200">
                              {house.country_code}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge status={house.status} />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0 flex items-center justify-center text-[11px] text-slate-400">
                                {house.head?.avatar_url &&
                                house.head.avatar_url.trim() !== '' ? (
                                  <SafeImage
                                    src={house.head.avatar_url}
                                    alt={
                                      house.head.full_name ||
                                      house.head.username ||
                                      'Head of House'
                                    }
                                    className="w-full h-full object-cover"
                                    width={40}
                                    height={40}
                                  />
                                ) : house.head ? (
                                  <span className="font-semibold">
                                    {(house.head.full_name ||
                                      house.head.username ||
                                      'Head')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                ) : (
                                  <span className="font-semibold">HH</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {house.head ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-100">
                                      {house.head.full_name ||
                                        house.head.username ||
                                        'Head of House'}
                                    </span>
                                    {house.head.username && (
                                      <span className="text-xs text-slate-400">
                                        @{house.head.username}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-rose-300 border-rose-900/70 bg-rose-950/30"
                                  >
                                    Missing Head
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-200">
                            {house.moderators_count ?? 0}
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-400">
                            {house.created_at
                              ? format(new Date(house.created_at), 'dd/MM/yyyy')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
