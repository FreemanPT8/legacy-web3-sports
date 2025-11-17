'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
import { Trophy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface AdminHouse {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading Houses of Sports');
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

  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Houses of Sports</h1>
              <p className="text-gray-600">
                View and manage Houses, Heads of House and House Moderators.
              </p>
            </div>

            <Button onClick={() => router.push('/admin/houses/create')}>
              + Create new House
            </Button>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Search by sport, country or Head of House..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-60">
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as 'all' | HouseStatus)
                  }
                >
                  <SelectTrigger>
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
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>

          {/* Erro */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="pt-4 pb-4 text-red-800 text-sm">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Lista */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Houses list
              </CardTitle>
              <CardDescription>
                Showing {filtered.length} of {houses.length} Houses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Houses of Sports...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-gray-500 text-sm">
                  {houses.length === 0
                    ? 'No Houses found. Create the first House via the Create button or directly in the database.'
                    : 'No Houses match the current filters.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="py-2 px-3 text-left">Sport</th>
                        <th className="py-2 px-3 text-left">Country</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Head of House</th>
                        <th className="py-2 px-3 text-left">Moderators</th>
                        <th className="py-2 px-3 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((house) => (
                        <tr
                          key={house.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() =>
                            router.push(`/admin/houses/${house.id}`)
                          }
                        >
                          <td className="py-2 px-3">
                            <div className="font-medium">
                              {house.sport_name || 'Unknown sport'}
                            </div>
                            <div className="text-xs text-gray-500 uppercase">
                              {house.sport_code}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="uppercase text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {house.country_code}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge status={house.status} />
                          </td>
                          <td className="py-2 px-3">
                            {house.head ? (
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {house.head.full_name || house.head.username}
                                </span>
                                {house.head.username && (
                                  <span className="text-xs text-gray-500">
                                    @{house.head.username}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No Head defined
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-600">
                            {house.moderators_count ?? 0}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-500">
                            {house.created_at
                              ? format(
                                  new Date(house.created_at),
                                  'dd/MM/yyyy'
                                )
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
      </main>

      <Footer />
    </div>
  );
}
