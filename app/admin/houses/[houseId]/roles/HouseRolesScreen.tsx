'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SafeImage } from '@/app/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield, User, Users } from 'lucide-react';

type ModeratorPermissions = {
  canManageMissions?: boolean;
  canManageContent?: boolean;
  canManageMembers?: boolean;
};

type ModeratorUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  permissions: ModeratorPermissions | null;
};

type HeadUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
};

type SuccessPayload<T> = { success: true } & T;
type ApiResponse<T> = SuccessPayload<T> | { success: false; error?: string };

type HeadTermContext = {
  latestVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
  term: { content: string } | null;
};

const panelBackground =
  'border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11]';
const bodyCopy = 'text-sm text-slate-200';

const PERMISSION_FIELDS: {
  key: keyof ModeratorPermissions;
  label: string;
  description: string;
}[] = [
  {
    key: 'canManageMissions',
    label: 'Missões',
    description: 'Pode criar, editar e arquivar missões da house.',
  },
  {
    key: 'canManageContent',
    label: 'Conteúdo',
    description: 'Pode gerir conteúdos destacados e módulos locais.',
  },
  {
    key: 'canManageMembers',
    label: 'Membros',
    description: 'Pode aprovar membros, gerir contacto e XP local.',
  },
];

interface HouseRolesScreenProps {
  focus?: 'roles' | 'permissions';
}

async function jsonRequest<T>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<SuccessPayload<T>> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const data = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !data.success) {
    const errorMessage =
      !res.ok && data.success
        ? 'Unexpected error'
        : data.success
          ? 'Unexpected error'
          : data.error || 'Unexpected error';
    throw new Error(errorMessage);
  }
  return data;
}

export function HouseRolesScreen({ focus = 'roles' }: HouseRolesScreenProps) {
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId;
  const router = useRouter();
  const { user, getToken, loading: authLoading } = useAuth();

  const [head, setHead] = useState<HeadUser | null>(null);
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headInput, setHeadInput] = useState('');
  const [headActionLoading, setHeadActionLoading] = useState(false);
  const [headNotes, setHeadNotes] = useState('');

  const [modInput, setModInput] = useState('');
  const [modActionLoading, setModActionLoading] = useState(false);
  const [modPermissions, setModPermissions] = useState<ModeratorPermissions>({
    canManageContent: true,
    canManageMembers: false,
    canManageMissions: false,
  });

  const [savingPermissions, setSavingPermissions] = useState<Record<string, boolean>>({});
  const [termContext, setTermContext] = useState<HeadTermContext | null>(null);
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [termConfirmed, setTermConfirmed] = useState(false);
  const [acceptingTerm, setAcceptingTerm] = useState(false);

  const canManage = user && (user.role === 'Super Admin' || user.role === 'Admin');
  const isSuperAdmin = user?.role === 'Super Admin';

  const permissionFocus = focus === 'permissions';

  const fetchData = useCallback(async () => {
    if (!houseId) return;
    const token = getToken();
    if (!token) {
      setError('Não foi possível autenticar a operação.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [headRes, moderatorsRes] = await Promise.all([
        jsonRequest<{ head: HeadUser | null }>(
          `/api/admin/houses/${houseId}/head`,
          token,
        ),
        jsonRequest<{ moderators: ModeratorUser[] }>(
          `/api/admin/houses/${houseId}/moderators`,
          token,
        ),
      ]);

      setHead(headRes.head ?? null);
      setModerators(moderatorsRes.moderators ?? []);
    } catch (err) {
      console.error('[Admin][House roles] fetch error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao carregar dados da house.',
      );
    } finally {
      setLoading(false);
    }
  }, [houseId, getToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !canManage) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, user, canManage, router, fetchData]);

  useEffect(() => {
    setTermConfirmed(false);
    if (!houseId || !head || !user || head.id !== user.userId) {
      setTermContext(null);
      setTermError(null);
      return;
    }
    void loadHeadTermContext();
  }, [houseId, head, user, loadHeadTermContext]);

  useEffect(() => {
    if (!permissionFocus) return;
    const timer = setTimeout(() => {
      document
        .getElementById('permissions-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => clearTimeout(timer);
  }, [permissionFocus]);

  const permissionCount = useMemo(
    () => moderators.filter((m) => m.permissions)?.length ?? 0,
    [moderators],
  );

  const loadHeadTermContext = useCallback(async () => {
    if (!houseId || !head || !user || head.id !== user.userId) return;
    const token = getToken();
    if (!token) return;
    try {
      setTermLoading(true);
      setTermError(null);
      const response = await fetch(`/api/admin/head-terms/context?houseId=${houseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as
        | (HeadTermContext & { success: true })
        | { success: false; error?: string };
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.success ? 'Falha inesperada.' : payload.error || 'Falha inesperada.');
      }
      setTermContext({
        latestVersion: payload.latestVersion,
        acceptedVersion: payload.acceptedVersion,
        acceptedAt: payload.acceptedAt,
        needsAcceptance: payload.needsAcceptance,
        term: payload.term,
      });
    } catch (err) {
      console.error('[Head term] load error', err);
      setTermError(err instanceof Error ? err.message : 'Não foi possível carregar o termo.');
    } finally {
      setTermLoading(false);
    }
  }, [getToken, head, houseId, user]);

  const handleAcceptTerm = async () => {
    if (!houseId || !termContext) return;
    const token = getToken();
    if (!token) return;
    setAcceptingTerm(true);
    try {
      const response = await fetch('/api/admin/head-terms/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ houseId, version: termContext.latestVersion }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Não foi possível registar a aceitação.');
      }
      toast({
        title: 'Termo aceite',
        description: 'Obrigado por confirmares o compromisso.',
      });
      setTermContext({
        latestVersion: termContext.latestVersion,
        acceptedVersion: termContext.latestVersion,
        acceptedAt: new Date().toISOString(),
        needsAcceptance: false,
        term: null,
      });
    } catch (err) {
      console.error('[Head term] accept error', err);
      toast({
        title: 'Erro ao aceitar termo',
        description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingTerm(false);
    }
  };

  const needsTermAcceptance =
    Boolean(termContext?.needsAcceptance) && Boolean(head && user && head.id === user.userId);

  const handleAssignHead = async () => {
    if (!headInput.trim() || !houseId) return;
    const token = getToken();
    if (!token) return;
    setHeadActionLoading(true);
    try {
      const body = JSON.stringify({ userId: headInput.trim() });
      const result = await jsonRequest<{ head: HeadUser | null }>(
        `/api/admin/houses/${houseId}/head`,
        token,
        {
          method: 'POST',
          body,
        },
      );
      setHead(result.head ?? null);
      setHeadInput('');
      if (headNotes.trim()) {
        console.info('[Admin][House roles] Nota Head:', headNotes.trim());
      }
    } catch (err) {
      console.error('[Admin][House roles] assign head error', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao definir Head da house.',
      );
    } finally {
      setHeadActionLoading(false);
    }
  };

  const handleRemoveHead = async () => {
    if (!houseId || !head) return;
    if (!isSuperAdmin) {
      setError('Apenas Super Admin pode remover um Head.');
      return;
    }
    const token = getToken();
    if (!token) return;
    setHeadActionLoading(true);
    try {
      await jsonRequest(`/api/admin/houses/${houseId}/head`, token, {
        method: 'DELETE',
      });
      setHead(null);
    } catch (err) {
      console.error('[Admin][House roles] remove head error', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao remover Head da house.',
      );
    } finally {
      setHeadActionLoading(false);
    }
  };

  const handleAddModerator = async () => {
    if (!houseId || !modInput.trim()) return;
    const token = getToken();
    if (!token) return;
    setModActionLoading(true);
    try {
      const body = JSON.stringify({
        userId: modInput.trim(),
        permissions: modPermissions,
      });
      const result = await jsonRequest<{ moderator: ModeratorUser }>(
        `/api/admin/houses/${houseId}/moderators`,
        token,
        {
          method: 'POST',
          body,
        },
      );
      setModerators((prev) => {
        const exists = prev.some((m) => m.id === result.moderator.id);
        if (exists) {
          return prev.map((m) =>
            m.id === result.moderator.id ? result.moderator : m,
          );
        }
        return [...prev, result.moderator];
      });
      setModInput('');
    } catch (err) {
      console.error('[Admin][House roles] add moderator error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao adicionar moderador.',
      );
    } finally {
      setModActionLoading(false);
    }
  };

  const handleRemoveModerator = async (userId: string) => {
    if (!houseId) return;
    const token = getToken();
    if (!token) return;
    setSavingPermissions((prev) => ({ ...prev, [userId]: true }));
    try {
      await jsonRequest(`/api/admin/houses/${houseId}/moderators`, token, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });
      setModerators((prev) => prev.filter((mod) => mod.id !== userId));
    } catch (err) {
      console.error('[Admin][House roles] remove moderator error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao remover moderador.',
      );
    } finally {
      setSavingPermissions((prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePermissionToggle = async (
    userId: string,
    key: keyof ModeratorPermissions,
    value: boolean,
  ) => {
    if (!houseId) return;
    const token = getToken();
    if (!token) return;
    setSavingPermissions((prev) => ({ ...prev, [userId]: true }));
    const target = moderators.find((mod) => mod.id === userId);
    const nextPermissions: ModeratorPermissions = {
      ...(target?.permissions ?? {}),
      [key]: value,
    };
    try {
      await jsonRequest(`/api/admin/houses/${houseId}/moderators`, token, {
        method: 'PATCH',
        body: JSON.stringify({ userId, permissions: nextPermissions }),
      });
      setModerators((prev) =>
        prev.map((mod) =>
          mod.id === userId ? { ...mod, permissions: nextPermissions } : mod,
        ),
      );
    } catch (err) {
      console.error('[Admin][House roles] update permissions error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar permissões.',
      );
    } finally {
      setSavingPermissions((prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  if (authLoading || !user || !canManage || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>A carregar gestão da house...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {needsTermAcceptance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#041021] via-[#031525] to-[#020b11] p-6 shadow-[0_45px_120px_rgba(1,10,26,0.65)]">
            <div className="mb-4 space-y-1 text-white">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Termo oficial</p>
              <h2 className="text-2xl font-semibold text-[#fdd87c]">Responsabilidade do Head</h2>
              <p className="text-xs text-white/60">Versão {termContext?.latestVersion ?? '—'}</p>
            </div>
            <div className="mb-4 text-xs text-white/70">
              Antes de alterar permissões ou pop-ups, confirma o termo de confiança do Legacy & Apertum.
            </div>
            <div className="mb-4 h-72 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              {termLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar termo...
                </div>
              ) : termError ? (
                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-100">{termError}</div>
              ) : (
                <p className="whitespace-pre-line leading-relaxed">
                  {termContext?.term?.content ?? 'Termo indisponível. Contacta o suporte do Legacy.'}
                </p>
              )}
            </div>
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-white/15 bg-black/20 p-4 text-sm text-white/80">
              <Checkbox
                id="head-term-check"
                checked={termConfirmed}
                disabled={termLoading || Boolean(termError)}
                onCheckedChange={(value) => setTermConfirmed(Boolean(value))}
                className="border-white/40 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-[#04131b]"
              />
              <label htmlFor="head-term-check" className="cursor-pointer leading-relaxed">
                Confirmo que li e aceito o termo de responsabilidade e os limites operacionais definidos.
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] font-semibold text-[#1e1500]"
                disabled={
                  !termConfirmed ||
                  acceptingTerm ||
                  termLoading ||
                  Boolean(termError) ||
                  !termContext?.term
                }
                onClick={handleAcceptTerm}
              >
                {acceptingTerm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Aceitar termo e continuar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-white/70 hover:text-white"
                onClick={() => void loadHeadTermContext()}
                disabled={acceptingTerm}
              >
                Recarregar termo
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className={`min-h-screen bg-[#000c12] text-white px-4 py-10 md:px-10 ${needsTermAcceptance ? 'blur-sm select-none pointer-events-none' : ''}`}>
        <div className="mx-auto w-full max-w-5xl space-y-8">
        <section
          className={`${panelBackground} rounded-3xl p-6 md:p-10 shadow-2xl shadow-black/40 space-y-4`}
        >
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
            {permissionFocus ? 'PERMISSIONS' : 'ROLES & LEADERSHIP'}
          </p>
          <h1 className="text-3xl font-semibold">
            {permissionFocus
              ? 'Permissões da House'
              : 'Head & moderadores'}
          </h1>
          <p className={bodyCopy}>
            {permissionFocus
              ? 'Ativa ou desativa capacidades operacionais de cada moderador mantendo o mesmo design visual do painel principal.'
              : 'Depois de definir o Head, adiciona moderadores e gere responsabilidades em segundos.'}
          </p>
          {error && (
            <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className={`${panelBackground} rounded-2xl`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-cyan-300" />
                Head atual
              </CardTitle>
              <CardDescription className={bodyCopy}>
                Apenas Super Admin pode trocar o Head.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {head ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#04121a] p-3">
                  <div className="h-12 w-12 rounded-full border border-white/10 bg-[#03121a]">
                    {head.avatar_url ? (
                      <SafeImage
                        src={head.avatar_url}
                        alt={head.full_name || head.username || 'Head'}
                        className="h-full w-full rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-slate-300">
                        {(head.full_name || head.username || 'HH')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-200">
                    <p className="font-semibold text-white">
                      {head.full_name || head.username || 'Head'}
                    </p>
                    {head.username && (
                      <p className="text-xs text-slate-400">@{head.username}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {head.email || 'sem email conhecido'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-rose-300">
                  Nenhum Head atribuído. Define um para desbloquear ações de
                  governaça.
                </p>
              )}
              {isSuperAdmin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-head" className="text-xs text-slate-300">
                      ID do utilizador para promover a Head
                    </Label>
                    <Input
                      id="new-head"
                      placeholder="uuid do utilizador"
                      value={headInput}
                      onChange={(e) => setHeadInput(e.target.value)}
                      className="bg-[#020b16] border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="head-notes" className="text-xs text-slate-300">
                      Notas internas (opcional)
                    </Label>
                    <Textarea
                      id="head-notes"
                      rows={3}
                      value={headNotes}
                      onChange={(e) => setHeadNotes(e.target.value)}
                      placeholder="Contexto sobre esta nomeação..."
                      className="bg-[#020b16] border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleAssignHead}
                      disabled={headActionLoading || !headInput.trim()}
                      className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
                    >
                      {headActionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <User className="mr-2 h-4 w-4" />
                      )}
                      Definir Head
                    </Button>
                    {head && (
                      <Button
                        variant="outline"
                        className="border-white/30 text-white hover:text-rose-300 hover:border-rose-400/60"
                        onClick={handleRemoveHead}
                        disabled={headActionLoading}
                      >
                        Remover Head
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={`${panelBackground} rounded-2xl`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-cyan-300" />
                Adicionar moderador
              </CardTitle>
              <CardDescription className={bodyCopy}>
                Heads e Super Admins podem criar moderadores locais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-moderator" className="text-xs text-slate-300">
                  ID do utilizador
                </Label>
                <Input
                  id="new-moderator"
                  placeholder="uuid do utilizador"
                  value={modInput}
                  onChange={(e) => setModInput(e.target.value)}
                  className="bg-[#020b16] border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#020b16] p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                  Permissões iniciais
                </p>
                <div className="space-y-3">
                  {PERMISSION_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-white">{field.label}</p>
                        <p className="text-xs text-slate-400">{field.description}</p>
                      </div>
                      <Switch
                        checked={!!modPermissions[field.key]}
                        onCheckedChange={(value) =>
                          setModPermissions((prev) => ({
                            ...prev,
                            [field.key]: value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleAddModerator}
                disabled={modActionLoading || !modInput.trim()}
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                {modActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-2 h-4 w-4" />
                )}
                Adicionar moderador
              </Button>
            </CardContent>
          </Card>
        </section>

        <section id="permissions-panel" className="space-y-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              PERMISSÕES ATIVAS
            </p>
            <p className={bodyCopy}>
              {permissionCount} moderador(es) com permissões dedicadas.
            </p>
          </div>
          <Card className={`${panelBackground} rounded-2xl`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-cyan-300" />
                Moderadores e permissões
              </CardTitle>
              <CardDescription className={bodyCopy}>
                Ajusta responsabilidades sem sair do ecossistema visual do painel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moderators.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-300">
                  Nenhum moderador atribuído ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {moderators.map((moderator) => (
                    <div
                      key={moderator.id}
                      className="rounded-2xl border border-white/10 bg-[#020b16] p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full border border-white/10 bg-[#03121a]">
                            {moderator.avatar_url ? (
                              <SafeImage
                                src={moderator.avatar_url}
                                alt={
                                  moderator.full_name ||
                                  moderator.username ||
                                  'Moderator'
                                }
                                className="h-full w-full rounded-full object-cover"
                                width={48}
                                height={48}
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300">
                                {(moderator.full_name ||
                                  moderator.username ||
                                  'MD')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-200">
                            <p className="font-semibold text-white">
                              {moderator.full_name ||
                                moderator.username ||
                                'Moderator'}
                            </p>
                            {moderator.username && (
                              <p className="text-xs text-slate-400">
                                @{moderator.username}
                              </p>
                            )}
                            <p className="text-xs text-slate-400">
                              {moderator.email || 'sem email conhecido'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="border-white/30 text-white hover:border-rose-400/60 hover:text-rose-300"
                            onClick={() => handleRemoveModerator(moderator.id)}
                            disabled={savingPermissions[moderator.id]}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {PERMISSION_FIELDS.map((field) => (
                          <div
                            key={field.key}
                            className="rounded-xl border border-white/5 bg-[#04121a] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm text-white">
                                  {field.label}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {field.description}
                                </p>
                              </div>
                              <Switch
                                checked={!!moderator.permissions?.[field.key]}
                                disabled={savingPermissions[moderator.id]}
                                onCheckedChange={(value) =>
                                  handlePermissionToggle(
                                    moderator.id,
                                    field.key,
                                    value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
    </>
  );
}
