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
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [noSportPreference, setNoSportPreference] = useState(false);
  const [suggestNewSport, setSuggestNewSport] = useState(false);
  const [suggestedSportName, setSuggestedSportName] = useState('');
  const [suggestedCountry, setSuggestedCountry] = useState(formData.country);
  const [showConsentModal, setShowConsentModal] = useState(false);

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

  useEffect(() => {
    setSuggestedCountry((prev) => prev || formData.country);
  }, [formData.country]);

  const attemptSignup = async (consentGranted = false) => {
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

    if (!formData.country) {
      toast({
        title: 'Select your country',
        description: 'Please choose your country before continuing.',
        variant: 'destructive',
      });
      return;
    }

    if (noSportPreference) {
      if (!consentGranted) {
        setShowConsentModal(true);
        return;
      }
    } else if (!suggestNewSport && !formData.sportId) {
      toast({
        title: 'Select your sport',
        description: 'Please choose the sport you belong to before continuing.',
        variant: 'destructive',
      });
      return;
    }

    if (suggestNewSport && !suggestedSportName.trim()) {
      toast({
        title: 'Suggest a sport',
        description: 'Enter the name of the sport you want to suggest.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const selectionMethod = noSportPreference
      ? 'random_pool'
      : suggestNewSport
      ? 'suggested_pool'
      : 'chosen';

    const result = await signup({
      username: formData.username,
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password,
      country: formData.country,
      sport_id:
        !noSportPreference && !suggestNewSport ? formData.sportId : undefined,
      sportSelectionMethod: selectionMethod,
      allowRandomAssignment: noSportPreference ? consentGranted : undefined,
      suggestedSportName: suggestNewSport
        ? suggestedSportName.trim()
        : undefined,
      suggestedCountryCode: suggestNewSport
        ? suggestedCountry || formData.country
        : undefined,
    });

    if (result.success) {
      toast({
        title: 'Account created!',
        description: noSportPreference
          ? 'Registámos a tua conta e vamos atribuir-te um desporto oficial.'
          : 'Welcome to LEGACY. Start earning XP now!',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void attemptSignup(false);
  };

  const handleAcceptRandomAssignment = () => {
    setShowConsentModal(false);
    void attemptSignup(true);
  };

  const handleSportSelect = (value: string) => {
    if (value === '__suggest') {
      setSuggestNewSport(true);
      setFormData((prev) => ({ ...prev, sportId: '' }));
      return;
    }
    setSuggestNewSport(false);
    setSuggestedSportName('');
    setFormData((prev) => ({ ...prev, sportId: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#031b27] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 text-center mb-8">
        <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Academia Legacy</p>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Regista-te para desbloquear XP e a tua House</h1>
        <p className="text-sm text-slate-200">
          O registo é gratuito. Precisas apenas de escolher o teu país, definir um desporto oficial e começar o percurso
          cadete para entrares no onboarding por pop-ups da tua House.
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
                value={suggestNewSport ? '__suggest' : formData.sportId}
                onValueChange={handleSportSelect}
                disabled={noSportPreference || sportsLoading}
              >
                <SelectTrigger
                  aria-invalid={!formData.sportId && !sportsLoading && !suggestNewSport && !noSportPreference}
                  className="border-white/10 bg-[#000c12] text-left text-white"
                >
                  <SelectValue
                    placeholder={
                      noSportPreference
                        ? 'Checkbox ativa — sem desporto definido'
                        : sportsLoading
                        ? 'A carregar desportos...'
                        : 'Escolhe o teu desporto'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[220px] border-white/10 bg-[#04131b] text-white">
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__suggest">+ Sugerir novo desporto</SelectItem>
                </SelectContent>
              </Select>
              {sportsError ? (
                <p className="text-xs text-amber-300">{sportsError}</p>
              ) : (
                <p className="text-xs text-slate-300">
                  {sportsLoading
                    ? 'A carregar desportos oficiais...'
                    : 'Escolhe um desporto oficial ou sugere um novo.'}
                </p>
              )}
            </div>

            {suggestNewSport ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#04131b]/60 p-4 text-left space-y-3">
                <div className="space-y-2">
                  <Label className="text-slate-100">Nome do novo desporto *</Label>
                  <Input
                    value={suggestedSportName}
                    onChange={(e) => setSuggestedSportName(e.target.value)}
                    placeholder="Ex.: Escalada Indoor, Trail, Padel Adaptado"
                    className="border-white/10 bg-[#000c12] text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-100">País para a primeira House</Label>
                  <Select
                    value={suggestedCountry || undefined}
                    onValueChange={(value) => setSuggestedCountry(value)}
                  >
                    <SelectTrigger className="border-white/10 bg-[#000c12] text-left text-white">
                      <SelectValue placeholder="Seleciona o país da House inicial" />
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
                <p className="text-xs text-slate-300">
                  Vamos criar este desporto/House com base na tua sugestão. A tua conta fica na pool até os Super Admins
                  confirmarem.
                </p>
              </div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#04131b]/70 p-4 text-left">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="no-sport"
                  checked={noSportPreference}
                  onCheckedChange={(value) => {
                    const checked = Boolean(value);
                    setNoSportPreference(checked);
                    if (checked) {
                      setFormData((prev) => ({ ...prev, sportId: '' }));
                      setSuggestNewSport(false);
                      setSuggestedSportName('');
                    }
                  }}
                  className="mt-1 border-white/30 text-white"
                />
                <div>
                  <Label htmlFor="no-sport" className="cursor-pointer text-slate-100">
                    Ainda não tenho um desporto definido
                  </Label>
                  <p className="text-xs text-slate-300">
                    Se marcares esta opção, o Legacy pode atribuir-te provisoriamente um desporto quando houver vaga numa
                    House. Precisamos da tua autorização antes do registo.
                  </p>
                </div>
              </div>
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

      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="border-white/10 bg-[#04131b] text-white">
          <DialogHeader>
            <DialogTitle>Confirmar atribuição automática de desporto</DialogTitle>
            <DialogDescription className="text-slate-300">
              Se aceitares, o Legacy pode atribuir-te um desporto temporário para garantirmos acompanhamento humano enquanto
              a tua House oficial não abre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-200">
            <p>
              Vais entrar numa pool dedicada onde os Super Admins definem o desporto ideal para o teu perfil e atribuem-te a
              primeira House disponível.
            </p>
            <p className="text-xs text-slate-400">
              Podes sempre atualizar o teu desporto no perfil assim que escolheres um caminho definitivo.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowConsentModal(false)} className="border-white/20 text-white">
              Voltar atrás
            </Button>
            <Button onClick={handleAcceptRandomAssignment} className="bg-cyan-500 text-[#04131b] hover:bg-cyan-400">
              Aceito
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
