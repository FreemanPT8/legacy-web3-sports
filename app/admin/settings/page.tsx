'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Loader2,
  Settings,
  Globe,
  Mail,
  Database,
  Shield,
  ArrowLeft,
} from 'lucide-react';

const generalSettings = [
  { label: 'Platform name', value: 'LEGACY' },
  { label: 'Supported languages', value: '6 languages (EN, PT, ES, FR, IT, DE)' },
  { label: 'Default language', value: 'English' },
];

const xpSettings = [
  { label: 'Profile unlock', value: '99 XP required' },
  { label: 'House private messages', value: '369 XP required' },
  { label: '7 day streak bonus', value: '222 XP reward' },
  { label: 'Daily mission XP', value: '12 XP per mission' },
];

const emailSettings = [
  { label: 'Email service', value: 'Resend (if configured)' },
  { label: 'Welcome emails', value: 'Enabled' },
  { label: 'Streak bonus emails', value: 'Enabled' },
];

const databaseSettings = [
  { label: 'Database provider', value: 'Supabase PostgreSQL' },
  { label: 'Row level security', value: 'Enabled on all tables' },
  { label: 'Migrations', value: 'Up to date' },
];

const notes = [
  'All configuration changes require a redeploy to take effect.',
  'Environment variables are managed in the Vercel dashboard.',
  'Database schema changes must be applied via migrations.',
  'XP thresholds are defined in lib/xp.ts.',
  'Always test changes in development before deploying to production.',
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const renderList = (items: { label: string; value: string }[]) => (
    <ul className="divide-y divide-white/5">
      {items.map((item) => (
        <li key={item.label} className="py-3">
          <p className="text-sm font-semibold text-white">{item.label}</p>
          <p className="text-xs text-slate-300">{item.value}</p>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#000c12] text-white px-4 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11] p-6 md:p-10 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                ADMIN SETTINGS
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#05212b]">
                  <Settings className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-white">
                    Platform settings
                  </h1>
                  <p className="text-sm text-slate-300">
                    Consolida configuracoes criticas da plataforma em seccoes
                    escuras, dividindo os blocos longos para leitura rapida.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60"
              asChild
            >
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao painel
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-cyan-300" />
                General settings
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Nome da plataforma, idiomas suportados e idioma por defeito.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderList(generalSettings)}</CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-cyan-300" />
                XP e gamification
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Thresholds utilizados nas paginas de educacao e comunidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderList(xpSettings)}
              <p className="mt-4 text-[11px] text-slate-400">
                Para alterar os valores edita <code className="text-cyan-300">lib/xp.ts</code> e
                faz redeploy.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5 text-cyan-300" />
                Email configuration
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Estado atual dos envios transacionais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderList(emailSettings)}
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#03121a] p-3 text-xs text-slate-300">
                <strong className="text-white">Configura Email:</strong> adiciona
                <span className="mx-1 font-mono text-cyan-300">RESEND_API_KEY</span>
                ao projeto na Vercel.
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5 text-cyan-300" />
                Database e storage
              </CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Estado dos recursos Supabase usados pela app.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderList(databaseSettings)}</CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="border border-white/10 bg-[#03121a]">
            <CardHeader>
              <CardTitle className="text-white">Notas importantes</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Checklist rapido antes de mexer em configuracoes criticas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-4 text-sm text-slate-300">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
