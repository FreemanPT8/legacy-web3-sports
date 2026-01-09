'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type AdminUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: 'Super Admin' | 'Admin' | 'Member';
};

type InviteRow = {
  id: string;
  email: string | null;
  status: string;
  inviteUrl: string;
  expires_at: string | null;
  created_at: string;
};

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
  const [featuredImage, setFeaturedImage] = useState<MediaAsset | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createdHouse, setCreatedHouse] = useState<{ id: string; name: string } | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadAdmins = async () => {
      setAdminsLoading(true);
      try {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch('/api/admin/users', { headers });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Falha ao carregar lista de Admins.');
        }
        const eligible: AdminUser[] = (data.users || []).filter(
          (u: AdminUser) => u.role === 'Admin' || u.role === 'Super Admin',
        );
        setAdminUsers(eligible);
      } catch (error) {
        if (!active) return;
        console.error('[houses/create] Failed to load admin users', error);
        setAdminUsers([]);
      } finally {
        if (active) setAdminsLoading(false);
      }
    };
    loadAdmins();
    return () => {
      active = false;
    };
  }, [user, getToken]);

  const loadInvites = useCallback(
    async (houseId: string) => {
      if (!houseId) return;
      setInvitesLoading(true);
      setInvitesError(null);
      try {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`/api/admin/houses/${houseId}/head-invites`, { headers });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Falha ao carregar convites.');
        }
        setInvites(data.invites || []);
      } catch (error) {
        console.error('[houses/create] loadInvites failed', error);
        setInvites([]);
        setInvitesError('Não foi possível carregar os convites.');
      } finally {
        setInvitesLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    if (!createdHouse?.id) return;
    void loadInvites(createdHouse.id);
  }, [createdHouse?.id, loadInvites]);

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
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Não foi possível criar a House.');
      }

      const sportName =
        sports.find((sport) => sport.id === selectedSport)?.name ?? 'Sport';
      const countryName =
        countries.find((country) => country.code === sanitizedCountry)?.name ??
        sanitizedCountry;
      const friendlyName = `House of ${sportName} ${countryName}`;
      const newHouseId: string | undefined = payload.houseId || payload.house?.id;
      if (newHouseId) {
        setCreatedHouse({ id: newHouseId, name: friendlyName });
        setInvites([]);
        setSelectedAdminId('');
        void loadInvites(newHouseId);
      }

      toast({
        title: 'House criada',
        description: newHouseId
          ? 'Agora podes convidar o Head desta House diretamente abaixo.'
          : 'A nova House de Sports foi criada com sucesso.',
      });

      setSelectedSport('');
      setCountryCode('');
      setStatus('development');
      setFeaturedImage(null);
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

  const handleSendInvite = async () => {
    if (!createdHouse?.id) {
      toast({
        title: 'Cria primeiro a House',
        description: 'Depois de criar a House podes enviar convites.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedAdminId) {
      toast({
        title: 'Escolhe uma conta Admin',
        description: 'Seleciona o administrador a convidar.',
        variant: 'destructive',
      });
      return;
    }
    const target = adminUsers.find((admin) => admin.id === selectedAdminId);
    if (!target) {
      toast({
        title: 'Conta inválida',
        description: 'Não foi possível encontrar essa conta Admin.',
        variant: 'destructive',
      });
      return;
    }
    if (!target.email) {
      toast({
        title: 'Conta sem email',
        description: 'Esta conta não tem email registado. Atualiza o perfil antes de enviar o convite.',
        variant: 'destructive',
      });
      return;
    }

    setInviteLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/admin/houses/${createdHouse.id}/head-invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: target.email }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Falha ao criar convite.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteUrl = origin
        ? `${origin}/head/invite?token=${data.token}`
        : `/head/invite?token=${data.token}`;

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target.id,
          type: 'head_invite',
          title: 'Foste convidado para liderar uma House',
          message: `O Legacy convidou-te para seres Head da ${createdHouse.name}.`,
          link: inviteUrl,
          data: { houseId: createdHouse.id },
        }),
      }).catch((error) => console.error('[houses/create] notification failed', error));

      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${target.full_name || target.username || target.email}.`,
      });
      setSelectedAdminId('');
      void loadInvites(createdHouse.id);
    } catch (error) {
      console.error('[houses/create] send invite failed', error);
      toast({
        title: 'Erro ao enviar convite',
        description:
          error instanceof Error ? error.message : 'Não foi possível enviar o convite.',
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async (url: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast({ title: 'Ligação copiada', description: 'O link do convite está no clipboard.' });
    } catch (error) {
      console.error('[houses/create] copy invite failed', error);
      toast({
        title: 'Não foi possível copiar',
        description: 'Copia manualmente o link apresentado.',
        variant: 'destructive',
      });
    }
  };

  const handleReloadInvites = () => {
    if (createdHouse?.id) {
      void loadInvites(createdHouse.id);
    }
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
                  House. Todos os campos são obrigatórios exceto a imagem
                  oficial.
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

              </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-[#000c12]/40 shadow-[0_35px_90px_rgba(3,10,25,0.45)]">
            <CardHeader>
              <CardTitle className="text-white">Convidar Head of House</CardTitle>
              <CardDescription className="text-slate-300">
                Apenas contas Admin e Super Admin podem ser convidadas. O convite envia uma
                notificação e inclui o termo de responsabilidade obrigatório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!createdHouse ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#04121d]/50 p-4 text-sm text-slate-300">
                  Cria primeiro a House para poderes enviar convites de Head.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-[#04121d]/60 p-4 text-sm text-slate-200">
                    <p className="font-semibold text-white">{createdHouse.name}</p>
                    <p className="text-xs text-slate-400">
                      ID: <span className="font-mono text-slate-300">{createdHouse.id}</span>
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[2fr,1fr] md:items-end">
                    <div className="space-y-2">
                      <p className={labelClass}>Selecionar Admin</p>
                      <Select value={selectedAdminId || undefined} onValueChange={setSelectedAdminId}>
                        <SelectTrigger className="border-white/10 bg-[#02121d]/80 text-white">
                          <SelectValue placeholder={adminsLoading ? 'A carregar...' : 'Escolhe a conta Admin'} />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#010f1a] text-white">
                          {adminsLoading ? (
                            <SelectItem value="loading" disabled>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              A carregar...
                            </SelectItem>
                          ) : adminUsers.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              Sem contas Admin disponíveis
                            </SelectItem>
                          ) : (
                            adminUsers.map((admin) => (
                              <SelectItem key={admin.id} value={admin.id}>
                                {(admin.full_name || admin.username || admin.email || 'Conta')}{' '}
                                <span className="text-xs uppercase text-slate-400">· {admin.role}</span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">
                        Apenas Admins e Super Admins são elegíveis. Certifica-te que a conta tem email válido.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSendInvite}
                      className="bg-[#fdd87c] text-[#1e1500] hover:bg-[#ffe7a6]/90"
                      disabled={inviteLoading || adminsLoading || !selectedAdminId}
                    >
                      {inviteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Enviar convite
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-[#04121d]/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">Convites enviados</p>
                        <p className="text-xs text-slate-400">
                          Inclui todos os convites pendentes, aceites ou cancelados.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={handleReloadInvites}
                        disabled={invitesLoading || !createdHouse}
                      >
                        Atualizar
                      </Button>
                    </div>
                    {invitesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A carregar convites...
                      </div>
                    ) : invites.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Ainda não existem convites para esta House.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {invites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#010b16]/70 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-white">
                                {invite.email || 'Sem email'}
                              </p>
                              <p className="text-xs text-slate-400">
                                Estado: <span className="capitalize">{invite.status}</span>{' '}
                                {invite.expires_at && `· expira ${new Date(invite.expires_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => handleCopyInvite(invite.inviteUrl)}
                              >
                                Copiar link
                              </Button>
                            </div>
                          </div>
                        ))}
                        {invitesError && (
                          <p className="text-xs text-amber-300">{invitesError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
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
