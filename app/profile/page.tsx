'use client';

import { useEffect, useMemo, useState } from 'react';
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

const COPY = {
  en: {
    heroEyebrow: 'OFFICIAL PROFILE',
    heroTitle: 'Legacy Account',
    heroSubtitle: 'Update official data, choose sports, and control public visibility.',
    levelLabel: 'Level',
    xpLabel: 'XP',
    profileLoadingTitle: 'Profile',
    profileLoadingDesc: 'Loading profile data...',
    profileLoadError: 'Failed to load profile. Please try again.',
    sportLoadError: 'Failed to load sports list.',
    lockedTitle: 'Premium fields locked',
    lockedDescPrefix: 'Earn',
    lockedDescSuffix: 'more XP to unlock all bonus fields.',
    sectionEyebrow: 'PROFILE DATA',
    sectionSubtitle: 'Keep your profile updated. Some fields unlock XP when completed.',
    badgeUnlocked: 'Profile unlocked',
    badgeLocked: 'Requires 99 XP',
    basicInfoTitle: 'Basic information',
    basicInfoDesc: 'Main data of your account.',
    basicInfoSave: 'Save basic info',
    basicInfoHint: 'Use the button below to confirm changes.',
    labelUsername: 'Username',
    labelCountry: 'Country',
    labelFullName: 'Full name',
    labelEmail: 'Email',
    usernameHint: 'Publicly visible.',
    countryHint: 'Defined at signup.',
    sportsTitle: 'Official sports',
    sportsDesc: 'The primary sport defines your House. The secondary adds you to another House in the same country.',
    primarySportLabel: 'Primary sport',
    secondarySportLabel: 'Secondary sport',
    selectPrimarySport: 'Select the primary sport',
    selectSecondarySport: 'Select the secondary sport',
    saving: 'Saving...',
    savePrimary: 'Save primary',
    saveSecondary: 'Save secondary',
    secondaryHint: 'If you do not want a secondary sport, leave it empty.',
    visibilityTitle: 'Visibility and XP',
    visibilityDesc: 'Set visibility for each field and see the XP reward.',
    publicLabel: 'Public',
    bioLabel: 'Bio',
    bioPlaceholder: 'Write about yourself...',
    sportsRoleLabel: 'Sports role',
    selectRole: 'Select your role',
    fieldTelegram: 'Telegram',
    fieldDao: 'DAO1 DID NFT',
    fieldWallet: 'Wallet address',
    fieldWebsite: 'Website',
    fieldYoutube: 'YouTube',
    fieldLinkhub: 'LinkHub',
    fieldFacebook: 'Facebook',
    fieldInstagram: 'Instagram',
    fieldPlaceholderPrefix: 'Your',
    xpBonusTitle: 'XP Bonus Grid',
    xpBonusDesc: 'Each field can be submitted once to earn XP.',
    saveProfile: 'Save profile',
    loading: 'Loading...',
    toastSelectSportTitle: 'Select a sport',
    toastSelectSportDesc: 'Choose a sport before continuing.',
    toastSessionExpiredTitle: 'Session expired',
    toastSessionExpiredDesc: 'Sign in again to save your sport.',
    toastSportUpdatedTitle: 'Sport updated',
    toastSportUpdatedPrimary: 'Your primary sport was updated.',
    toastSportUpdatedSecondary: 'Your secondary sport was updated.',
    toastSportUpdateErrorTitle: 'Error',
    toastSportUpdateErrorDesc: 'Could not save the sport. Try again.',
    toastBioInvalidTitle: 'Invalid bio',
    toastBioInvalidDesc: 'Bio must be between 8 and 888 characters.',
    toastProfileSavedTitle: 'Profile updated',
    toastProfileSavedPrefix: 'Changes saved. +',
    toastProfileSavedSuffix: ' XP.',
    toastProfileSavedDesc: 'Changes saved successfully.',
    toastProfileSaveErrorTitle: 'Error',
    toastProfileSaveErrorDesc: 'Failed to save the profile. Try again.',
  },
  pt: {
    heroEyebrow: 'PERFIL OFICIAL',
    heroTitle: 'Conta Legacy',
    heroSubtitle: 'Atualiza dados oficiais, escolhe desportos e controla a visibilidade publica.',
    levelLabel: 'Nivel',
    xpLabel: 'XP',
    profileLoadingTitle: 'Perfil',
    profileLoadingDesc: 'A carregar dados do perfil...',
    profileLoadError: 'Falha ao carregar o perfil. Tenta novamente.',
    sportLoadError: 'Falha ao carregar a lista de desportos.',
    lockedTitle: 'Campos premium bloqueados',
    lockedDescPrefix: 'Ganha mais',
    lockedDescSuffix: 'XP para desbloquear todos os campos de bonus.',
    sectionEyebrow: 'DADOS DO PERFIL',
    sectionSubtitle: 'Mantem o perfil atualizado. Alguns campos desbloqueiam XP quando completos.',
    badgeUnlocked: 'Perfil desbloqueado',
    badgeLocked: 'Requer 99 XP',
    basicInfoTitle: 'Informacao basica',
    basicInfoDesc: 'Dados principais da tua conta.',
    basicInfoSave: 'Guardar dados base',
    basicInfoHint: 'Usa o botao abaixo para confirmar as alteracoes.',
    labelUsername: 'Username',
    labelCountry: 'Pais',
    labelFullName: 'Nome completo',
    labelEmail: 'Email',
    usernameHint: 'Visivel publicamente.',
    countryHint: 'Definido no registo.',
    sportsTitle: 'Desportos oficiais',
    sportsDesc: 'O desporto principal define a tua House. O secundario adiciona-te a outra House no mesmo pais.',
    primarySportLabel: 'Desporto principal',
    secondarySportLabel: 'Desporto secundario',
    selectPrimarySport: 'Seleciona o desporto principal',
    selectSecondarySport: 'Seleciona o desporto secundario',
    saving: 'A guardar...',
    savePrimary: 'Guardar principal',
    saveSecondary: 'Guardar secundario',
    secondaryHint: 'Se nao quiseres secundario, deixa por definir.',
    visibilityTitle: 'Visibilidade e XP',
    visibilityDesc: 'Define a visibilidade de cada campo e ve o XP associado.',
    publicLabel: 'Publico',
    bioLabel: 'Bio',
    bioPlaceholder: 'Escreve sobre ti...',
    sportsRoleLabel: 'Funcao no desporto',
    selectRole: 'Seleciona o teu papel',
    fieldTelegram: 'Telegram',
    fieldDao: 'DAO1 DID NFT',
    fieldWallet: 'Carteira',
    fieldWebsite: 'Website',
    fieldYoutube: 'YouTube',
    fieldLinkhub: 'LinkHub',
    fieldFacebook: 'Facebook',
    fieldInstagram: 'Instagram',
    fieldPlaceholderPrefix: 'O teu',
    xpBonusTitle: 'Grelha de bonus XP',
    xpBonusDesc: 'Cada campo pode ser submetido uma vez para ganhar XP.',
    saveProfile: 'Guardar perfil',
    loading: 'A carregar...',
    toastSelectSportTitle: 'Seleciona um desporto',
    toastSelectSportDesc: 'Escolhe um desporto antes de continuar.',
    toastSessionExpiredTitle: 'Sessao expirada',
    toastSessionExpiredDesc: 'Inicia sessao novamente para guardar o desporto.',
    toastSportUpdatedTitle: 'Desporto atualizado',
    toastSportUpdatedPrimary: 'Atualizaste o teu desporto principal.',
    toastSportUpdatedSecondary: 'Atualizaste o teu desporto secundario.',
    toastSportUpdateErrorTitle: 'Erro',
    toastSportUpdateErrorDesc: 'Nao foi possivel guardar o desporto. Tenta novamente.',
    toastBioInvalidTitle: 'Bio invalida',
    toastBioInvalidDesc: 'A bio tem de ter entre 8 e 888 caracteres.',
    toastProfileSavedTitle: 'Perfil atualizado',
    toastProfileSavedPrefix: 'Mudancas guardadas. +',
    toastProfileSavedSuffix: ' XP.',
    toastProfileSavedDesc: 'Mudancas guardadas com sucesso.',
    toastProfileSaveErrorTitle: 'Erro',
    toastProfileSaveErrorDesc: 'Falha ao guardar o perfil. Tenta novamente.',
  },
  es: {
    heroEyebrow: 'PERFIL OFICIAL',
    heroTitle: 'Cuenta Legacy',
    heroSubtitle: 'Actualiza datos oficiales, elige deportes y controla la visibilidad publica.',
    levelLabel: 'Nivel',
    xpLabel: 'XP',
    profileLoadingTitle: 'Perfil',
    profileLoadingDesc: 'Cargando datos del perfil...',
    profileLoadError: 'No se pudo cargar el perfil. Intenta de nuevo.',
    sportLoadError: 'No se pudo cargar la lista de deportes.',
    lockedTitle: 'Campos premium bloqueados',
    lockedDescPrefix: 'Gana',
    lockedDescSuffix: 'XP mas para desbloquear todos los campos bonus.',
    sectionEyebrow: 'DATOS DEL PERFIL',
    sectionSubtitle: 'Manten el perfil actualizado. Algunos campos desbloquean XP al completarse.',
    badgeUnlocked: 'Perfil desbloqueado',
    badgeLocked: 'Requiere 99 XP',
    basicInfoTitle: 'Informacion basica',
    basicInfoDesc: 'Datos principales de tu cuenta.',
    basicInfoSave: 'Guardar datos base',
    basicInfoHint: 'Usa el boton de abajo para confirmar los cambios.',
    labelUsername: 'Usuario',
    labelCountry: 'Pais',
    labelFullName: 'Nombre completo',
    labelEmail: 'Email',
    usernameHint: 'Visible publicamente.',
    countryHint: 'Definido en el registro.',
    sportsTitle: 'Deportes oficiales',
    sportsDesc: 'El deporte principal define tu House. El secundario te anade a otra House en el mismo pais.',
    primarySportLabel: 'Deporte principal',
    secondarySportLabel: 'Deporte secundario',
    selectPrimarySport: 'Selecciona el deporte principal',
    selectSecondarySport: 'Selecciona el deporte secundario',
    saving: 'Guardando...',
    savePrimary: 'Guardar principal',
    saveSecondary: 'Guardar secundario',
    secondaryHint: 'Si no quieres secundario, dejalo sin definir.',
    visibilityTitle: 'Visibilidad y XP',
    visibilityDesc: 'Define la visibilidad de cada campo y mira el XP asociado.',
    publicLabel: 'Publico',
    bioLabel: 'Bio',
    bioPlaceholder: 'Escribe sobre ti...',
    sportsRoleLabel: 'Rol deportivo',
    selectRole: 'Selecciona tu rol',
    fieldTelegram: 'Telegram',
    fieldDao: 'DAO1 DID NFT',
    fieldWallet: 'Billetera',
    fieldWebsite: 'Website',
    fieldYoutube: 'YouTube',
    fieldLinkhub: 'LinkHub',
    fieldFacebook: 'Facebook',
    fieldInstagram: 'Instagram',
    fieldPlaceholderPrefix: 'Tu',
    xpBonusTitle: 'Cuadro de bonus XP',
    xpBonusDesc: 'Cada campo puede enviarse una vez para ganar XP.',
    saveProfile: 'Guardar perfil',
    loading: 'Cargando...',
    toastSelectSportTitle: 'Selecciona un deporte',
    toastSelectSportDesc: 'Elige un deporte antes de continuar.',
    toastSessionExpiredTitle: 'Sesion expirada',
    toastSessionExpiredDesc: 'Inicia sesion de nuevo para guardar el deporte.',
    toastSportUpdatedTitle: 'Deporte actualizado',
    toastSportUpdatedPrimary: 'Tu deporte principal fue actualizado.',
    toastSportUpdatedSecondary: 'Tu deporte secundario fue actualizado.',
    toastSportUpdateErrorTitle: 'Error',
    toastSportUpdateErrorDesc: 'No se pudo guardar el deporte. Intenta de nuevo.',
    toastBioInvalidTitle: 'Bio invalida',
    toastBioInvalidDesc: 'La bio debe tener entre 8 y 888 caracteres.',
    toastProfileSavedTitle: 'Perfil actualizado',
    toastProfileSavedPrefix: 'Cambios guardados. +',
    toastProfileSavedSuffix: ' XP.',
    toastProfileSavedDesc: 'Cambios guardados con exito.',
    toastProfileSaveErrorTitle: 'Error',
    toastProfileSaveErrorDesc: 'No se pudo guardar el perfil. Intenta de nuevo.',
  },
} as const;

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
  const { language } = useLanguage();
  const { toast } = useToast();

  const copy = useMemo(() => COPY[language] ?? COPY.en, [language]);

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
        setProfileError(copy.profileLoadError);
      } finally {
        if (active) setProfileLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [copy.profileLoadError, profileLoaded, user]);

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
        setSportError(copy.sportLoadError);
      } finally {
        if (active) setSportLoading(false);
      }
    };
    void loadSports();
    return () => {
      active = false;
    };
  }, [copy.sportLoadError, language, sportOptions.length, user]);

  const isUnlocked = (user?.xp_total ?? 0) >= XP_UNLOCK;

  const handleAssignSport = async (target: 'primary' | 'secondary') => {
    const selection = target === 'primary' ? primarySportSelection : secondarySportSelection;
    if (!selection) {
      toast({
        title: copy.toastSelectSportTitle,
        description: copy.toastSelectSportDesc,
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: copy.toastSessionExpiredTitle,
        description: copy.toastSessionExpiredDesc,
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
        title: copy.toastSportUpdatedTitle,
        description: target === 'primary' ? copy.toastSportUpdatedPrimary : copy.toastSportUpdatedSecondary,
      });
    } catch (error) {
      console.error('[profile] Failed to assign sport', error);
      toast({
        title: copy.toastSportUpdateErrorTitle,
        description: copy.toastSportUpdateErrorDesc,
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
        title: copy.toastBioInvalidTitle,
        description: copy.toastBioInvalidDesc,
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: copy.toastSessionExpiredTitle,
        description: copy.toastSessionExpiredDesc,
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: user.id,
          updates: updatesPayload,
          previousProfile: previousProfile ?? null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreviousProfile(data.profile ?? previousProfile);
        if (typeof window !== 'undefined' && data.profile) {
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              const merged = { ...parsed, ...data.profile };
              localStorage.setItem('user', JSON.stringify(merged));
            }
          } catch (error) {
            console.error('[profile] Failed to sync local user cache', error);
          }
        }
        toast({
          title: copy.toastProfileSavedTitle,
          description: data.xpAwarded
            ? `${copy.toastProfileSavedPrefix}${data.xpAwarded}${copy.toastProfileSavedSuffix}`
            : copy.toastProfileSavedDesc,
        });
        refreshUser();
      } else {
        toast({
          title: copy.toastProfileSaveErrorTitle,
          description: data.error || copy.toastProfileSaveErrorDesc,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: copy.toastProfileSaveErrorTitle,
        description: copy.toastProfileSaveErrorDesc,
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
            <p className="text-sm text-slate-300">{copy.loading}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const roleOptions = SPORTS_ROLES[language] ?? SPORTS_ROLES.en;
  const contactFields = [
    { key: 'telegram', label: copy.fieldTelegram, xp: xpRewards.telegram },
    { key: 'dao1_did_nft', label: copy.fieldDao, xp: xpRewards.dao1_did_nft },
    { key: 'wallet_address', label: copy.fieldWallet, xp: xpRewards.wallet_address },
    { key: 'website', label: copy.fieldWebsite, xp: 0 },
    { key: 'youtube', label: copy.fieldYoutube, xp: xpRewards.youtube },
    { key: 'linkhub', label: copy.fieldLinkhub, xp: xpRewards.linkhub },
    { key: 'facebook', label: copy.fieldFacebook, xp: xpRewards.facebook },
    { key: 'instagram', label: copy.fieldInstagram, xp: xpRewards.instagram },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-[#02070b] text-white">
      <Header />
      <PageShell className="space-y-10 pb-16 pt-10">
        <HeroSection className={`p-6 ${UI.panel}`}>
          <div className={UI.haloCyan} />
          <div className={UI.haloGold} />
          <HeroContent className="relative items-end gap-6">
            <HeroTextColumn className="space-y-3">
              <HeroEyebrow className={UI.eyebrow}>{copy.heroEyebrow}</HeroEyebrow>
              <HeroTitle className={UI.heroTitle}>{copy.heroTitle}</HeroTitle>
              <HeroDescription className={UI.sectionSubtitle}>
                {copy.heroSubtitle}
              </HeroDescription>
            </HeroTextColumn>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-right">
              <div className="text-2xl font-bold text-[#5af3ff]">
                {user.xp_total} {copy.xpLabel}
              </div>
              <p className={UI.micro}>
                {copy.levelLabel} {Math.floor(user.xp_total / 100)}
              </p>
            </div>
          </HeroContent>
        </HeroSection>

        {profileLoading ? (
          <Card className={UI.cardSurface}>
            <CardHeader>
              <CardTitle className={UI.cardTitle}>{copy.profileLoadingTitle}</CardTitle>
              <CardDescription className={UI.bodyMuted}>{copy.profileLoadingDesc}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {profileError ? <p className="text-sm text-amber-300">{profileError}</p> : null}

        {!isUnlocked && (
          <Card className={UI.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Lock className="h-5 w-5 text-yellow-400" />
                {copy.lockedTitle}
              </CardTitle>
              <CardDescription className={UI.bodyMuted}>
                {copy.lockedDescPrefix} {XP_UNLOCK - user.xp_total} {copy.lockedDescSuffix}
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
              <p className={UI.eyebrow}>{copy.sectionEyebrow}</p>
              <p className={UI.bodyMuted}>
                {copy.sectionSubtitle}
              </p>
            </div>
            <Badge className="border-white/30 bg-black/40 text-cyan-100">
              {isUnlocked ? copy.badgeUnlocked : copy.badgeLocked}
            </Badge>
          </div>
        </section>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <User className="h-5 w-5 text-cyan-300" />
              {copy.basicInfoTitle}
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>{copy.basicInfoDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.labelUsername}</Label>
              <Input
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
              <p className={UI.micro}>{copy.usernameHint}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.labelCountry}</Label>
              <Input value={profileData.country || '---'} disabled className="bg-[#000c12] border border-white/10" />
              <p className={UI.micro}>{copy.countryHint}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.labelFullName}</Label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.labelEmail}</Label>
              <Input
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="bg-[#000c12] border border-white/10"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3 pt-2">
              <p className={UI.micro}>{copy.basicInfoHint}</p>
              <Button
                onClick={handleSave}
                className="w-full border border-white/10 bg-white/5 text-white shadow-2xl md:w-fit"
                disabled={saving}
              >
                {saving ? copy.saving : copy.basicInfoSave}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              {copy.sportsTitle}
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>{copy.sportsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.primarySportLabel}</Label>
              <Select
                value={primarySportSelection}
                onValueChange={setPrimarySportSelection}
                disabled={sportLoading}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder={sportLoading ? copy.loading : copy.selectPrimarySport} />
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
                {sportSaving ? copy.saving : copy.savePrimary}
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">{copy.secondarySportLabel}</Label>
              <Select
                value={secondarySportSelection}
                onValueChange={setSecondarySportSelection}
                disabled={sportLoading}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder={sportLoading ? copy.loading : copy.selectSecondarySport} />
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
                {sportSaving ? copy.saving : copy.saveSecondary}
              </Button>
              <p className={UI.micro}>{copy.secondaryHint}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`space-y-6 ${UI.cardSurface}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              {copy.visibilityTitle}
              {!isUnlocked && <Lock className="h-4 w-4 text-slate-300" />}
            </CardTitle>
            <CardDescription className={UI.bodyMuted}>{copy.visibilityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio" className="text-slate-200">
                  {copy.bioLabel}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100">
                    +{xpRewards.bio} {copy.xpLabel}
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
                  <span className="text-xs text-slate-300">{copy.publicLabel}</span>
                </div>
              </div>
              <Textarea
                id="bio"
                rows={4}
                placeholder={copy.bioPlaceholder}
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
                  {copy.sportsRoleLabel}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100">
                    +{xpRewards.sports_role} {copy.xpLabel}
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
                  <span className="text-xs text-slate-300">{copy.publicLabel}</span>
                </div>
              </div>
              <Select
                value={profileData.sports_role}
                onValueChange={(value) => setProfileData({ ...profileData, sports_role: value })}
                disabled={!isUnlocked}
              >
                <SelectTrigger className="bg-[#000c12] border border-white/10">
                  <SelectValue placeholder={copy.selectRole} />
                </SelectTrigger>
                <SelectContent className="bg-[#05212b] text-white">
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {contactFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key} className="text-slate-200">
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      {field.xp > 0 && (
                        <Badge variant="outline" className="border-white/30 bg-black/40 text-cyan-100 text-xs">
                          +{field.xp} {copy.xpLabel}
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
                    placeholder={`${copy.fieldPlaceholderPrefix} ${field.label}`}
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
              {copy.xpBonusTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={UI.bodyMuted}>{copy.xpBonusDesc}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {contactFields.map((field) => (
                <div key={field.key} className="rounded-2xl border border-white/10 bg-[#000c12] p-4 text-center">
                  <div className="text-xl font-bold text-primary">+{field.xp}</div>
                  <p className="text-xs text-slate-300">{field.label}</p>
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
          {saving ? copy.saving : copy.saveProfile}
        </Button>
      </PageShell>
      <Footer />
    </div>
  );
}
