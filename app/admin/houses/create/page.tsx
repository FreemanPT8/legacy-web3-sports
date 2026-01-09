'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { COUNTRIES, getSortedCountries } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/app/components/SafeImage';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import type { MediaAsset } from '@/types/builder';

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

const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400';

export default function CreateHousePage() {
  const router = useRouter();
  const { user, getToken, loading } = useAuth();
  const { toast } = useToast();
  const mediaLibrary = useMediaLibrary();

  const [sports, setSports] = useState<SportOption[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [selectedSport, setSelectedSport] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [status, setStatus] = useState<HouseStatus>('development');
  const [description, setDescription] = useState('');
  const [featuredImage, setFeaturedImage] = useState<MediaAsset | null>(null);

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
      } catch (error) {
        console.error('Error fetching sports for house creation', error);
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
    !!selectedSport && sanitizedCountry.length === 2 && Boolean(status);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      toast({
        title: 'Dados incompletos',
        description: 'Preenche o desporto e o país antes de criar a House.',
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
          avatar_url: featuredImage?.url ?? null,
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
    } catch (error) {
      console.error('House creation failed:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Erro ao criar a House.',
        variant: 'destructive',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenMediaPicker = () => {
    mediaLibrary.openLibrary('library');
  };

  const handleSelectAsset = (asset: MediaAsset) => {
    setFeaturedImage(asset);
    mediaLibrary.closeLibrary();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#010913] text-slate-100">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando painel de Houses...
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#00141f] to-[#000c12] px-4 py-12 text-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-3xl border border-white/10 bg-[#00121d]/60 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Admin / Houses
            </p>
            <div>
              <h1 className="text-3xl font-semibold">
                Criar nova House of Sports
              </h1>
              <p className="text-sm text-slate-300">
                Toda a experiência usa a mesma paleta e brilho da página
                /education/xp para manter consistência visual com o resto da
                plataforma.
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Card className="rounded-3xl border border-white/10 bg-[#000c12]/50 shadow-[0_35px_90px_rgba(3,10,25,0.55)]">
              <CardHeader>
                <CardTitle className="text-white">Dados principais</CardTitle>
                <CardDescription className="text-slate-300">
                  Seleciona o desporto, o país e o estado operativo desta nova
                  House. Todos os campos são obrigatórios exceto a imagem e a
                  descrição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className={labelClass}>Desporto</p>
                  <Select value={selectSportValue} onValueChange={setSelectedSport}>
                    <SelectTrigger className="border-white/10 bg-[#02121d]/80 text-white">
                      <SelectValue placeholder="Escolhe um desporto" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#010f1a] text-white">
                      {loadingSports ? (
                        <SelectItem
                          value="loading"
                          disabled
                          className="pointer-events-none opacity-70"
                        >
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          A carregar...
                        </SelectItem>
                      ) : (
                        sports.map((sport) => (
                          <SelectItem key={sport.id} value={sport.id}>
                            {sport.code ? `${sport.code} · ${sport.name}` : sport.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>País</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Select
                      value={selectCountryValue}
                      onValueChange={(value) => setCountryCode(value)}
                    >
                      <SelectTrigger className="border-white/10 bg-[#02121d]/80 text-white">
                        <SelectValue placeholder="Seleciona um país" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#010f1a] text-white">
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.code} · {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Ou escreve o código ISO"
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                      className="border-white/10 bg-[#02121d]/80 text-white placeholder:text-slate-500"
                    />
                  </div>
                  {countryCode && countryCode.trim().length === 2 && (
                    <p className="text-xs text-slate-400">
                      País selecionado:{' '}
                      {COUNTRIES.find((c) => c.code === sanitizedCountry)?.name ||
                        'Desconhecido'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>Estado</p>
                  <Select value={status} onValueChange={(value) => setStatus(value as HouseStatus)}>
                    <SelectTrigger className="border-white/10 bg-[#02121d]/80 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#010f1a] text-white">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>Imagem oficial (opcional)</p>
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-[#02121d]/60 p-4">
                    {featuredImage ? (
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                          <SafeImage
                            src={featuredImage.url}
                            alt={featuredImage.alt || featuredImage.title || 'House avatar'}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 text-sm text-slate-200">
                          <p className="font-medium">
                            {featuredImage.title || 'Imagem selecionada'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {featuredImage.url}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Ainda não existe imagem selecionada para esta House.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleOpenMediaPicker}
                        className="bg-[#fdd87c] text-[#1e1500] hover:bg-[#ffe7a6]/90"
                      >
                        Escolher imagem
                      </Button>
                      {featuredImage ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFeaturedImage(null)}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    As imagens vêm diretamente da Media Library do Legacy.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>Descrição (opcional)</p>
                  <Textarea
                    placeholder="Breve descrição ou contexto para a House"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="border-white/10 bg-[#02121d]/80 text-white placeholder:text-slate-500"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                type="submit"
                className="flex-1 bg-[#fdd87c] text-[#1e1500] hover:bg-[#ffe7a6]/90"
                disabled={!isFormValid || formSubmitting}
              >
                {formSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Criar House
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={() => router.push('/admin/houses')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>

      <MediaLibraryDialog
        open={mediaLibrary.isOpen}
        onOpenChange={(open) =>
          open
            ? mediaLibrary.openLibrary(mediaLibrary.activeTab)
            : mediaLibrary.closeLibrary()
        }
        library={mediaLibrary}
        onSelect={handleSelectAsset}
        title="Escolher imagem para a House"
        description="Escolhe um ficheiro existente, faz upload ou adiciona uma URL alojada."
        allowUrl
      />
    </>
  );
}
