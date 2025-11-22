// app/admin/houses/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Trophy, Loader2, Plus } from 'lucide-react';
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

// --- tipos para gestão de Heads ---
interface AssigneeUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface AssigneesResponse {
  success: boolean;
  error?: string;
  users?: AssigneeUser[];
}

interface HeadPostResponse {
  success: boolean;
  error?: string;
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

  // --- estados para gestão de Head ---
  const [assignees, setAssignees] = useState<AssigneeUser[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);
  const [savingHeadForHouseId, setSavingHeadForHouseId] = useState<
    string | null
  >(null);

  const isSuperAdmin = user?.role === 'Super Admin';

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

  // carregar lista de possíveis Heads (Admins / Super Admins)
  const loadAssignees = async () => {
    if (!isSuperAdmin) return;
    if (assigneesLoading || assignees.length > 0) return;

    setAssigneesLoading(true);
    setAssigneesError(null);

    try {
      const token = getToken();
      if (!token) {
        setAssigneesError('No authentication token provided');
        setAssigneesLoading(false);
        return;
      }

      const res = await fetch('/api/admin/onboarding/assignees', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: AssigneesResponse = await res.json();
      if (!data.success) {
        setAssigneesError(data.error || 'Failed to load admins');
        setAssignees([]);
        return;
      }

      // apenas Admin / Super Admin podem ser Heads
      const filtered = (data.users || []).filter(
        (u) => u.role === 'Admin' || u.role === 'Super Admin'
      );
      setAssignees(filtered);
    } catch (err: any) {
      console.error('Error loading assignees:', err);
      setAssigneesError(
        err?.message || 'Unexpected error while loading admins'
      );
      setAssignees([]);
    } finally {
      setAssigneesLoading(false);
    }
  };

  const reloadHouses = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
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
        setError(data.error || 'Failed to load Houses of Sports');
        setHouses([]);
        return;
      }

      setHouses(data.houses || []);
    } catch (err) {
      console.error('Error reloading houses in /admin/houses:', err);
      setError('Unexpected error while reloading Houses of Sports');
    }
  };

  // mudar Head de uma House (usa agora /api/admin/houses/[houseId]/head)
  const handleChangeHead = async (houseId: string, headUserId: string | '') => {
    if (!isSuperAdmin) return;

    try {
      setSavingHeadForHouseId(houseId);
      const token = getToken();
      if (!token) {
        alert('No authentication token provided');
        return;
      }

      let res: Response;
      let data: HeadPostResponse;

      if (!headUserId) {
        // remover Head
        res = await fetch(`/api/admin/houses/${houseId}/head`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || 'Failed to remove Head of House');
          return;
        }
      } else {
        // definir / alterar Head
        res = await fetch(`/api/admin/houses/${houseId}/head`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: headUserId,
          }),
        });
        data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || 'Failed to update Head of House');
          return;
        }
      }

      await reloadHouses();
    } catch (err) {
      console.error('Error updating Head of House:', err);
      alert('Unexpected error while updating Head of House');
    } finally {
      setSavingHeadForHouseId(null);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Título + botão criar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1">Houses of Sports</h1>
              <p className="text-gray-600">
                View and manage Houses, Heads of House and House Moderators.
              </p>
            </div>
            <Link href="/admin/houses/create">
              <Button type="button">
                <Plus className="h-4 w-4 mr-2" />
                Create new House
              </Button>
            </Link>
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
                    ? 'No Houses found. Create the first House using the button above.'
                    : 'No Houses match the current filters.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3">Sport</th>
                        <th className="text-left py-2 px-3">Country</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Head of House</th>
                        <th className="text-left py-2 px-3">Moderators</th>
                        <th className="text-left py-2 px-3">Created</th>
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
                            <Link
                              href={`/admin/houses/${house.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <div className="font-medium text-blue-700 hover:underline">
                                {house.sport_name || 'Unknown sport'}
                              </div>
                              <div className="text-xs text-gray-500 uppercase">
                                {house.sport_code}
                              </div>
                            </Link>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {house.id}
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
                            <div className="flex flex-col gap-1">
                              {house.head ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {house.head.full_name ||
                                      house.head.username}
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

                              {isSuperAdmin && (
                                <div
                                  className="mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <select
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={house.head?.user_id || ''}
                                    onChange={(e) =>
                                      handleChangeHead(
                                        house.id,
                                        e.target.value
                                      )
                                    }
                                    onFocus={() => {
                                      if (assignees.length === 0) {
                                        void loadAssignees();
                                      }
                                    }}
                                    disabled={
                                      assigneesLoading ||
                                      savingHeadForHouseId === house.id
                                    }
                                  >
                                    <option value="">
                                      {house.head
                                        ? 'Remove Head'
                                        : 'Define Head'}
                                    </option>
                                    {assignees.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name || u.username || u.email}{' '}
                                        ({u.role})
                                      </option>
                                    ))}
                                  </select>
                                  {assigneesError && (
                                    <div className="mt-1 text-[10px] text-red-500">
                                      {assigneesError}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
