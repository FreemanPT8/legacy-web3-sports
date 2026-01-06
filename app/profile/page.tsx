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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const xpRewards: Record<string, number> = {
  bio: 25,
  sports_role: 19,
  telegram: 19,
  dao1_did_nft: 33,
  wallet_address: 19,
  youtube: 9,
  linkhub: 33,
  facebook: 9,
  instagram: 9,
};

type SportOption = { id: string; name: string };

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, getToken, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
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
  const [sportOptions, setSportOptions] = useState<SportOption[]>([]);
  const [sportLoading, setSportLoading] = useState(false);
  const [sportSaving, setSportSaving] = useState(false);
  const [sportError, setSportError] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const hasSport = Boolean(user.sport_id || (user as any)?.primary_sport_id);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (hasSport || !user) return;
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
        setSportError('Failed to load sports list. Tenta novamente mais tarde.');
      } finally {
        if (active) setSportLoading(false);
      }
    };
    void loadSports();
    return () => {
      active = false;
    };
  }, [hasSport, language, loading, user]);

  const handleAssignSport = async () => {
    if (!selectedSport) {
      toast({
        title: 'Select sport',
        description: 'Escolhe o desporto da tua House antes de continuar.',
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: 'Session expired',
        description: 'Inicia sessão novamente para guardar o teu desporto.',
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
        body: JSON.stringify({ sportId: selectedSport }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign sport');
      }
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.sport_id = selectedSport;
          parsed.primary_sport_id = selectedSport;
          window.localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
      refreshUser();
      toast({
        title: 'Sport assigned',
        description: 'Atualizaste o teu desporto oficial.',
      });
    } catch (error) {
      console.error('[profile] Failed to assign sport', error);
      toast({
        title: 'Error',
        description: 'Não foi possível guardar o desporto. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setSportSaving(false);
    }
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

  const isUnlocked = user.xp_total >= XP_UNLOCK;

  const handleSave = async () => {
    if (!isUnlocked) {
      toast({
        title: 'Profile locked',
        description: 'Earn 99 XP to unlock profile editing',
        variant: 'destructive',
      });
      return;
    }

    if (profileData.bio && (profileData.bio.length < 8 || profileData.bio.length > 888)) {
      toast({
        title: 'Invalid bio length',
        description: 'Bio must be between 8 and 888 characters',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Profile updated!',
          description: data.xpEarned
            ? `Your changes have been saved. +${data.xpEarned} XP earned!`
            : 'Your changes have been saved successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />
      <PageShell className="space-y-10 py-10">
        <HeroSection className="p-6">
          <HeroContent className="items-end">
            <HeroTextColumn className="space-y-3">
              <HeroEyebrow>Profile</HeroEyebrow>
              <HeroTitle className="text-white lg:text-4xl">Legacy Profile</HeroTitle>
              <HeroDescription className="text-sm text-slate-300">
                Keep your personal story and contacts visible to the community.
              </HeroDescription>
            </HeroTextColumn>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-300">{user.xp_total} XP</div>
              <p className="text-sm text-slate-300">Level {Math.floor(user.xp_total / 100)}</p>
            </div>
          </HeroContent>
        </HeroSection>

        {!hasSport ? (
          <Card className="border border-white/10 bg-[#062331] shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Trophy className="h-5 w-5 text-cyan-300" />
                Escolhe o teu Desporto
              </CardTitle>
              <CardDescription className="text-slate-300">
                Esta definição é obrigatória para o novo onboarding escalável.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Desporto oficial</Label>
                <Select
                  value={selectedSport}
                  onValueChange={setSelectedSport}
                  disabled={sportLoading}
                >
                  <SelectTrigger className="bg-[#000c12] border border-white/10">
                    <SelectValue placeholder={sportLoading ? 'A carregar...' : 'Seleciona o teu desporto'} />
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
              </div>
              <Button
                size="lg"
                className="w-full bg-cyan-500/90 text-black hover:bg-cyan-400"
                onClick={handleAssignSport}
                disabled={sportSaving || sportLoading}
              >
                {sportSaving ? 'A guardar...' : 'Confirmar desporto'}
              </Button>
              <p className="text-xs text-slate-400">
                Esta configuração é obrigatória e pode ser alterada apenas com suporte oficial.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isUnlocked && (
          <Card className="border border-white/10 bg-[#05212b] shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Lock className="h-5 w-5 text-yellow-400" />
                Profile Editing Locked
              </CardTitle>
              <CardDescription className="text-slate-300">
                Earn {XP_UNLOCK - user.xp_total} XP to unlock all profile fields.
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
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Profile Details</p>
              <p className="text-sm text-slate-300">
                Earn XP by filling out fields, toggle visibility per item, and keep everything tidy.
              </p>
            </div>
            <Badge className="border-white/30 bg-black/40 text-cyan-100">
              {isUnlocked ? 'Profile unlocked' : 'Requires 99 XP'}
            </Badge>
          </div>
        </section>

        <Card className="space-y-6 border border-white/10 bg-[#05212b] shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <User className="h-5 w-5 text-cyan-300" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              Public data that stays visible to everyone.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200">Username</Label>
              <Input value={user.username} disabled className="bg-[#000c12] border border-white/10" />
              <p className="text-xs text-slate-400">Cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Country</Label>
              <Input value="Your Country" disabled className="bg-[#000c12] border border-white/10" />
              <p className="text-xs text-slate-400">Cannot be changed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="space-y-6 border border-white/10 bg-[#05212b] shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              Visibility & XP Rewards
              {!isUnlocked && <Lock className="h-4 w-4 text-slate-300" />}
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              Toggle the visibility for each field and see how much XP it grants.
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
                  <span className="text-xs text-slate-300">Public</span>
                </div>
              </div>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Tell us about yourself..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                disabled={!isUnlocked}
                maxLength={888}
                className="bg-[#000c12] border border-white/10"
              />
              <p className="text-xs text-slate-300">{profileData.bio.length}/888 characters</p>
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
                  <span className="text-xs text-slate-300">Public</span>
                </div>
              </div>
              <Select
                value={profileData.sports_role}
                onValueChange={(value) => setProfileData({ ...profileData, sports_role: value })}
                disabled={!isUnlocked}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-[#05212b] text-white">
                  {SPORTS_ROLES[language].map((role) => (
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
                          profileData.profile_visibility[
                            field.key as keyof typeof profileData.profile_visibility
                          ]
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
            <p className="text-sm text-slate-300">
              Each field can be submitted once. Fill them to earn extra XP.
            </p>
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
          disabled={!isUnlocked || saving}
        >
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </Button>
      </PageShell>
      <Footer />
    </div>
  );
}
