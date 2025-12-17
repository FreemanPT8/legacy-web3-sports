'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Trophy, Building2 } from 'lucide-react';

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
  sport_id?: string | null;
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

const inputClasses =
  'bg-[#000c12] border border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-cyan-300 focus-visible:border-cyan-300';
const helperClasses = 'mt-2 text-xs text-slate-400';
const labelClasses = 'mb-2 block text-sm font-medium text-slate-200';
const secondaryButtonClasses =
  'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

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

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

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

        if (!sportsRes.ok || !sportsJson.success) {
          console.error('Error loading sports:', sportsJson.error);
          setError(sportsJson.error || 'Error loading sports.');
          setSports([]);
        } else {
          setSports(sportsJson.sports || []);
        }

        if (!houseRes.ok || !houseJson.success || !houseJson.house) {
          console.error('Error loading house detail:', houseJson.error);
          setError(
            houseJson.error || 'Failed to load House of Sports details.',
          );
          setHouse(null);
        } else {
          const h = houseJson.house;
          setHouse(h);
          setStatus(h.status ?? 'development');

          if (h.country_code) {
            setCountryCode(h.country_code);
          }

          setAvatarUrl(h.avatar_url ?? '');
          setDescription(h.description ?? '');

          if (h.sport_id) {
            setSportId(h.sport_id);
          } else if (h.sport_code) {
            const match = (sportsJson.sports || []).find(
              (s) =>
                s.code &&
                s.code.toLowerCase() === h.sport_code?.toLowerCase(),
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House of Sports...</span>
        </div>
      </div>
    );
  }

  if (!isLoading && !house) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white px-4">
        <div className="rounded-3xl border border-white/10 bg-[#05212b] px-6 py-8 text-center space-y-4">
          <p className="text-sm text-slate-300">
            {error || 'House not found or could not be loaded.'}
          </p>
          <Button
            variant="outline"
            className={secondaryButtonClasses}
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000c12] text-white px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11] p-6 md:p-10 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                HOUSES EDIT
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#05212b]">
                  <Building2 className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-white">
                    Atualizar perfil da House
                  </h1>
                  <p className="text-sm text-slate-300">
                    Define desporto, pais, estado e texto pblico usando o mesmo
                    design system aplicado no painel das Houses.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className={secondaryButtonClasses}
              onClick={goBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para overview
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#03121a]">
                  <Trophy className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">
                    Editar House {house?.name ? `- ${house.name}` : ''}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-300">
                    Ajusta rapidamente atributos publicos da House e garante que
                    os formulrios seguem o design system.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-[#05212b]/70 px-4 py-3 text-sm text-slate-200">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  A carregar dados...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className={labelClasses}>Sport</label>
                      <Select
                        value={sportId}
                        onValueChange={(value) => setSportId(value)}
                      >
                        <SelectTrigger className={inputClasses}>
                          <SelectValue placeholder="Seleciona o desporto" />
                        </SelectTrigger>
                        <SelectContent className="border border-white/10 bg-[#03121a] text-white">
                          {sports.map((sport) => (
                            <SelectItem key={sport.id} value={sport.id}>
                              {sport.name}
                              {sport.code && (
                                <span className="ml-2 text-[11px] uppercase text-slate-400">
                                  ({sport.code})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={helperClasses}>
                        Define qual a disciplina associada a esta House.
                      </p>
                    </div>

                    <div>
                      <label className={labelClasses}>Country</label>
                      <Select
                        value={countryCode}
                        onValueChange={(value) => setCountryCode(value)}
                      >
                        <SelectTrigger className={inputClasses}>
                          <SelectValue placeholder="Seleciona o pais" />
                        </SelectTrigger>
                        <SelectContent className="border border-white/10 bg-[#03121a] text-white">
                          {countryOptions.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label} ({c.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={helperClasses}>
                        Utilizado em filtros e no nome publico da House.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className={labelClasses}>Status</label>
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          setStatus(value as HouseStatus)
                        }
                      >
                        <SelectTrigger className={inputClasses}>
                          <SelectValue placeholder="Estado atual" />
                        </SelectTrigger>
                        <SelectContent className="border border-white/10 bg-[#03121a] text-white">
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={helperClasses}>
                        Aparece em todas as listagens e pode ser alterado a
                        qualquer momento.
                      </p>
                    </div>
                    <div>
                      <label className={labelClasses}>
                        Avatar URL (optional)
                      </label>
                      <Input
                        value={avatarUrl}
                        onChange={(event) => setAvatarUrl(event.target.value)}
                        placeholder="https://... (House image)"
                        className={inputClasses}
                      />
                      <p className={helperClasses}>
                        Suporta apenas URL direto para imagem por agora.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Short description</label>
                    <Textarea
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Public description for this House."
                      className={inputClasses}
                    />
                    <p className={helperClasses}>
                      Usa portugues ou ingles. Futuramente sera traduzido.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-xs text-slate-300 hover:text-cyan-300"
                    >
                      Voltar sem guardar
                    </button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={secondaryButtonClasses}
                        onClick={goBack}
                        disabled={submitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
                      >
                        {submitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar alteracoes
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
