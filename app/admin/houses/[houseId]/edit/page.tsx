'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Trophy } from 'lucide-react';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface Sport {
  id: string;
  code: string | null;
  name: string;
  created_at: string | null;
}

interface SportsApiResponse {
  success: boolean;
  sports?: Sport[];
  error?: string;
}

interface HouseFromApi {
  id: string;
  name?: string;
  sport_id?: string | null;       // opcional, se o API já devolver
  sport_name?: string | null;
  sport_code?: string | null;
  country_code?: string;
  status?: HouseStatus;
  created_at?: string | null;
  avatar_url?: string | null;
  description?: string | null;
}

interface HouseDetailApiResponse {
  success: boolean;
  error?: string;
  house?: HouseFromApi;
}

interface PatchResponse {
  success: boolean;
  error?: string;
}

const STATUS_OPTIONS: { value: HouseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'development', label: 'In development' },
];

const BASE_COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'PT', label: 'Portugal' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'IT', label: 'Italy' },
  { code: 'US', label: 'United States' },
  { code: 'BR', label: 'Brazil' },
];

export default function EditHousePage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId;

  const { user, getToken, loading: authLoading } = useAuth();

  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);

  const [house, setHouse] = useState<HouseFromApi | null>(null);
  const [loadingHouse, setLoadingHouse] = useState(true);

  const [sportId, setSportId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('PT');
  const [status, setStatus] = useState<HouseStatus>('development');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proteger rota: apenas Admin / Super Admin
  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // Carregar sports + dados da House em paralelo
  useEffect(() => {
    const fetchData = async () => {
      if (!houseId) return;

      setError(null);
      setLoadingSports(true);
      setLoadingHouse(true);

      try {
        const token = getToken();
        if (!token) {
          setError('No authentication token provided.');
          setLoadingSports(false);
          setLoadingHouse(false);
          return;
        }

        const [sportsRes, houseRes] = await Promise.all([
          fetch('/api/sports?locale=pt'),
          fetch(`/api/admin/houses/${houseId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const sportsJson: SportsApiResponse = await sportsRes.json();
        const houseJson: HouseDetailApiResponse = await houseRes.json();

        // Sports
        if (!sportsRes.ok || !sportsJson.success) {
          console.error('Error loading sports:', sportsJson.error);
          setError(sportsJson.error || 'Error loading sports.');
          setSports([]);
        } else {
          setSports(sportsJson.sports || []);
        }

        // House
        if (!houseRes.ok || !houseJson.success || !houseJson.house) {
          console.error('Error loading house detail:', houseJson.error);
          setError(
            houseJson.error || 'Failed to load House of Sports details.'
          );
          setHouse(null);
        } else {
          const h = houseJson.house;
          setHouse(h);

          // status
          setStatus(h.status ?? 'development');

          // country
          if (h.country_code) {
            setCountryCode(h.country_code);
          }

          // avatar & description
          setAvatarUrl(h.avatar_url ?? '');
          setDescription(h.description ?? '');

          // tentar deduzir sportId
          if (h.sport_id) {
            setSportId(h.sport_id);
          } else if (h.sport_code) {
            const match = (sportsJson.sports || []).find(
              (s) =>
                s.code &&
                s.code.toLowerCase() === h.sport_code?.toLowerCase()
            );
            if (match) {
              setSportId(match.id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data for House edit:', err);
        setError('Unexpected error while loading data for House edit.');
        setSports([]);
        setHouse(null);
      } finally {
        setLoadingSports(false);
        setLoadingHouse(false);
      }
    };

    if (!authLoading && user && houseId) {
      fetchData();
    }
  }, [authLoading, user, houseId, getToken]);

  const isLoading = authLoading || loadingSports || loadingHouse;

  const countryOptions = useMemo(() => {
    if (!countryCode) return BASE_COUNTRY_OPTIONS;

    const exists = BASE_COUNTRY_OPTIONS.some((c) => c.code === countryCode);
    if (!exists) {
      return [
        ...BASE_COUNTRY_OPTIONS,
        { code: countryCode, label: countryCode },
      ];
    }
    return BASE_COUNTRY_OPTIONS;
  }, [countryCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!houseId || !house) {
      setError('House data not loaded correctly.');
      return;
    }

    if (!sportId) {
      setError('Please select a sport.');
      return;
    }

    if (!countryCode.trim()) {
      setError('Please select a country code.');
      return;
    }

    try {
      setSubmitting(true);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${houseId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sport_id: sportId,
          country_code: countryCode,
          status,
          avatar_url: avatarUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data: PatchResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Error updating House of Sports.');
        setSubmitting(false);
        return;
      }

      router.push(`/admin/houses/${houseId}`);
    } catch (err) {
      console.error('Error updating House of Sports:', err);
      setError('Unexpected error while updating House of Sports.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (houseId) {
      router.push(`/admin/houses/${houseId}`);
    } else {
      router.push('/admin/houses');
    }
  };

  if (authLoading) {
    return null;
  }

  if (!isLoading && !house) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              {error || 'House not found or could not be loaded.'}
            </p>
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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

      <main className="flex-1 bg-blue-50/40">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <h1 className="text-3xl font-bold mb-6 text-blue-700">
            ADMIN · Edit House of Sports
          </h1>

          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to House
          </button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle>
                    Edit House {house?.name ? `· ${house.name}` : ''}
                  </CardTitle>
                  <CardDescription>
                    Adjust sport, country, status and public profile fields for
                    this House.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading data...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Sport */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sport
                    </label>
                    <Select
                      value={sportId}
                      onValueChange={(value) => setSportId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {sports.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.name}
                            {sport.code && (
                              <span className="ml-2 text-[11px] uppercase text-gray-400">
                                ({sport.code})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">
                      This defines which discipline this House belongs to.
                    </p>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <Select
                      value={countryCode}
                      onValueChange={(value) => setCountryCode(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">
                      Used for filters and in the generated House name.
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        setStatus(value as HouseStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">
                      You can always change this later from the House admin
                      panel.
                    </p>
                  </div>

                  {/* Avatar URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Avatar URL (optional)
                    </label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://... (House image)"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      For now, we use a direct image URL. Later this can be
                      replaced with an upload system.
                    </p>
                  </div>

                  {/* Short description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short description
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Public description for this House."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      You can write in Portuguese for now. Later this will be
                      internationalised.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goBack}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save changes
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
