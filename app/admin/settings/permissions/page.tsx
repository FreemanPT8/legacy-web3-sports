'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ADMIN_TOGGLABLE_PERMISSIONS,
  PERMISSION_LABELS,
  type Permission,
} from '@/lib/permissions';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';

interface AdminPermissionsDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin';
  basePermissions: Permission[];
  extraPermissions: Permission[];
}

interface PermissionsGetResponse {
  success: boolean;
  admins?: AdminPermissionsDTO[];
  error?: string;
}

interface PermissionsPostResponse {
  success: boolean;
  error?: string;
}

const secondaryButtonClasses =
  'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

export default function AdminPermissionsPage() {
  const router = useRouter();
  const { user, getToken, loading } = useAuth();

  const [admins, setAdmins] = useState<AdminPermissionsDTO[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingForUser, setSavingForUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin) {
      router.push('/admin');
      return;
    }
  }, [user, loading, isSuperAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSuperAdmin) return;

      try {
        setLoadingData(true);
        setError(null);

        const token = getToken();
        if (!token) {
          setError('No authentication token provided.');
          setLoadingData(false);
          return;
        }

        const res = await fetch('/api/admin/permissions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: PermissionsGetResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load permissions.');
          setAdmins([]);
          setLoadingData(false);
          return;
        }

        setAdmins(data.admins || []);
      } catch (err: any) {
        console.error('Error loading admin permissions:', err);
        setError(err?.message || 'Unexpected error while loading permissions.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [getToken, isSuperAdmin]);

  const handleToggle = (userId: string, perm: Permission) => {
    setAdmins((prev) =>
      prev.map((admin) => {
        if (admin.id !== userId) return admin;

        const isBase = admin.basePermissions.includes(perm);
        if (isBase) return admin;

        const hasExtra = admin.extraPermissions.includes(perm);
        return {
          ...admin,
          extraPermissions: hasExtra
            ? admin.extraPermissions.filter((p) => p !== perm)
            : [...admin.extraPermissions, perm],
        };
      }),
    );
  };

  const handleSave = async (admin: AdminPermissionsDTO) => {
    try {
      setSavingForUser(admin.id);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided.');
        return;
      }

      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: admin.id,
          permissions: admin.extraPermissions,
        }),
      });

      const data: PermissionsPostResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update permissions.');
        return;
      }
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      setError(err?.message || 'Unexpected error while saving permissions.');
    } finally {
      setSavingForUser(null);
    }
  };

  const sortedPermissions = useMemo(
    () => [...ADMIN_TOGGLABLE_PERMISSIONS],
    [],
  );

  if (loading || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000c12] text-white px-4 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11] p-6 md:p-10 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                PERMISSIONS
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#05212b]">
                  <Shield className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-white">
                    Admin access control
                  </h1>
                  <p className="text-sm text-slate-300">
                    Divide formularios longos em blocos escuros e gere os toggles
                    sensiveis com controlo total por super admins.
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" className={secondaryButtonClasses} asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao painel
              </Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-white">Permissions summary</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Super admins mantem acesso completo e administradores podem receber
                permissoes extra atraves desta lista.
              </CardDescription>
            </CardHeader>
          </Card>

          {error && (
            <Card className="border border-rose-400/40 bg-rose-500/10">
              <CardContent className="py-3 text-sm text-rose-100">
                {error}
              </CardContent>
            </Card>
          )}

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-white">Admin roster</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                {loadingData
                  ? 'A carregar utilizadores com acesso administrativo...'
                  : `Mostrando ${admins.length} utilizador(es).`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading admin permissions...
                </div>
              ) : admins.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-300">
                  Nao existe nenhum Admin ou Super Admin registado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#05212b] text-xs uppercase tracking-[0.3em] text-slate-300">
                        <th className="px-4 py-3 font-medium">Utilizador</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">
                          Permissoes (clique para trocar)
                        </th>
                        <th className="px-4 py-3 font-medium">Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin, index) => {
                        const isSuper = admin.role === 'Super Admin';
                        const rowBg =
                          index % 2 === 0 ? 'bg-[#000c12]' : 'bg-[#020b11]';

                        return (
                          <tr key={admin.id} className={rowBg}>
                            <td className="px-4 py-4 align-top">
                              <p className="font-semibold text-white">
                                {admin.full_name || admin.username || 'Sem nome'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {admin.email}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                                  isSuper
                                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-100'
                                    : 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                                }`}
                              >
                                {admin.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 align-top">
                              {isSuper ? (
                                <p className="text-xs text-slate-400">
                                  Super admins possuem todas as permissoes.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {sortedPermissions.map((perm) => {
                                    const isBase = admin.basePermissions.includes(
                                      perm,
                                    );
                                    const isChecked =
                                      isBase ||
                                      admin.extraPermissions.includes(perm);

                                    return (
                                      <label
                                        key={perm}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#000c12] px-3 py-1 text-xs text-slate-200"
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          disabled={isBase}
                                          className="h-4 w-4 border-white/40 data-[state=checked]:border-cyan-300 data-[state=checked]:bg-cyan-500"
                                          onCheckedChange={() =>
                                            handleToggle(admin.id, perm)
                                          }
                                        />
                                        <span>
                                          {PERMISSION_LABELS[perm] || perm}
                                          {isBase && (
                                            <span className="ml-1 text-[10px] text-slate-400">
                                              (role)
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 align-top">
                              {!isSuper && (
                                <Button
                                  size="sm"
                                  className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
                                  onClick={() => handleSave(admin)}
                                  disabled={savingForUser === admin.id}
                                >
                                  {savingForUser === admin.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      A guardar...
                                    </>
                                  ) : (
                                    'Guardar'
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
