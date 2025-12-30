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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Building2 } from 'lucide-react';
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

const STATUS_LABELS: Record<HouseStatus, string> = {
  active: 'Active',
  under_construction: 'Under construction',
  development: 'In development',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  active:
    'inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200',
  under_construction:
    'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200',
  development:
    'inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200',
};

const statusOptions: { value: 'all' | HouseStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'development', label: 'In development' },
];

const secondaryButtonClasses =
  'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

function StatusBadge({ status }: { status: HouseStatus }) {
  return (
    <span className={STATUS_BADGE_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </span>
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
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

  const formatCreatedAt = (value: string | null | undefined) => {
    if (!value) return 'Unknown date';
    try {
      return format(new Date(value), 'dd/MM/yyyy');
    } catch {
      return value;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] text-white px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] p-6 md:p-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                HOUSES ADMIN
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#021824]/80">
                  <Building2 className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-[#fdd87c]">
                    Houses of Sports
                  </h1>
                  <p className="text-sm text-slate-100">
                    Monitoriza o estado de cada house, confirma lideranca e
                    acelera ativacoes com o mesmo sistema visual da homepage.
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-end lg:w-auto">
              <Button
                className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] sm:flex-none"
                onClick={() => router.push('/admin/houses/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar house
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => {
                  setStatusFilter('active');
                  setSearch('');
                }}
              >
                Ver houses ativas
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => {
                  setStatusFilter('all');
                  setSearch('');
                }}
              >
                Reset filtros
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                TOTAL
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {totalHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses registadas no ecossistema.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                ATIVAS
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {activeHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses com comunidade e lideranca operacionais.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                EM OBRAS
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {buildingHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses under construction a precisar de apoio.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                EM DESENV
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {developingHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Casas ainda no plano inicial ou aguardando assets.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                SEM HEAD
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {missingHeads}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses sem lideranca atribuida neste momento.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            FILTROS
          </p>
          <Card className="border border-white/10 bg-[#04131b]">
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Procurar por esporte, codigo ou head..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                />
              </div>
              <div className="w-full md:w-60">
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as 'all' | HouseStatus)
                  }
                >
                  <SelectTrigger className="bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] border-white/10 text-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#03121a] text-white">
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <Button
                  variant="outline"
                  className={secondaryButtonClasses}
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Limpar filtros
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  onClick={() => router.push('/admin/houses/create')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova house
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            LISTA DE HOUSES
          </p>
          <Card className="border border-white/10 bg-[#04131b]/60 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
            <CardHeader>
              <CardTitle className="text-[#fdd87c]">
                Houses encontradas: {filtered.length}
              </CardTitle>
              <CardDescription className="text-sm text-slate-200">
                Os dados abaixo usam o mesmo layout dos cards de houses
                publicos mas com mais contexto para o admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-200">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  A carregar houses...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-200">
                  {houses.length === 0
                    ? 'Nenhuma house registada ainda. Cria a primeira usando o botao acima.'
                    : 'Nenhuma house corresponde aos filtros atuais.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filtered.map((house) => {
                    const headName =
                      house.head?.full_name ||
                      house.head?.username ||
                      'Sem head atribuido';
                    const headUsername = house.head?.username
                      ? `@${house.head.username}`
                      : null;

                    return (
                      <article
                        key={house.id}
                        className="rounded-2xl border border-white/10 bg-[#04131b] p-5 shadow-[0_25px_70px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/50"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-1 items-start gap-4">
                            <div className="h-16 w-16 rounded-2xl border border-white/10 bg-[#03121a] text-center text-sm font-semibold uppercase text-slate-300">
                              {house.avatar_url &&
                              house.avatar_url.trim() !== '' ? (
                                <SafeImage
                                  src={house.avatar_url}
                                  alt={house.sport_name || 'House of Sports'}
                                  className="h-full w-full rounded-2xl object-cover"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center">
                                  {house.sport_code
                                    ?.slice(0, 3)
                                    ?.toUpperCase() ||
                                    house.country_code ||
                                    'HOS'}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Link
                                href={`/admin/houses/${house.id}`}
                                className="text-lg font-semibold text-[#fdd87c] hover:text-cyan-300"
                              >
                                {house.sport_name || 'House sem nome'}
                              </Link>
                              <p className="text-xs uppercase text-slate-400">
                                {house.sport_code || 'Sem codigo'} -{' '}
                                {house.country_code || 'XX'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                ID: {house.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col gap-3 text-sm text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full border border-white/10 bg-[#03121a] text-xs font-semibold uppercase text-slate-300">
                                {house.head?.avatar_url &&
                                house.head.avatar_url.trim() !== '' ? (
                                  <SafeImage
                                    src={house.head.avatar_url}
                                    alt={headName}
                                    className="h-full w-full rounded-full object-cover"
                                    width={48}
                                    height={48}
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center">
                                    {headName.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {headName}
                                </p>
                                {headUsername ? (
                                  <p className="text-xs text-slate-400">
                                    {headUsername}
                                  </p>
                                ) : (
                                  <p className="text-xs text-rose-300">
                                    Sem username
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400">
                              Moderadores ativos:{' '}
                              <span className="font-semibold text-white">
                                {house.moderators_count ?? 0}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-1 flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={house.status} />
                              <span className="text-xs text-slate-400">
                                Criada em {formatCreatedAt(house.created_at)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                                onClick={() =>
                                  router.push(`/admin/houses/${house.id}`)
                                }
                              >
                                Ver detalhes
                              </Button>
                              <Button
                                variant="outline"
                                className={secondaryButtonClasses}
                                onClick={() =>
                                  router.push(`/admin/houses/${house.id}/roles`)
                                }
                              >
                                Gerir roles
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
