'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Search } from 'lucide-react';

type HouseStatus = 'active' | 'building' | 'developing';

type AdminHouse = {
  id: string;
  sport_name?: string;
  sport_code?: string;
  country_code?: string;
  status?: HouseStatus | string;
  head_username?: string | null;
  head_email?: string | null;
  members_count?: number;
  created_at?: string;
};

export default function AdminHousesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HouseStatus>('all');

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'Admin' && user.role !== 'Super Admin'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchHouses = async () => {
      try {
        setLoadingHouses(true);
        setError(null);

        const res = await fetch('/api/admin/houses');
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Failed to load Houses of Sports');
          setHouses([]);
          return;
        }

        setHouses(data.houses ?? []);
      } catch (err) {
        console.error('Error loading admin houses:', err);
        setError('Unexpected error loading Houses');
        setHouses([]);
      } finally {
        setLoadingHouses(false);
      }
    };

    fetchHouses();
  }, []);

  const filteredHouses = useMemo(() => {
    return houses.filter((house) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (house.status && house.status.toLowerCase() === statusFilter);

      const term = search.trim().toLowerCase();
      if (!term) return matchesStatus;

      const sport = (house.sport_name || house.sport_code || '').toLowerCase();
      const country = (house.country_code || '').toLowerCase();
      const head = (house.head_username || '').toLowerCase();

      const matchesSearch =
        sport.includes(term) || country.includes(term) || head.includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [houses, search, statusFilter]);

  const getStatusBadge = (status?: string) => {
    const normalized = (status || '').toLowerCase();

    if (normalized === 'active') {
      return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
    }
    if (normalized === 'building') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">In Construction</Badge>;
    }
    if (normalized === 'developing') {
      return <Badge className="bg-gray-500 hover:bg-gray-600">In Development</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">Houses of Sports</h1>
              <p className="text-gray-600 dark:text-gray-300">
                View and manage Houses, Heads of House and House Moderators.
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative w-full md:max-w-sm">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search by sport, country or Head of House..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'all' | HouseStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="building">In Construction</SelectItem>
                    <SelectItem value="developing">In Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error / empty states */}
          {error && (
            <Card className="mb-6 border-red-500 bg-red-50">
              <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
            </Card>
          )}

          {/* Houses Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Houses list
              </CardTitle>
              <CardDescription>
                {loadingHouses
                  ? 'Loading Houses of Sports...'
                  : `Showing ${filteredHouses.length} of ${houses.length} Houses.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHouses ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Loading Houses of Sports...
                </div>
              ) : filteredHouses.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No Houses found. Create the first House directly in the database or via future
                  admin tools.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-100 dark:bg-gray-800/50">
                        <th className="text-left py-2 px-3">Sport</th>
                        <th className="text-left py-2 px-3">Country</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Head of House</th>
                        <th className="text-left py-2 px-3">Members</th>
                        <th className="text-left py-2 px-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHouses.map((house) => (
                        <tr
                          key={house.id}
                          className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <td className="py-2 px-3">
                            <div className="font-medium">
                              {house.sport_name || house.sport_code || '—'}
                            </div>
                          </td>
                          <td className="py-2 px-3">{house.country_code || '—'}</td>
                          <td className="py-2 px-3">{getStatusBadge(house.status as string)}</td>
                          <td className="py-2 px-3">
                            {house.head_username ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{house.head_username}</span>
                                {house.head_email && (
                                  <span className="text-xs text-gray-500">
                                    {house.head_email}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                No Head of House defined
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {typeof house.members_count === 'number'
                              ? house.members_count
                              : '—'}
                          </td>
                          <td className="py-2 px-3">
                            {house.created_at
                              ? new Date(house.created_at).toLocaleDateString()
                              : '—'}
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
