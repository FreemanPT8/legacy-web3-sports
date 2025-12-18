'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, ShieldCheck, Plus } from 'lucide-react';
import { COUNTRIES, getSortedCountries } from '@/lib/countries';

type SportOption = {
  id: string;
  code: string | null;
  name: string;
};

type SportsResponse = {
  success: boolean;
  sports?: SportOption[];
  error?: string;
};

type HouseStatus = 'development' | 'under_construction' | 'active';

const statusOptions: { label: string; value: HouseStatus }[] = [
  { label: 'Development (default)', value: 'development' },
  { label: 'Under construction', value: 'under_construction' },
  { label: 'Active', value: 'active' },
];

export default function CreateHousePage() {
  const router = useRouter();
  const { user, getToken, loading } = useAuth();
  const { toast } = useToast();

  const [sports, setSports] = useState<SportOption[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [selectedSport, setSelectedSport] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [status, setStatus] = useState<HouseStatus>('development');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');

  const countries = useMemo(() => getSortedCountries(), []);

  useEffect(() => {
    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchSports = async () => {
      setLoadingSports(true);
      try {
        const res = await fetch('/api/sports?locale=en');
        const data: SportsResponse = await res.json();
        if (res.ok && data.success && data.sports) {
          setSports(data.sports);
        }
      } catch (err) {
        console.error('Error fetching sports for house creation', err);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  const sanitizedCountry = countryCode.toUpperCase().trim();
  const hasValidCountry = countries.some(
    (country) => country.code === sanitizedCountry,
  );
  const selectCountryValue = hasValidCountry ? sanitizedCountry : undefined;
  const selectSportValue = selectedSport || undefined;
  const isFormValid =
    !!selectedSport && sanitizedCountry.length === 2 && status;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha o desporto e o país antes de criar a House.',
        variant: 'destructive',
      });
      return;
    }

    setFormSubmitting(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/houses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sport_id: selectedSport,
          country_code: sanitizedCountry,
          status,
          avatar_url: avatarUrl || null,
          description: description || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Não foi possível criar a House.');
      }

      toast({
        title: 'House criada',
        description: 'A nova House de Sports foi criada com sucesso.',
      });
      router.push('/admin/houses');
    } catch (err: any) {
      console.error('House creation failed:', err);
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao criar a House.',
        variant: 'destructive',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando painel de Houses...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-12">
      <div className="container mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-2xl">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase text-muted-custom">
            Admin / Houses
          </p>
          <h1 className="text-3xl font-bold text-white">Create a House of Sports</h1>
          <p className="text-sm text-muted-custom">
            Configure a nova House com país, desporto e estado para levá-la ao ecossistema.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card className="rounded-2xl border border-slate-800 bg-slate-950/30">
            <CardHeader>
              <CardTitle>House data</CardTitle>
              <CardDescription>Selecione o desporto, país, status e detalhes essenciais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-custom">
                  Select sport
                </p>
                <Select
                  value={selectSportValue}
                  onValueChange={setSelectedSport}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSports ? (
                      <SelectItem value="loading" disabled className="pointer-events-none opacity-70">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </SelectItem>
                    ) : (
                      sports.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id}>
                          {sport.code ? `${sport.code} — ${sport.name}` : sport.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-custom">
                  Country code
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <Select
                    value={selectCountryValue}
                    onValueChange={(value) => setCountryCode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.code} — {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or type ISO code"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                  />
                </div>
                {countryCode && countryCode.trim().length === 2 && (
                  <p className="text-[11px] text-muted-custom">
                    País selecionado: {COUNTRIES.find((c) => c.code === sanitizedCountry)?.name || 'Desconhecido'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-custom">
                  Status
                </p>
                <Select value={status} onValueChange={(value) => setStatus(value as HouseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-custom">
                  Avatar URL (opcional)
                </p>
                <Input
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-custom">
                  Description (opcional)
                </p>
                <Textarea
                  placeholder="Breve descrição ou contexto da House"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={!isFormValid || formSubmitting}
            >
              {formSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar House
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-slate-700 text-slate-100 hover:bg-slate-900"
              onClick={() => router.push('/admin/houses')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
