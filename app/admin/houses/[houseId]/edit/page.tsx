// app/admin/houses/[houseId]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trophy } from 'lucide-react';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface HouseDetailForEdit {
  id: string;
  name: string;
  sport_id: string | null;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
}

interface HouseDetailApiResponse {
  success: boolean;
  error?: string;
  house?: {
    id: string;
    name?: string;
    sport_id?: string | null;
    sport_name?: string | null;
    sport_code?: string | null;
    country_code?: string;
    status?: HouseStatus;
  };
}

export default function AdminEditHousePage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId;

  const { user, loading: authLoading, getToken } = useAuth();

  const [house, setHouse] = useState<HouseDetailForEdit | null>(null);
  const [sportId, setSportId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  // Proteção básica
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin') {
      // só Super Admin pode mexer na estrutura da House
      router.push('/admin/houses');
    }
  }, [authLoading, user, router]);

  // Carregar dados da House
  useEffect(() => {
    const fetchDetail = async () => {
      if (!houseId) return;

      setLoading(true);
      setError(null);

      try {
        const token = getToken();
        if (!token) {
          setError('No authentication token provided');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/houses/${houseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: HouseDetailApiResponse = await res.json();

        if (!res.ok || !json.success || !json.house) {
          setError(json.error || 'Failed to load House detail.');
          setLoading(false);
          return;
        }

        const h = json.house;

        const detail: HouseDetailForEdit = {
          id: h.id,
          name: h.name || 'Unnamed House',
          sport_id: h.sport_id ?? null,
          sport_name: h.sport_name ?? null,
          sport_code: h.sport_code ?? null,
          country_code: h.country_code ?? '',
          status: h.status ?? 'development',
        };

        setHouse(detail);
        setSportId(detail.sport_id || '');
        setCountryCode(detail.country_code || '');
      } catch (err: any) {
        console.error('Error loading House detail (edit):', err);
        setError(err?.message || 'Unexpected error while loading House.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user && isSuperAdmin && houseId) {
      fetchDetail();
    }
  }, [authLoading, user, isSuperAdmin, houseId, getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!house) return;

    if (!sportId.trim()) {
      setError('Sport ID is required.');
      return;
    }
    if (!countryCode.trim()) {
      setError('Country code is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sport_id: sportId.trim(),
          country_code: countryCode.trim(),
        }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update House.');
        return;
      }

      router.push(`/admin/houses/${house.id}`);
    } catch (err: any) {
      console.error('Error updating House (edit):', err);
      setError(err?.message || 'Unexpected error while updating House.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading House...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-gray-700">
              {error || 'House not found or could not be loaded.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/houses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Houses
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <button
            onClick={() => router.push(`/admin/houses/${house.id}`)}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to House detail
          </button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Edit House base data
              </CardTitle>
              <CardDescription>
                Editar <strong>sport_id</strong> e{' '}
                <strong>country_code</strong> desta House. Apenas{' '}
                <strong>Super Admin</strong> pode alterar estes campos.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">
                    House
                  </p>
                  <p className="font-medium text-gray-900">{house.name}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    ID: <span className="font-mono">{house.id}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Sport ID (UUID da tabela sports)
                  </label>
                  <Input
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500">
                    Atual: {house.sport_name || house.sport_code || 'Unknown'}{' '}
                    {house.sport_code && (
                      <span className="uppercase">({house.sport_code})</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Country code
                  </label>
                  <Input
                    value={countryCode}
                    onChange={(e) =>
                      setCountryCode(e.target.value.toUpperCase())
                    }
                  />
                  <p className="text-[11px] text-gray-500">
                    Atual: <span className="uppercase">{house.country_code}</span>
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/admin/houses/${house.id}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
