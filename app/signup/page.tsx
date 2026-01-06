'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { COUNTRIES } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trophy } from 'lucide-react';

type SportOption = { id: string; name: string };

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const { signup } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [sportsError, setSportsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: prefillEmail,
    password: '',
    confirmPassword: '',
    country: '',
    sportId: '',
  });

  useEffect(() => {
    let active = true;
    const loadSports = async () => {
      try {
        setSportsLoading(true);
        setSportsError(null);
        const response = await fetch(`/api/sports?locale=${encodeURIComponent(language || 'en')}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load sports');
        }
        const options: SportOption[] = (data.sports ?? []).map((sport: { id: string; name: string }) => ({
          id: sport.id,
          name: sport.name,
        }));
        setSports(options);
      } catch (error) {
        if (!active) return;
        console.error('[signup] failed to load sports', error);
        setSportsError('Falha ao carregar desportos.');
        setSports([]);
      } finally {
        if (active) setSportsLoading(false);
      }
    };
    void loadSports();
    return () => {
      active = false;
    };
  }, [language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.sportId) {
      toast({
        title: 'Select your sport',
        description: 'Please choose the sport you belong to before continuing.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const result = await signup({
      username: formData.username,
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password,
      country: formData.country,
      sport_id: formData.sportId,
    });

    if (result.success) {
      toast({
        title: 'Account created!',
        description: 'Welcome to LEGACY. Start earning XP now!',
      });
      router.push('/dashboard');
    } else {
      toast({
        title: 'Signup failed',
        description: result.error || 'Could not create account',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 text-center mb-8">
        <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Academia Legacy</p>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Regista-te para desbloquear XP e a tua House</h1>
        <p className="text-sm text-slate-200">
          O registo é gratuito. Precisas apenas de escolher o teu país, definir um desporto oficial e começar o percurso
          cadete para entrares no novo onboarding personalizado.
        </p>
      </div>

      <Card className="w-full max-w-xl mx-auto border border-white/10 bg-[#04131b]/80 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-amber-300" />
              <span className="text-2xl font-bold bg-gradient-to-r from-[#5af3ff] via-[#43c6dd] to-[#31a2c4] bg-clip-text text-transparent">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl text-white">{t('nav.signup')}</CardTitle>
          <CardDescription className="text-sm text-slate-200">
            Cria a tua conta e começa a ganhar XP todos os dias.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="username" className="text-slate-100">
                Username *
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Escolhe um username único"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="full_name" className="text-slate-100">
                Nome completo *
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Qual é o teu nome completo?"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="text-slate-100">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="O teu email principal"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="country" className="text-slate-100">
                País *
              </Label>
              <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                <SelectTrigger className="border-white/10 bg-[#000c12] text-left text-white">
                  <SelectValue placeholder="Seleciona o teu país" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] border-white/10 bg-[#04131b] text-white">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="sport" className="text-slate-100">
                Desporto da tua House *
              </Label>
              <Select
                value={formData.sportId}
                onValueChange={(value) => setFormData({ ...formData, sportId: value })}
                disabled={sportsLoading || !sports.length}
              >
                <SelectTrigger
                  aria-invalid={!formData.sportId && !sportsLoading}
                  className="border-white/10 bg-[#000c12] text-left text-white"
                >
                  <SelectValue placeholder={sportsLoading ? 'A carregar desportos...' : 'Escolhe o teu desporto'} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] border-white/10 bg-[#04131b] text-white">
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sportsError ? (
                <p className="text-xs text-amber-300">{sportsError}</p>
              ) : (
                <p className="text-xs text-slate-300">
                  {sportsLoading
                    ? 'A carregar desportos oficiais...'
                    : 'Escolhe o desporto que representa a tua House.'}
                </p>
              )}
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="text-slate-100">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minímo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="confirmPassword" className="text-slate-100">
                Confirmar password *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Volta a escrever a password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)]"
              disabled={loading}
            >
              {loading ? 'A criar conta...' : t('nav.signup')}
            </Button>
            <p className="text-sm text-center text-slate-300">
              Já tens conta?{' '}
              <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
                {t('nav.login')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
