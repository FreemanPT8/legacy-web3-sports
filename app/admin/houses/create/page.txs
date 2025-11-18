'use client';

import { FormEvent, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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

interface CreateHouseResponse {
  success: boolean;
  error?: string;
  house?: {
    id: string;
  };
}

const STATUS_OPTIONS: { value: HouseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'development', label: 'In development' },
];

const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'PT', label: 'Portugal' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'IT', label: 'Italy' },
  { code: 'US', label: 'United States' },
  { code: 'BR', label: 'Brazil' },
];

export default function CreateHousePage() {
  const router = useRouter();
  const { user, getToken, loading: authLoading } = useAuth();

  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);

  const [sportId, setSportId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('PT');
  const [status, setStatus] = useState<HouseStatus>('development');

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

  // Carregar lista de desportos
  useEffect(() => {
    const fetchSports = async () => {
      setLoadingSports(true);
      setError(null);

      try {
        const res = await fetch('/api/sports?locale=pt');
        const data: SportsApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading sports.');
          setSports([]);
          setLoadingSports(false);
          return;
        }

        setSports(data.sports || []);
      } catch (err) {
        console.error('Error loading sports for House creation:', err);
        setError('Network error while loading sports.');
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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

      const res = await fetch('/api/admin/houses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sportId,
          countryCode,
          status,
        }),
      });

      const data: CreateHouseResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Error creating House of Sports.');
        setSubmitting(false);
        return;
      }

      // Voltar para a lista de Houses
      router.push('/admin/houses');
    } catch (err) {
      console.error('Error creating House of Sports:', err);
      setError('Unexpected error while creating House of Sports.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    router.push('/admin/houses');
  };

  const isLoading = authLoading || loadingSports;
  const noSportsDefined = !isLoading && sports.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER GLOBAL */}
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Houses
          </button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle>Create a new House of Sports</CardTitle>
                  <CardDescription>
                    Define the sport, country and status. The name of the House
                    will be generated automatically (ex: &quot;House of
                    Climbing Portugal&quot;).
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
              ) : noSportsDefined ? (
                <div className="py-6 text-sm text-gray-700">
                  <p className="mb-2 font-medium">
                    No sports found in the platform.
                  </p>
                  <p className="mb-2">
                    To create a House of Sports you first need to define at
                    least one sport in the <code>sports</code> table of
                    Supabase.
                  </p>
                  <p className="text-xs text-gray-500">
                    After creating the sport (for example &quot;Climbing&quot;),
                    come back to this page and the sport will be available in
                    the dropdown.
                  </p>
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
                        {COUNTRY_OPTIONS.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">
                      This is used in the generated House name and for
                      filtering.
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
                      You can change the status later from the House admin
                      panel.
                    </p>
                  </div>

                  {/* Submit */}
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
                      Create House
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* FOOTER GLOBAL */}
      <Footer />
    </div>
  );
}
