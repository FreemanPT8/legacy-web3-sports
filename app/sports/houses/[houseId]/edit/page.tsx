'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Trophy,
  User,
  Users,
} from 'lucide-react';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface House {
  id: string;
  name: string;
  country_code: string | null;
  status: PublicHouseStatus;
  created_at: string | null;
  sport: {
    id: string;
    code: string;
    name: string;
  } | null;
  head: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
  moderators: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  }[];
}

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

interface HouseProfileApiResponse {
  success: boolean;
  error?: string;
  locale?: string;
  profile?: {
    house_id: string;
    image_url: string | null;
    tagline_i18n?: Record<string, string>;
    description_i18n?: Record<string, string>;
    tagline?: string;
    description?: string;
    updated_at?: string | null;
  } | null;
}

function formatStatusLabel(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'UNDER_CONSTRUCTION':
      return 'Em construção';
    case 'IN_DEVELOPMENT':
      return 'Em desenvolvimento';
    default:
      return status;
  }
}

function statusBadgeClass(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
    case 'UNDER_CONSTRUCTION':
      return 'inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] px-2.5 py-0.5 border border-amber-200';
    case 'IN_DEVELOPMENT':
    default:
      return 'inline-flex items-center rounded-full bg-gray-50 text-gray-600 text-[11px] px-2.5 py-0.5 border border-gray-200';
  }
}

export default function EditHousePublicProfilePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const houseId = params?.houseId;

  const [house, setHouse] = useState<House | null>(null);
  const [houseLoading, setHouseLoading] = useState(true);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [generalError, setGeneralError] = useState<string | null>(null);

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return new Date(house.created_at).toLocaleString('pt-PT');
    } catch {
      return house.created_at;
    }
  }, [house?.created_at]);

  // 1) Proteção básica (apenas Admin / Super Admin por agora)
  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAdmin) {
      // não tem permissão para editar
      setGeneralError(
        'Apenas administradores podem editar o perfil público das Houses nesta fase.'
      );
    }
  }, [authLoading, user, isAdmin]);

  // 2) Carregar dados da House + perfil
  useEffect(() => {
    if (!houseId) return;

    const fetchData = async () => {
      setHouseLoading(true);
      setProfileLoading(true);
      setGeneralError(null);
      setProfileError(null);

      try {
        // Houses
        const housesRes = await fetch('/api/sports/houses?locale=pt');
        const housesJson: HousesApiResponse = await housesRes.json();

        if (!housesRes.ok || !housesJson.success) {
          throw new Error(
            housesJson.error || 'Erro ao carregar House of Sports.'
          );
        }

        const thisHouse =
          (housesJson.houses || []).find((h) => h.id === houseId) || null;

        setHouse(thisHouse || null);

        // Perfil
        const profileRes = await fetch(
          `/api/house-profiles/${houseId}?locale=pt`
        );
        const profileJson: HouseProfileApiResponse = await profileRes.json();

        if (!profileRes.ok || !profileJson.success) {
          setProfileError(
            profileJson.error || 'Erro ao carregar perfil da House.'
          );
        }

        const profile = profileJson.profile ?? null;

        setImageUrl(profile?.image_url || '');
        setTagline(profile?.tagline || '');
        setDescription(profile?.description || '');
      } catch (err: any) {
        console.error('Error loading house/profile for edit:', err);
        setGeneralError(
          err?.message ||
            'Erro inesperado ao carregar dados da House para edição.'
        );
      } finally {
        setHouseLoading(false);
        setProfileLoading(false);
      }
    };

    fetchData();
  }, [houseId]);

  const handleSave = async () => {
    if (!houseId) return;

    setSaving(true);
    setGeneralError(null);

    try {
      const res = await fetch(`/api/house-profiles/${houseId}?locale=pt`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl || null,
          tagline,
          description,
        }),
      });

      const json: HouseProfileApiResponse = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Erro ao guardar perfil',
          description: json.error || 'Tenta novamente dentro de alguns minutos.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Perfil atualizado',
        description: 'O perfil público desta House foi guardado com sucesso.',
      });
    } catch (err) {
      console.error('Error saving house profile:', err);
      toast({
        title: 'Erro de rede',
        description: 'Não foi possível comunicar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Estados de loading / sem permissão
  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>A carregar dados da House…</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-gray-700 mb-4">
              {generalError ||
                'Não tens permissões para editar o perfil desta House.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/sports/houses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Houses
            </Button>
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
          <div className="text-center max-w-md px-4">
            <p className="text-gray-700 mb-4">
              {generalError || 'House não encontrada.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/sports/houses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Houses
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
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => router.push(`/sports/houses/${house.id}`)}
            className="mb-4 inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao perfil público
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shadow-sm">
                <Trophy className="h-7 w-7 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  Editar perfil da House
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Ajusta a imagem, tagline e descrição pública da House de{' '}
                  <span className="font-semibold">{house.name}</span>.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-right">
              <div className="font-mono text-[11px] truncate">
                ID: {house.id}
              </div>
              {createdAtFormatted && (
                <div>Criada em: {createdAtFormatted}</div>
              )}
              <div className={statusBadgeClass(house.status) + ' mt-1'}>
                {formatStatusLabel(house.status)}
              </div>
            </div>
          </div>

          {generalError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generalError}
            </div>
          )}

          {profileError && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {profileError}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-[1.6fr,1.4fr]">
            {/* Coluna principal: tagline + descrição */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-600" />
                  Conteúdo público da House
                </CardTitle>
                <CardDescription>
                  Este texto aparece na página pública da House. Por agora está
                  apenas em português.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline / frase curta</Label>
                  <Input
                    id="tagline"
                    placeholder="Ex: Comunidade oficial de escalada em Portugal, focada em Web3."
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500">
                    Uma frase curta que resume a House. Exemplo: “Comunidade
                    oficial de natação em Portugal na Apertum Blockchain”.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição pública</Label>
                  <Textarea
                    id="description"
                    rows={8}
                    placeholder="Explica a visão desta House, o tipo de membros que procura, e como se liga ao mundo Web3 e à Apertum."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500">
                    Esta descrição vai aparecer na secção “Sobre esta House”.
                    Mais tarde poderás traduzir para outras línguas.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Coluna lateral: imagem + info de liderança */}
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    Imagem / avatar da House
                  </CardTitle>
                  <CardDescription>
                    Usa uma imagem quadrada (ideal 1:1). No futuro haverá um
                    template visual padrão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL da imagem</Label>
                    <Input
                      id="image_url"
                      placeholder="https://…"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-gray-500">
                      Por agora, cola aqui o URL de uma imagem hospedada
                      externamente (ex: CDN, site oficial, etc.).
                    </p>
                  </div>

                  <div className="border rounded-xl bg-gray-50/70 p-3 flex items-center justify-center min-h-[140px]">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={`Imagem da House ${house.name}`}
                        className="max-h-32 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-xs text-gray-500">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <span>Pré-visualização da imagem da House</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Liderança atual
                  </CardTitle>
                  <CardDescription>
                    Informação apenas de leitura, vinda da configuração da House.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-gray-700">
                  {house.head ? (
                    <div>
                      <p className="font-semibold">
                        Head of House:{' '}
                        {house.head.full_name || house.head.username}
                      </p>
                      <p className="text-gray-500">
                        {house.head.username && <>@{house.head.username} · </>}
                        {house.head.role || 'Membro'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Esta House ainda não tem Head definido.
                    </p>
                  )}

                  <div className="pt-2 border-t">
                    <p className="flex items-center gap-1 font-medium mb-1">
                      <Users className="h-3 w-3" />
                      Moderadores
                    </p>
                    {house.moderators.length === 0 ? (
                      <p className="text-gray-500">
                        Ainda sem moderadores atribuídos.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {house.moderators.map((mod) => (
                          <li key={mod.user_id}>
                            <span className="font-medium">
                              {mod.full_name || mod.username}
                            </span>
                            <span className="text-gray-500">
                              {mod.username && <> · @{mod.username}</>}{' '}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-[11px] text-gray-500 max-w-xl">
              Estas definições afetam apenas a página pública desta House. Em
              futuras versões, poderás gerir aqui também traduções, missões e
              conteúdos destacados.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push(`/sports/houses/${house.id}`)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || profileLoading}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar perfil
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
