'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Flag,
  Home,
  Search,
  Shield,
  Users,
  Construction,
} from 'lucide-react';

type HouseStatus = 'active' | 'construction' | 'development' | 'unknown';

type AdminHouse = {
  id: string;
  sport_name: string;
  sport_code?: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  head_username?: string | null;
  head_country?: string | null;
  members_count?: number | null;
};

type ApiResponse = {
  success: boolean;
  houses?: AdminHouse[];
  error?: string;
};

type SortField =
  | 'sport_name'
  | 'country_code'
  | 'status'
  | 'head_username'
  | 'created_at';

type SortDirection = 'asc' | 'desc';

export default function AdminHousesPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HouseStatus>('all');

  const [sortField, setSortField] = useState<SortField>('sport_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 1) Proteção de rota: só Admin / Super Admin
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  // 2) Fetch das houses
  useEffect(() => {
    const fetchHouses = async () => {
      setLoadingHouses(true);
      setError(null);

      try {
        const token = getToken();
        const res = await fetch('/api/admin/houses', {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        const data: ApiResponse = await res.json();

        if (!data.success || !data.houses) {
          setError(data.error || 'Failed to load Houses of Sports');
          setHouses([]);
          return;
        }

        setHouses(data.houses);
      } catch (err) {
        console.error('Error loading houses:', err);
        setError('Unexpected error while loading Houses of Sports');
        setHouses([]);
      } finally {
        setLoadingHouses(false);
      }
    };

    // só faz fetch se o user estiver autenticado e for admin
    if (!loading && user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchHouses();
    }
  }, [loading, user, getToken]);

  // 3) Derivados: contagens para os cards
  const stats = useMemo(() => {
    const total = houses.length;
    const active = houses.filter((h) => h.status === 'active').length;
    const construction = houses.filter((h) => h.status === 'construction').length;
    const development = houses.filter((h) => h.status === 'development').length;

    return { total, active, construction, development };
  }, [houses]);

  // 4) Filtro + ordenação em memória
  const filteredAndSortedHouses = useMemo(() => {
    let result = [...houses];

    // filtro de texto
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((h) => {
        const sport = h.sport_name?.toLowerCase() || '';
        const country = h.country_code?.toLowerCase() || '';
        const head = h.head_username?.toLowerCase() || '';
        return (
          sport.includes(q) ||
          country.includes(q) ||
          head.includes(q)
        );
      });
    }

    // filtro de status
    if (statusFilter !== 'all') {
      result = result.filter((h) => h.status === statusFilter);
    }

    // sort
    result.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      const valA = (a[sortField] ?? '') as string;
      const valB = (b[sortField] ?? '') as string;

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return result;
  }, [houses, search, statusFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatStatusLabel = (status: HouseStatus) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'construction':
        return 'Em Construção';
      case 'development':
        return 'Em Desenvolvimento';
      default:
        return 'Desconhecido';
    }
  };

  const statusBadgeClass = (status: HouseStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'construction':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'development':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-PT');
  };

  const canViewPage = user && (user.role === 'Super Admin' || user.role === 'Admin');

  if (!canViewPage) {
    // enquanto está a redirecionar
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Gestão das Houses of Sports: estados, Heads of House e evolução.
            </p>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Home className="h-4 w-4 text-blue-600" />
                  Total Houses
                </CardTitle>
                <CardDescription>Total de Houses criadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-green-600" />
                  Ativas
                </CardTitle>
                <CardDescription>Head definido + 5 membros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {stats.active}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Construction className="h-4 w-4 text-amber-600" />
                  Em Construção
                </CardTitle>
                <CardDescription>
                  Head definido, ainda a recrutar membros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  {stats.construction}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-slate-600" />
                  Em Desenvolvimento
                </CardTitle>
                <CardDescription>Sem Head definido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-700">
                  {stats.development}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros + pesquisa */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  Houses of Sports
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredAndSortedHouses.length} listadas)
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                Filtra e acompanha o estado de cada House por desporto e país.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-8"
                      placeholder="Pesquisar por desporto, país ou Head..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value: 'all' | HouseStatus) =>
                      setStatusFilter(value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados</SelectItem>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="construction">
                        Em construção
                      </SelectItem>
                      <SelectItem value="development">
                        Em desenvolvimento
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela */}
              <div className="rounded-md border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => toggleSort('sport_name')}
                      >
                        Desporto
                        {sortField === 'sport_name' &&
                          (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => toggleSort('country_code')}
                      >
                        País
                        {sortField === 'country_code' &&
                          (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => toggleSort('status')}
                      >
                        Estado
                        {sortField === 'status' &&
                          (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => toggleSort('head_username')}
                      >
                        Head of House
                        {sortField === 'head_username' &&
                          (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Membros
                      </TableHead>
                      <TableHead
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => toggleSort('created_at')}
                      >
                        Criada em
                        {sortField === 'created_at' &&
                          (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHouses && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          A carregar Houses of Sports...
                        </TableCell>
                      </TableRow>
                    )}

                    {!loadingHouses &&
                      filteredAndSortedHouses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Nenhuma House encontrada com os filtros atuais.
                          </TableCell>
                        </TableRow>
                      )}

                    {!loadingHouses &&
                      filteredAndSortedHouses.map((house) => (
                        <TableRow key={house.id}>
                          <TableCell className="font-medium">
                            {house.sport_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Flag className="h-3 w-3 text-gray-400" />
                              <span>{house.country_code}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusBadgeClass(house.status)}
                            >
                              {formatStatusLabel(house.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {house.head_username ? (
                              <span>{house.head_username}</span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Sem Head definido
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {house.members_count ?? 0}
                          </TableCell>
                          <TableCell>{formatDate(house.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/admin/houses/${house.id}`)
                              }
                            >
                              Gerir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {error && (
                <p className="text-sm text-red-600 mt-2">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
