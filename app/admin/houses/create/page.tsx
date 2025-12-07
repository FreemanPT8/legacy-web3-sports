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
import { Loader2, Plus, Trophy } from 'lucide-react';
import { SafeImage } from '@/app/components/SafeImage';
import { format } from 'date-fns';

// -------------------------------
// Types
// -------------------------------
type HouseStatus = 'development' | 'under_construction' | 'active';

interface AdminHouse {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  avatar_url: string | null;
  head?: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  moderators_count: number;
}

interface ApiResponse {
  success: boolean;
  houses?: AdminHouse[];
  error?: string;
}

interface AssigneeUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface AssigneesResponse {
  success: boolean;
  users?: AssigneeUser[];
  error?: string;
}

interface HeadPostResponse {
  success: boolean;
  error?: string;
}

// -------------------------------
// Status Badge
// -------------------------------
function StatusBadge({ status }: { status: HouseStatus }) {
  const styles = {
    active: { label: 'Active', variant: 'default' as const },
    under_construction: { label: 'Under construction', variant: 'secondary' as const },
    development: { label: 'In development', variant: 'outline' as const },
  };
  const config = styles[status];

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}

// -------------------------------
// Component
// -------------------------------
export default function AdminHousesPage() {
  const router = useRouter();
  const { user, getToken, loading: authLoading } = useAuth();

  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HouseStatus>('all');

  // Head Editing
  const [assignees, setAssignees] = useState<AssigneeUser[]>([]);
  const [headEditRow, setHeadEditRow] = useState<string | null>(null);
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [savingHeadForId, setSavingHeadForId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  // -------------------------------
  // Fetch Houses
  // -------------------------------
  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      router.push('/login');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const res = await fetch('/api/admin/houses', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load Houses');
          setHouses([]);
          return;
        }

        setHouses(data.houses || []);
      } catch (err) {
        console.error(err);
        setError('Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, getToken, router]);

  // -------------------------------
  // Load Assignees on demand
  // -------------------------------
  const loadAssignees = async () => {
    if (!isSuperAdmin) return;
    if (assignees.length > 0) return;

    try {
      const token = getToken();
      const res = await fetch('/api/admin/onboarding/assignees', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: AssigneesResponse = await res.json();
      if (!data.success) return;

      setAssignees(
        (data.users || []).filter(
          (u) => u.role === 'Admin' || u.role === 'Super Admin',
        ),
      );
    } catch (e) {
      console.error('Error loading assignees:', e);
    }
  };

  // -------------------------------
  // Save Head
  // -------------------------------
  const saveHead = async (houseId: string) => {
    if (!isSuperAdmin) return;
    setSavingHeadForId(houseId);

    try {
      const token = getToken();

      const method = selectedHead ? 'POST' : 'DELETE';

      const res = await fetch(`/api/admin/houses/${houseId}/head`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: selectedHead ? JSON.stringify({ userId: selectedHead }) : null,
      });

      const data: HeadPostResponse = await res.json();

      if (!data.success) {
        alert(data.error || "Couldn't update Head");
        return;
      }

      // Refresh Houses
      const reload = await fetch('/api/admin/houses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const reloadData: ApiResponse = await reload.json();
      setHouses(reloadData.houses || []);

      setHeadEditRow(null);
      setSelectedHead('');
    } catch (err) {
      console.error(err);
      alert('Unexpected error');
    } finally {
      setSavingHeadForId(null);
    }
  };

  // -------------------------------
  // Filtering
  // -------------------------------
  const filtered = useMemo(() => {
    return houses.filter((h) => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();

      const headString = `${h.head?.full_name || ''} ${h.head?.username || ''}`.toLowerCase();

      return (
        (h.sport_name || '').toLowerCase().includes(s) ||
        (h.sport_code || '').toLowerCase().includes(s) ||
        h.country_code.toLowerCase().includes(s) ||
        headString.includes(s)
      );
    });
  }, [houses, search, statusFilter]);

  // -------------------------------
  // Render
  // -------------------------------
  if (
    authLoading ||
    !user ||
    (user.role !== 'Admin' && user.role !== 'Super Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading Houses...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10">
      <div className="container mx-auto max-w-7xl px-4 space-y-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Houses of Sports</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage Houses, Heads and Moderators.
            </p>
          </div>

          <Link href="/admin/houses/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create House
            </Button>
          </Link>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            ['Total', houses.length],
            ['Active', houses.filter((h) => h.status === 'active').length],
            ['Under Construction',
              houses.filter((h) => h.status === 'under_construction').length],
            ['Development',
              houses.filter((h) => h.status === 'development').length],
            ['Missing Head',
              houses.filter((h) => !h.head).length],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FILTERS */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <Input
                placeholder="Search sport, country or Head..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_construction">Under construction</SelectItem>
                  <SelectItem value="development">In development</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ERROR */}
        {error && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950">
            <CardContent className="py-4 text-red-800 dark:text-red-200 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {/* LIST */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Houses
            </CardTitle>
            <CardDescription>
              Showing {filtered.length} of {houses.length}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 flex items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading Houses...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No Houses found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b">
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="text-left py-2 px-3">Sport</th>
                      <th className="text-left py-2 px-3">Country</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Head</th>
                      <th className="text-left py-2 px-3">Mods</th>
                      <th className="text-left py-2 px-3">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((house) => {
                      const isEditing = headEditRow === house.id;

                      return (
                        <tr
                          key={house.id}
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                          onClick={() => !isEditing && router.push(`/admin/houses/${house.id}`)}
                        >
                          {/* SPORT */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-md overflow-hidden border bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                {house.avatar_url ? (
                                  <SafeImage
                                    src={house.avatar_url}
                                    width={48}
                                    height={48}
                                    alt={house.sport_name || 'House'}
                                  />
                                ) : (
                                  <span className="text-xs font-bold">
                                    {house.sport_code?.toUpperCase() ||
                                      house.country_code ||
                                      'H'}
                                  </span>
                                )}
                              </div>

                              <div
                                className="block text-blue-700 dark:text-blue-400 font-medium hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href={`/admin/houses/${house.id}`}>
                                  {house.sport_name}
                                </Link>
                                <div className="text-xs text-gray-500 uppercase">
                                  {house.sport_code}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* COUNTRY */}
                          <td className="py-3 px-3 uppercase text-xs font-mono">
                            {house.country_code}
                          </td>

                          {/* STATUS */}
                          <td className="py-3 px-3">
                            <StatusBadge status={house.status} />
                          </td>

                          {/* HEAD */}
                          <td className="py-3 px-3">
                            {!isEditing ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                  {house.head?.avatar_url ? (
                                    <SafeImage
                                      src={house.head.avatar_url}
                                      width={40}
                                      height={40}
                                      alt={house.head.full_name || 'Head'}
                                    />
                                  ) : (
                                    <span className="text-xs font-semibold">
                                      {house.head
                                        ? (house.head.full_name ||
                                            house.head.username ||
                                            'HH')
                                            .slice(0, 2)
                                            .toUpperCase()
                                        : 'HH'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-col">
                                  {house.head ? (
                                    <>
                                      <span className="font-medium">
                                        {house.head.full_name ||
                                          house.head.username}
                                      </span>
                                      {house.head.username && (
                                        <span className="text-xs text-gray-500">
                                          @{house.head.username}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-red-500">
                                      Missing Head
                                    </Badge>
                                  )}
                                </div>

                                {isSuperAdmin && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadAssignees();
                                      setSelectedHead(house.head?.user_id || '');
                                      setHeadEditRow(house.id);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Select
                                  value={selectedHead}
                                  onValueChange={setSelectedHead}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Select Head..." />
                                  </SelectTrigger>

                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {assignees.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.full_name || u.username || u.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* SAVE */}
                                <Button
                                  size="xs"
                                  onClick={() => saveHead(house.id)}
                                  disabled={savingHeadForId === house.id}
                                >
                                  {savingHeadForId === house.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Save'
                                  )}
                                </Button>

                                {/* CANCEL */}
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  onClick={() => setHeadEditRow(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* MODERATORS */}
                          <td className="py-3 px-3 text-center">
                            {house.moderators_count}
                          </td>

                          {/* CREATED */}
                          <td className="py-3 px-3 text-xs text-gray-500">
                            {house.created_at
                              ? format(new Date(house.created_at), 'dd/MM/yyyy')
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
