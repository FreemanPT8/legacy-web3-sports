'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, HOUSES_OF_SPORTS, SPORTS_ROLES } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  MessageSquare,
  User,
  Trophy,
  Lightbulb,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type SportOption = {
  id: string;
  code: string;
  name: string;
};

type SportRoleOption = {
  value: string;
  label: string;
};

// --- Helpers de língua simples (sem tocar no i18n global) ---

type SimpleLang = 'en' | 'pt' | 'es';

function normalizeLang(lang: string): SimpleLang {
  if (lang === 'pt') return 'pt';
  if (lang === 'es') return 'es';
  return 'en';
}

function getOtherSportOptionLabel(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Outro desporto';
    case 'es':
      return 'Otro deporte';
    default:
      return 'Other sport';
  }
}

function getOtherSportPlaceholder(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Especifica o teu desporto / disciplina';
    case 'es':
      return 'Especifica tu deporte / disciplina';
    default:
      return 'Please specify your sport / discipline';
  }
}

function getOtherRoleOptionLabel(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Outro papel';
    case 'es':
      return 'Otro papel';
    default:
      return 'Other role';
  }
}

function getOtherRolePlaceholder(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Especifica o teu papel no desporto';
    case 'es':
      return 'Especifica tu papel en el deporte';
    default:
      return 'Please specify your role in sports';
  }
}

function getLoadingSportsLabel(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'A carregar desportos...';
    case 'es':
      return 'Cargando deportes...';
    default:
      return 'Loading sports...';
  }
}

// Texto para o modo: ligado a desporto vs geral
function getProfileModeTitle(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Como queres usar o LEGACY?';
    case 'es':
      return '¿Cómo quieres usar LEGACY?';
    default:
      return 'How do you want to use LEGACY?';
  }
}

function getProfileModeSportsLabel(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Estou ligado a um desporto';
    case 'es':
      return 'Estoy vinculado a un deporte';
    default:
      return 'I am connected to a sport';
  }
}

function getProfileModeGeneralLabel(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Quero apenas aprender Blockchain / Web3 / Apertum';
    case 'es':
      return 'Solo quiero aprender Blockchain / Web3 / Apertum';
    default:
      return 'I just want to learn Blockchain / Web3 / Apertum';
  }
}

function getProfileModeHint(lang: string): string {
  const L = normalizeLang(lang);
  switch (L) {
    case 'pt':
      return 'Se escolheres a segunda opção, vamos ignorar o desporto, papel e organização. O foco será apenas a tua jornada em Blockchain, Web3 e Apertum.';
    case 'es':
      return 'Si eliges la segunda opción, ignoraremos deporte, rol y organización. El foco será solo tu recorrido en Blockchain, Web3 y Apertum.';
    default:
      return 'If you choose the second option, sport, role and organisation will be ignored. The focus will be only your journey in Blockchain, Web3 and Apertum.';
  }
}

// Normalizar SPORTS_ROLES para { value, label } (sem [object Object])
function getSportRolesForLanguage(language: string): SportRoleOption[] {
  const rawRoles: any[] =
    (SPORTS_ROLES as any)[language] || (SPORTS_ROLES as any).en || [];

  return rawRoles
    .map((role: any): SportRoleOption => {
      if (typeof role === 'string') {
        return { value: role, label: role };
      }

      if (role && typeof role === 'object') {
        const langKey = language;

        let label: string | undefined;

        if (typeof role.label === 'string') {
          label = role.label;
        } else if (role.label && typeof role.label[langKey] === 'string') {
          label = role.label[langKey];
        } else if (role.i18n && typeof role.i18n[langKey] === 'string') {
          label = role.i18n[langKey];
        } else if (typeof role.name === 'string') {
          label = role.name;
        }

        const valueRaw =
          role.value || role.code || role.id || label || 'role';

        const value = String(valueRaw);
        const finalLabel = String(label ?? valueRaw);

        return { value, label: finalLabel };
      }

      return { value: String(role ?? ''), label: String(role ?? '') };
    })
    .filter((r) => r.value.trim() !== '');
}

// Formatar label de desporto
function formatSportLabel(sport: SportOption): string {
  if (sport.name && sport.name.toLowerCase() !== sport.code.toLowerCase()) {
    return sport.name;
  }

  const withSpaces = sport.code.replace(/_/g, ' ');
  return withSpaces
    .split(' ')
    .filter(Boolean)
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(' ');
}

// Toasts / mensagens de validação
function getValidationTexts(lang: string) {
  const L = normalizeLang(lang);
  if (L === 'pt') {
    return {
      missingRequiredTitle: 'Campos obrigatórios em falta',
      missingRequiredDesc: 'Preenche todos os campos obrigatórios.',
      invalidMessageTitle: 'Mensagem inválida',
      invalidMessageDesc: 'A mensagem deve ter entre 8 e 8888 caracteres.',
      otherSportTitle: 'Especifica o teu desporto',
      otherSportDesc: 'Escolheste "Outro desporto". Especifica qual.',
      otherRoleTitle: 'Especifica o teu papel',
      otherRoleDesc:
        'Escolheste "Outro papel". Especifica o teu papel no desporto.',
      submitSuccessTitle: 'Candidatura enviada!',
      submitSuccessDesc:
        'Alguém do LEGACY ou de uma House compatível vai contactar-te em 24-48 horas, pelo método de contacto que escolheste.',
      submitFailedTitle: 'Falha ao enviar a candidatura',
      submitFailedFallback: 'Tenta novamente, por favor.',
      networkErrorTitle: 'Erro de rede',
      networkErrorDesc: 'Verifica a tua ligação e tenta novamente.',
    };
  }

  if (L === 'es') {
    return {
      missingRequiredTitle: 'Faltan campos obligatorios',
      missingRequiredDesc: 'Completa todos los campos obligatorios.',
      invalidMessageTitle: 'Mensaje inválido',
      invalidMessageDesc: 'El mensaje debe tener entre 8 y 8888 caracteres.',
      otherSportTitle: 'Especifica tu deporte',
      otherSportDesc: 'Has elegido "Otro deporte". Especifica cuál.',
      otherRoleTitle: 'Especifica tu papel',
      otherRoleDesc:
        'Has elegido "Otro papel". Especifica tu papel en el deporte.',
      submitSuccessTitle: '¡Solicitud enviada!',
      submitSuccessDesc:
        'Alguien del equipo LEGACY o de una House compatible te contactará en 24-48 horas por tu método de contacto preferido.',
      submitFailedTitle: 'Error al enviar la solicitud',
      submitFailedFallback: 'Vuelve a intentarlo, por favor.',
      networkErrorTitle: 'Error de red',
      networkErrorDesc: 'Comprueba tu conexión e inténtalo de nuevo.',
    };
  }

  return {
    missingRequiredTitle: 'Missing required fields',
    missingRequiredDesc: 'Please fill in all required fields',
    invalidMessageTitle: 'Invalid message length',
    invalidMessageDesc: 'Message must be between 8 and 8888 characters',
    otherSportTitle: 'Please specify your sport',
    otherSportDesc: 'You selected "Other sport". Please specify which sport.',
    otherRoleTitle: 'Please specify your role',
    otherRoleDesc:
      'You selected "Other role". Please specify your role in sports.',
    submitSuccessTitle: 'Application submitted!',
    submitSuccessDesc:
      'A House admin or the LEGACY team will contact you within 24-48 hours via your preferred contact method.',
    submitFailedTitle: 'Submission failed',
    submitFailedFallback: 'Please try again',
    networkErrorTitle: 'Network error',
    networkErrorDesc: 'Please check your connection and try again',
  };
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // lista de desportos vinda da API
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsError, setSportsError] = useState<string | null>(null);

  // controlo de "Outro desporto" e "Outro papel"
  const [otherSport, setOtherSport] = useState(false);
  const [otherRole, setOtherRole] = useState(false);

  // modo: ligado a desporto vs perfil geral
  const [isNonSports, setIsNonSports] = useState(false);

  // diálogo pós-submissão
  const [showPostSubmitDialog, setShowPostSubmitDialog] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    telegram: '',
    full_name: '',
    country: '',
    sports_category: '',
    sports_category_other: '',
    sports_role: '',
    sports_role_other: '',
    organization: '',
    web3_experience: '',
    interests: [] as string[],
    message: '',
  });

  const interests = [
    'NFTs in Sports',
    'Fan Tokens',
    'DAOs for Teams',
    'Smart Contracts',
    'Athlete Tokenization',
    'Blockchain Ticketing',
    'DeFi for Athletes',
    'Sports Metaverse',
  ];

  const L = normalizeLang(language);

  // Prefill de email se o utilizador já estiver autenticado
  useEffect(() => {
    if (authUser?.email && !formData.email) {
      setFormData((prev) => ({
        ...prev,
        email: authUser.email || prev.email,
      }));
    }
  }, [authUser, formData.email]);

  // Buscar desportos da API sempre que a language muda
  useEffect(() => {
    const fetchSports = async () => {
      setSportsLoading(true);
      setSportsError(null);

      try {
        const res = await fetch(`/api/sports?locale=${language}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.sports)) {
          setSports(data.sports);
        } else {
          setSports([]);
          setSportsError('Unable to load sports list.');
        }
      } catch (err) {
        console.error('Error loading sports from API:', err);
        setSports([]);
        setSportsError('Unable to load sports list.');
      } finally {
        setSportsLoading(false);
      }
    };

    fetchSports();
  }, [language]);

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleGoToSignup = () => {
    const emailToUse = submittedEmail || formData.email;
    const params = new URLSearchParams();
    if (emailToUse) {
      params.set('email', emailToUse);
    }
    const query = params.toString();
    router.push(query ? `/signup?${query}` : '/signup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = getValidationTexts(language);

    if (!formData.email || !formData.full_name || !formData.country) {
      toast({
        title: v.missingRequiredTitle,
        description: v.missingRequiredDesc,
        variant: 'destructive',
      });
      return;
    }

    if (formData.message.length < 8 || formData.message.length > 8888) {
      toast({
        title: v.invalidMessageTitle,
        description: v.invalidMessageDesc,
        variant: 'destructive',
      });
      return;
    }

    // Só validamos desporto/papel se o utilizador estiver no modo "desporto"
    if (!isNonSports) {
      if (
        formData.sports_category === 'other_sport' &&
        !formData.sports_category_other.trim()
      ) {
        toast({
          title: v.otherSportTitle,
          description: v.otherSportDesc,
          variant: 'destructive',
        });
        return;
      }

      if (
        formData.sports_role === 'other_role' &&
        !formData.sports_role_other.trim()
      ) {
        toast({
          title: v.otherRoleTitle,
          description: v.otherRoleDesc,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = { ...formData };

      // Flag de perfil
      payload.is_non_sports = isNonSports;
      payload.profile_type = isNonSports ? 'GENERAL' : 'SPORTS';

      // se o utilizador estiver autenticado, ligar submissão ao user_id
      if (authUser?.id) {
        payload.user_id = authUser.id;
      }

      // Se for perfil GERAL, ignoramos tudo o que seja desporto/organização
      if (isNonSports) {
        payload.sports_category = null;
        payload.sports_category_code = null;
        payload.sports_role = null;
        payload.organization = null;
      } else {
        // Tratar “Outro desporto” + sports_category_code
        if (payload.sports_category === 'other_sport') {
          payload.sports_category = payload.sports_category_other.trim();
          payload.sports_category_code = null;
        } else if (payload.sports_category) {
          payload.sports_category_code = payload.sports_category;
        } else {
          payload.sports_category_code = null;
        }

        // Tratar “Outro papel”
        if (payload.sports_role === 'other_role') {
          payload.sports_role = payload.sports_role_other.trim();
        }
      }

      delete payload.sports_category_other;
      delete payload.sports_role_other;

      const response = await fetch('/api/forms/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: v.submitSuccessTitle,
          description: v.submitSuccessDesc,
        });

        setSubmittedEmail(formData.email);

        setFormData({
          email: '',
          phone: '',
          telegram: '',
          full_name: '',
          country: '',
          sports_category: '',
          sports_category_other: '',
          sports_role: '',
          sports_role_other: '',
          organization: '',
          web3_experience: '',
          interests: [],
          message: '',
        });
        setOtherSport(false);
        setOtherRole(false);
        setIsNonSports(false);

        setShowPostSubmitDialog(true);
      } else {
        toast({
          title: v.submitFailedTitle,
          description: data.error || v.submitFailedFallback,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Onboarding submit error:', error);
      const vTexts = getValidationTexts(language);
      toast({
        title: vTexts.networkErrorTitle,
        description: vTexts.networkErrorDesc,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const sportRoleOptions = getSportRolesForLanguage(language);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        {/* HERO alinhado com /sports e /sports/houses */}
        <section className="border-b border-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 md:py-14">
            <div className="grid md:grid-cols-[2fr,1.2fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
                  LEGACY Onboarding — Sports & Web3
                </span>

                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Onboarding personalizado para a tua jornada no LEGACY.
                </h1>

                <p className="mt-3 text-sm md:text-base text-blue-100 max-w-xl">
                  Em <strong>/sports</strong> ficaste com o contexto. Em{' '}
                  <strong>Houses of Sports</strong> viste onde a comunidade está
                  a nascer. Aqui, dizes quem és, de onde vens e o que procuras.
                  É o passo que liga a tua realidade à educação séria em
                  Blockchain, Web3 e à Apertum.
                </p>

                <p className="mt-3 text-xs text-blue-200/80 max-w-xl">
                  Não interessa se és atleta, treinador, staff, empreendedor ou
                  apenas alguém que quer entender este novo mundo sem cair em
                  modas vazias. O objetivo é simples: dar-te um primeiro mapa,
                  em vez de te atirar para um mar de termos técnicos sem rumo.
                </p>
              </div>

              <div className="bg-card-custom border border-custom rounded-2xl p-5 text-xs text-body shadow-lg">
                <h2 className="text-sm font-semibold text-heading mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  O que acontece depois do envio?
                </h2>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    A tua candidatura entra numa fila interna ligada ao teu
                    país, desporto (se fizer sentido) e tipo de perfil.
                  </li>
                  <li>
                    Alguém da equipa LEGACY ou de uma House revê a tua
                    informação com calma.
                  </li>
                  <li>
                    Vais receber contacto por email ou Telegram em 24-48 horas
                    com os próximos passos.
                  </li>
                  <li>
                    Se fizer sentido, vais ser encaminhado para Houses, cursos e
                    conteúdos privados alinhados com o teu momento.
                  </li>
                </ol>
                <p className="mt-3 text-[11px] text-muted-custom">
                  Tudo o que escreves aqui é tratado com respeito. O foco é
                  educação e clareza — não hype, não promessas rápidas, não
                  “ficar rico em 30 dias”.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FORMULÁRIO */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Step indicator visual mais discreto */}
              <div className="mb-6 flex flex-wrap items-center gap-2 text-[11px] text-blue-100/80">
                <span className="font-semibold uppercase tracking-wide">
                  {t('onboarding.title')}
                </span>
                <span className="h-[1px] w-6 bg-blue-500/60" />
                <span>{t('onboarding.subtitle')}</span>
              </div>

              {/* Como queres usar o LEGACY? */}
              <Card className="mb-6 bg-slate-950/70 border border-slate-800 text-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    {getProfileModeTitle(language)}
                  </CardTitle>
                  <CardDescription className="text-blue-200/80">
                    Escolhe se vens pelo lado do desporto ou apenas para
                    aprender Blockchain, Web3 e Apertum. Isto ajusta o tipo de
                    perguntas que te fazemos e o contexto interno onde a tua
                    candidatura aparece.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setIsNonSports(false)}
                      className={`flex-1 rounded-lg border px-3 py-3 text-left text-sm transition ${
                        !isNonSports
                          ? 'border-blue-500 bg-blue-950/60 text-blue-50 shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                          : 'border-slate-700 bg-slate-950 text-blue-100 hover:border-blue-500/60'
                      }`}
                    >
                      <span className="block font-semibold mb-1">
                        {getProfileModeSportsLabel(language)}
                      </span>
                      <span className="block text-[11px] text-blue-200/80">
                        Ex: atleta, treinador, clube, dirigente, criador de
                        conteúdo, staff técnico.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsNonSports(true)}
                      className={`flex-1 rounded-lg border px-3 py-3 text-left text-sm transition ${
                        isNonSports
                          ? 'border-emerald-500 bg-emerald-950/60 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                          : 'border-slate-700 bg-slate-950 text-blue-100 hover:border-emerald-500/60'
                      }`}
                    >
                      <span className="block font-semibold mb-1">
                        {getProfileModeGeneralLabel(language)}
                      </span>
                      <span className="block text-[11px] text-emerald-100/90">
                        Ex: profissional de outra área, empreendedor, curioso
                        por Web3, tecnologia ou finanças que quer base sólida
                        antes de arriscar.
                      </span>
                    </button>
                  </div>

                  <p className="mt-3 text-[11px] text-blue-200/80">
                    {getProfileModeHint(language)}
                  </p>
                </CardContent>
              </Card>

              <form onSubmit={handleSubmit}>
                {/* Step 1 - Contactos */}
                <Card className="mb-6 bg-card-custom border-custom">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      {t('onboarding.step1')}
                    </CardTitle>
                    <CardDescription>
                      {t('onboarding.howReach')} {t('onboarding.atLeastOne')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('onboarding.email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('onboarding.phone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+3519XXXXXXXX"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telegram">
                          {t('onboarding.telegram')}
                        </Label>
                        <Input
                          id="telegram"
                          placeholder="@teuusername"
                          value={formData.telegram}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telegram: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 - Dados pessoais básicos */}
                <Card className="mb-6 bg-card-custom border-custom">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {t('onboarding.step2')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        {t('onboarding.fullName')} *
                      </Label>
                      <Input
                        id="full_name"
                        placeholder="Nome completo"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            full_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        {t('onboarding.country')} *
                      </Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) =>
                          setFormData({ ...formData, country: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('onboarding.selectCountry')}
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3 - Desporto + Role (só se NÃO for perfil geral) */}
                <Card className="mb-6 bg-card-custom border-custom">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                      {!isNonSports
                        ? t('onboarding.step3')
                        : L === 'pt'
                        ? 'Contexto profissional (sem ligação ao desporto)'
                        : L === 'es'
                        ? 'Contexto profesional (sin relación con el deporte)'
                        : 'Professional context (non-sports)'}
                    </CardTitle>
                    {!isNonSports && (
                      <CardDescription>
                        {t('onboarding.sportInterest')}
                      </CardDescription>
                    )}
                    {isNonSports && (
                      <CardDescription>
                        {L === 'pt'
                          ? 'Se não estás ligado a um desporto em específico, podes ignorar esta secção. Vamos focar apenas na tua jornada Web3.'
                          : L === 'es'
                          ? 'Si no estás vinculado a un deporte concreto, puedes ignorar esta sección. Nos centraremos solo en tu recorrido Web3.'
                          : 'If you are not connected to a specific sport, you can ignore this section. We will focus only on your Web3 journey.'}
                      </CardDescription>
                    )}
                  </CardHeader>

                  {!isNonSports ? (
                    <CardContent className="space-y-4">
                      {/* Desporto */}
                      <div className="space-y-2">
                        <Label htmlFor="sports_category">
                          {t('onboarding.sportInterest')}
                        </Label>
                        <Select
                          value={formData.sports_category}
                          onValueChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              sports_category: value,
                            }));
                            const isOther = value === 'other_sport';
                            setOtherSport(isOther);
                            if (!isOther) {
                              setFormData((prev) => ({
                                ...prev,
                                sports_category_other: '',
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('onboarding.selectSport')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sportsLoading && (
                              <SelectItem value="loading" disabled>
                                {getLoadingSportsLabel(language)}
                              </SelectItem>
                            )}

                            {!sportsLoading && sports.length > 0 && (
                              <>
                                {sports.map((sport) => (
                                  <SelectItem
                                    key={sport.code}
                                    value={sport.code}
                                  >
                                    {formatSportLabel(sport)}
                                  </SelectItem>
                                ))}
                              </>
                            )}

                            {!sportsLoading && sports.length === 0 && (
                              <>
                                {HOUSES_OF_SPORTS[language].map(
                                  (sportLabel: any, index: number) => (
                                    <SelectItem
                                      key={String(sportLabel)}
                                      value={String(HOUSES_OF_SPORTS.en[index])}
                                    >
                                      {String(sportLabel)}
                                    </SelectItem>
                                  ),
                                )}
                              </>
                            )}

                            <SelectItem value="other_sport">
                              {getOtherSportOptionLabel(language)}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {otherSport && (
                        <div className="space-y-2">
                          <Label htmlFor="sports_category_other">
                            {getOtherSportPlaceholder(language)}
                          </Label>
                          <Input
                            id="sports_category_other"
                            placeholder={getOtherSportPlaceholder(language)}
                            value={formData.sports_category_other}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                sports_category_other: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      )}

                      {/* Persona / Role */}
                      <div className="space-y-2">
                        <Label htmlFor="sports_role">
                          {t('onboarding.yourRole')}
                        </Label>
                        <Select
                          value={formData.sports_role}
                          onValueChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              sports_role: value,
                            }));
                            const isOther = value === 'other_role';
                            setOtherRole(isOther);
                            if (!isOther) {
                              setFormData((prev) => ({
                                ...prev,
                                sports_role_other: '',
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('onboarding.selectRole')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sportRoleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}

                            <SelectItem value="other_role">
                              {getOtherRoleOptionLabel(language)}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {otherRole && (
                        <div className="space-y-2">
                          <Label htmlFor="sports_role_other">
                            {getOtherRolePlaceholder(language)}
                          </Label>
                          <Input
                            id="sports_role_other"
                            placeholder={getOtherRolePlaceholder(language)}
                            value={formData.sports_role_other}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                sports_role_other: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="organization">
                          {t('onboarding.organization')}
                        </Label>
                        <Input
                          id="organization"
                          placeholder={t(
                            'onboarding.organizationPlaceholder',
                          )}
                          value={formData.organization}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              organization: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent>
                      <p className="text-xs text-muted-custom">
                        Como escolheste o modo geral (sem ligação a desporto),
                        vamos ignorar desporto, papel e organização nesta
                        candidatura. O foco será apenas o teu contexto, país e
                        objetivos em relação a Blockchain, Web3 e Apertum.
                      </p>
                    </CardContent>
                  )}
                </Card>

                {/* Step 4 - Web3 + interesses */}
                <Card className="mb-6 bg-card-custom border-custom">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                      {t('onboarding.step4')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="web3_experience">
                        {t('onboarding.web3Experience')}
                      </Label>
                      <Select
                        value={formData.web3_experience}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            web3_experience: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('onboarding.selectExperience')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t('onboarding.experienceNone')}
                          </SelectItem>
                          <SelectItem value="beginner">
                            {t('onboarding.experienceBeginner')}
                          </SelectItem>
                          <SelectItem value="intermediate">
                            {t('onboarding.experienceIntermediate')}
                          </SelectItem>
                          <SelectItem value="advanced">
                            {t('onboarding.experienceAdvanced')}
                          </SelectItem>
                          <SelectItem value="expert">
                            {t('onboarding.experienceExpert')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!isNonSports && (
                      <div className="space-y-2">
                        <Label>{t('onboarding.areasOfInterest')}</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                          {interests.map((interest) => (
                            <div
                              key={interest}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={interest}
                                checked={formData.interests.includes(interest)}
                                onCheckedChange={() =>
                                  handleInterestToggle(interest)
                                }
                              />
                              <label
                                htmlFor={interest}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {interest}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 5 - Mensagem */}
                <Card className="mb-6 bg-card-custom border-custom">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      {t('onboarding.step5')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="message">
                        {t('onboarding.yourMessage')} * (8-8888{' '}
                        {t('onboarding.characters')})
                      </Label>
                      <Textarea
                        id="message"
                        rows={6}
                        placeholder={t('onboarding.messagePlaceholder')}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                        required
                        minLength={8}
                        maxLength={8888}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {formData.message.length}/8888{' '}
                        {t('onboarding.characters')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading
                    ? t('onboarding.submitting')
                    : t('onboarding.submitBtn')}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Dialog pós-submissão */}
      <Dialog
        open={showPostSubmitDialog}
        onOpenChange={setShowPostSubmitDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrigado pela tua candidatura!</DialogTitle>
            <DialogDescription>
              Enquanto esperas pelo contacto da equipa LEGACY, podes registar-te
              com o mesmo email e começar a explorar conteúdos que não estão
              visíveis para visitantes anónimos.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              className="w-full bg-black text-white hover:bg-gray-900"
              onClick={handleGoToSignup}
            >
              Registar-me com este email
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPostSubmitDialog(false)}
            >
              Explorar primeiro, criar conta depois
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
