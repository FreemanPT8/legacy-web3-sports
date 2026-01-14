'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { SPORTS_ROLES } from '@/lib/i18n';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { Award, Lock, Trophy, User } from 'lucide-react';
import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

const XP_UNLOCK = 99;
const UI = {
  eyebrow: 'text-xs uppercase tracking-[0.5em] text-cyan-300',
  heroTitle: 'leading-tight font-bold tracking-tight text-[#fdd87c] text-4xl md:text-6xl',
  sectionTitle: 'mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#fdd87c]',
  sectionSubtitle: 'mt-3 text-sm text-slate-200',
  body: 'text-sm text-slate-200',
  bodyMuted: 'text-sm text-slate-300',
  micro: 'text-xs text-slate-300',
  cardTitle: 'text-lg font-semibold text-white',
  panel:
    'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_25px_60px_rgba(2,10,20,0.65)]',
  cardSurface: 'rounded-2xl border border-white/10 bg-[#04131b]/80 backdrop-blur',
  statCard:
    'rounded-2xl border border-white/15 bg-[#000c12]/40 px-4 py-3 text-center shadow-lg shadow-black/40',
  haloCyan: 'absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl',
  haloGold: 'absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fdd87c]/10 blur-3xl',
  ctaPrimary:
    'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]',
  ctaOutline: 'border-white/40 text-white hover:bg-white/10',
};

const xpRewards: Record<string, number> = {
  bio: 25,
  sports_role: 19,
  telegram: 19,
  dao1_did_nft: 33,
  wallet_address: 19,
  website: 0,
  youtube: 9,
  linkhub: 33,
  facebook: 9,
  instagram: 9,
};

type SportOption = { id: string; name: string };

type ProfilePayload = {
  username: string;
  full_name: string;
  email: string;
  country: string;
  sport_id: string;
  primary_sport_id: string;
  bio: string;
  sports_role: string;
  telegram: string;
  dao1_did_nft: string;
  wallet_address: string;
  website: string;
  youtube: string;
  linkhub: string;
  facebook: string;
  instagram: string;
  profile_visibility: {
    bio: boolean;
    sports_role: boolean;
    telegram: boolean;
    dao1_did_nft: boolean;
    wallet_address: boolean;
    website: boolean;
    youtube: boolean;
    linkhub: boolean;
    facebook: boolean;
    instagram: boolean;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, getToken, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfilePayload>({
    username: '',
    full_name: '',
    email: '',
    country: '',
    sport_id: '',
    primary_sport_id: '',
    bio: '',
    sports_role: '',
    telegram: '',
    dao1_did_nft: '',
    wallet_address: '',
    website: '',
    youtube: '',
    linkhub: '',
    facebook: '',
    instagram: '',
    profile_visibility: {
      bio: false,
      sports_role: false,
      telegram: false,
      dao1_did_nft: false,
      wallet_address: false,
      website: true,
      youtube: false,
      linkhub: false,
      facebook: false,
      instagram: false,
    },
  });
  const [previousProfile, setPreviousProfile] = useState<Record<string, any> | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [sportOptions, setSportOptions] = useState<SportOption[]>([]);
  const [sportLoading, setSportLoading] = useState(false);
  const [sportSaving, setSportSaving] = useState(false);
  const [sportError, setSportError] = useState<string | null>(null);
  const [primarySportSelection, setPrimarySportSelection] = useState('');
  const [secondarySportSelection, setSecondarySportSelection] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || profileLoaded) return;
    let active = true;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const response = await fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load profile');
        }
        const profile = data.profile ?? {};
        const visibility = profile.profile_visibility ?? {};
        setProfileData((prev) => ({
          ...prev,
          username: profile.username ?? '',
          full_name: profile.full_name ?? '',
          email: profile.email ?? '',
          country: profile.country ?? '',
          sport_id: profile.sport_id ?? '',
          primary_sport_id: profile.primary_sport_id ?? '',
          bio: profile.bio ?? '',
          sports_role: profile.sports_role ?? '',
          telegram: profile.telegram ?? '',
          dao1_did_nft: profile.dao1_did_nft ?? '',
          wallet_address: profile.wallet_address ?? '',
          website: profile.website ?? '',
          youtube: profile.youtube ?? '',
          linkhub: profile.linkhub ?? '',
          facebook: profile.facebook ?? '',
          instagram: profile.instagram ?? '',
          profile_visibility: {
            ...prev.profile_visibility,
            ...visibility,
          },
        }));
        setPrimarySportSelection(profile.sport_id ?? '');
        setSecondarySportSelection(profile.primary_sport_id ?? '');
        setPreviousProfile(profile);
        setProfileLoaded(true);
      } catch (error) {
        if (!active) return;
        console.error('[profile] Failed to load profile', error);
        setProfileError('Falha ao carregar o perfil. Tenta novamente.');
      } finally {
        if (active) setProfileLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [profileLoaded, user]);

  useEffect(() => {
    if (!user || sportOptions.length) return;
    let active = true;
    const loadSports = async () => {
      try {
        setSportLoading(true);
        setSportError(null);
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
        setSportOptions(options);
      } catch (error) {
        if (!active) return;
        console.error('[profile] Failed to load sports', error);
        setSportError('Falha ao carregar a lista de desportos.');
      } finally {
        if (active) setSportLoading(false);
      }
    };
    void loadSports();
    return () => {
      active = false;
    };
  }, [language, sportOptions.length, user]);

  const isUnlocked = (user?.xp_total ?? 0) >= XP_UNLOCK;

  const handleAssignSport = async (target: 'primary' | 'secondary') => {
    const selection = target === 'primary' ? primarySportSelection : secondarySportSelection;
    if (!selection) {
      toast({
        title: 'Seleciona um desporto',
        description: 'Escolhe um desporto antes de continuar.',
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: 'Sessao expirada',
        description: 'Inicia sessao novamente para guardar o desporto.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setSportSaving(true);
      const response = await fetch('/api/profile/sport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sportId: selection, target, replace: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign sport');
      }
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (target === 'primary') {
            parsed.sport_id = selection;
          } else {
            parsed.primary_sport_id = selection;
          }
          window.localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
      setProfileData((prev) => ({
        ...prev,
        sport_id: target === 'primary' ? selection : prev.sport_id,
        primary_sport_id: target === 'secondary' ? selection : prev.primary_sport_id,
      }));
      refreshUser();
      toast({
        title: 'Desporto atualizado',
        description:
          target === 'primary'
            ? 'Atualizaste o teu desporto principal.'
            : 'Atualizaste o teu desporto secundario.',
      });
    } catch (error) {
      console.error('[profile] Failed to assign sport', error);
      toast({
        title: 'Erro',
        description: 'Nao foi possivel guardar o desporto. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setSportSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    if (profileData.bio && (profileData.bio.length < 8 || profileData.bio.length > 888)) {
      toast({
        title: 'Bio invalida',
        description: 'A bio tem de ter entre 8 e 888 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const lockedFields = [
        'bio',
        'sports_role',
        'telegram',
        'dao1_did_nft',
        'wallet_address',
        'website',
        'youtube',
        'linkhub',
        'facebook',
        'instagram',
        'profile_visibility',
      ];
      const updatesPayload = { ...profileData };
      ['country', 'sport_id', 'primary_sport_id'].forEach((field) => {
        delete (updatesPayload as Record<string, unknown>)[field];
      });
      if (!isUnlocked) {
        lockedFields.forEach((field) => {
          delete (updatesPayload as Record<string, unknown>)[field];
        });
      }
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: updatesPayload,
          previousProfile: previousProfile ?? null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviousProfile(data.profile ?? previousProfile);
        toast({
          title: 'Perfil atualizado',
          description: data.xpAwarded
            ? `Mudancas guardadas. +${data.xpAwarded} XP.`
            : 'Mudancas guardadas com sucesso.',
        });
        refreshUser();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Falha ao guardar o perfil.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao guardar o perfil. Tenta novamente.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-slate-300">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#02070b] text-white">
      <Header />
      <PageShell className="space-y-10 pb-16 pt-10">
        <HeroSection className={`p-6 ${UI.panel}`}>
          <div className={UI.haloCyan} />
          <div className={UI.haloGold} />
          <HeroContent className="relative items-end gap-6">
            <HeroTextColumn className="space-y-3">
              <HeroEyebrow className={UI.eyebrow}>PERFIL OFICIAL</HeroEyebrow>
              <HeroTitle className={UI.heroTitle}>Conta Legacy</HeroTitle>
              <HeroDescription className={UI.sectionSubtitle}>
                Atualiza dados oficiais, escolhe desportos e controla a visibilidade publica.
              </HeroDescription>
            </HeroTextColumn>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-right">
              <div className="text-2xl font-bold text-[#5af3ff]">{user.xp_total} XP</div>
              <p className={UI.micro}>Nivel {Math.floor(user.xp_total / 100)}</p>
            </div>
          </HeroContent>
        </HeroSection>

        {profileLoading ? (
          <Card className={UI.cardSurface}>
            <CardHeader>
              <CardTitle className={UI.cardTitle}>Perfil</CardTitle>
              <CardDescription className={UI.bodyMuted}>A carregar dados do perfil...</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {profileError ? <p className="text-sm text-amber-300">{profileError}</p> : null}

        {!isUnlocked && (
          <Card className={UI.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Lock className="h-5 w-5 text-yellow-400" />
                Campos premium bloqueados
              </CardTitle>
              <CardDescription className={UI.bodyMuted}>
                Ganha mais {XP_UNLOCK - user.xp_total} XP para desbloquear todos os campos de bonus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-yellow-600/30">
                  <div
                    className="h-2 rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${Math.min((user.xp_total / XP_UNLOCK) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-yellow-100">
                  {user.xp_total}/{XP_UNLOCK}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={UI.eyebrow}>DADOS DO PERFIL</p>
              <p className={UI.bodyMuted}>
                Mantem o perfil atualizado. Alguns campos desbloqueiam XP quando completos.
              </p>
            </div>
            <Badge className="border-white/30 bg-black/40 text-cyan-100">
              {isUnlocked ? 'Perfil desbloqueado' : 'Requer 99 XP'}
            </Badge>
          </div>
        </section>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <User className="h-5 w-5 text-cyan-300" />
              Informacao basica
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>
              Dados principais da tua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200">Username</Label>
              <Input
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
              <p className={UI.micro}>Visivel publicamente.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Pais</Label>
              <Input value={profileData.country || '---'} disabled className="bg-[#000c12] border border-white/10" />
              <p className={UI.micro}>Definido no registo.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Nome completo</Label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Email</Label>
              <Input
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              Desportos oficiais
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>
              O desporto principal define a tua House. O secundario adiciona-te a outra House no mesmo pais.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200">Desporto principal</Label>
              <Select
                value={primarySportSelection}
                onValueChange={setPrimarySportSelection}
                disabled={sportLoading}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder={sportLoading ? 'A carregar...' : 'Seleciona o desporto principal'} />
                </SelectTrigger>
                <SelectContent className="bg-[#05212b] text-white">
                  {sportOptions.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sportError ? <p className="text-xs text-amber-300">{sportError}</p> : null}
              <Button
                size="sm"
                className={UI.ctaPrimary}
                onClick={() => handleAssignSport('primary')}
                disabled={sportSaving || sportLoading || !primarySportSelection}
              >
                {sportSaving ? 'A guardar...' : 'Guardar principal'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Desporto secundario</Label>
              <Select
                value={secondarySportSelection}
                onValueChange={setSecondarySportSelection}
                disabled={sportLoading}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder={sportLoading ? 'A carregar...' : 'Seleciona o desporto secundario'} />
                </SelectTrigger>
                <SelectContent className="bg-[#05212b] text-white">
                  {sportOptions.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className={UI.ctaPrimary}
                onClick={() => handleAssignSport('secondary')}
                disabled={sportSaving || sportLoading || !secondarySportSelection}
              >
                {sportSaving ? 'A guardar...' : 'Guardar secundario'}
              </Button>
              <p className={UI.micro}>Se nao quiseres secundario, deixa por definir.</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              Visibilidade e XP
              {!isUnlocked && <Lock className="h-4 w-4 text-slate-300" />}
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>
              Define a visibilidade de cada campo e ve o XP associado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio" className="text-slate-200">
                  {t('profile.bioLabel')}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100">
                    +{xpRewards.bio} XP
                  </Badge>
                  <Switch
                    checked={profileData.profile_visibility.bio}
                    onCheckedChange={(checked) =>
                      setProfileData({
                        ...profileData,
                        profile_visibility: {
                          ...profileData.profile_visibility,
                          bio: checked,
                        },
                      })
                    }
                    disabled={!isUnlocked}
                  />
                  <span className="text-xs text-slate-300">Publico</span>
                </div>
              </div>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Escreve sobre ti..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                disabled={!isUnlocked}
                maxLength={888}
                className="bg-[#000c12] border border-white/10"
              />
              <p className="text-xs text-slate-300">{profileData.bio.length}/888</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sports_role" className="text-slate-200">
                  Sports Role
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100">
                    +{xpRewards.sports_role} XP
                  </Badge>
                  <Switch
                    checked={profileData.profile_visibility.sports_role}
                    onCheckedChange={(checked) =>
                      setProfileData({
                        ...profileData,
                        profile_visibility: {
                          ...profileData.profile_visibility,
                          sports_role: checked,
                        },
                      })
                    }
                    disabled={!isUnlocked}
                  />
                  <span className="text-xs text-slate-300">Publico</span>
                </div>
              </div>
              <Select
                value={profileData.sports_role}
                onValueChange={(value) => setProfileData({ ...profileData, sports_role: value })}
                disabled={!isUnlocked}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder="Seleciona o teu papel" />
                </SelectTrigger>
                <SelectContent className="bg-[#05212b] text-white">
                  {(SPORTS_ROLES[language] ?? SPORTS_ROLES.en).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: 'telegram', label: 'Telegram', xp: xpRewards.telegram },
                { key: 'dao1_did_nft', label: 'DAO1 DID NFT', xp: xpRewards.dao1_did_nft },
                { key: 'wallet_address', label: 'Wallet Address', xp: xpRewards.wallet_address },
                { key: 'website', label: 'Website', xp: 0 },
                { key: 'youtube', label: 'YouTube', xp: xpRewards.youtube },
                { key: 'linkhub', label: 'LinkHub', xp: xpRewards.linkhub },
                { key: 'facebook', label: 'Facebook', xp: xpRewards.facebook },
                { key: 'instagram', label: 'Instagram', xp: xpRewards.instagram },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key} className="text-slate-200">
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      {field.xp > 0 && (
                        <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100 text-xs">
                          +{field.xp} XP
                        </Badge>
                      )}
                      <Switch
                        checked={
                          profileData.profile_visibility[field.key as keyof typeof profileData.profile_visibility]
                        }
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            profile_visibility: {
                              ...profileData.profile_visibility,
                              [field.key]: checked,
                            },
                          })
                        }
                        disabled={!isUnlocked}
                      />
                    </div>
                  </div>
                  <Input
                    id={field.key}
                    placeholder={`Your ${field.label.toLowerCase()}`}
                    value={profileData[field.key as keyof typeof profileData] as string}
                    onChange={(e) => setProfileData({ ...profileData, [field.key]: e.target.value })}
                    disabled={!isUnlocked}
                    className="bg-[#000c12] border border-white/10"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-gradient-to-br from-[#05212b] via-[#000c12] to-[#05212b] shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Award className="h-5 w-5 text-cyan-300" />
              XP Bonus Grid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={UI.bodyMuted}>Cada campo pode ser submetido uma vez para ganhar XP.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(xpRewards).map(([key, xp]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-[#000c12] p-4 text-center">
                  <div className="text-xl font-bold text-primary">+{xp}</div>
                  <p className="text-xs text-slate-300 capitalize">{key.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          size="lg"
          className="w-full border border-white/10 bg-white/5 text-white shadow-2xl"
          disabled={saving}
        >
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </Button>
      </PageShell>
      <Footer />
    </div>
  );
}
