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
import { Mail, MessageSquare, User, Trophy, Lightbulb } from 'lucide-react';
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

// Normalizar SPORTS_ROLES para { value, label } e evitar [object Object] / value=""
function getSportRolesForLanguage(language: string): SportRoleOption[] {
  const rawRoles: any[] =
    (SPORTS_ROLES as any)[language] || (SPORTS_ROLES as any).en || [];

  return rawRoles
    .map((role: any): SportRoleOption => {
      // Caso simples: já é string
      if (typeof role === 'string') {
        return { value: role, label: role };
      }

      // Caso seja objeto
      if (role && typeof role === 'object') {
        const langKey = language;

        let label: string | undefined;

        // Tentativas de encontrar label
        if (typeof role.label === 'string') {
          label = role.label;
        } else if (
          role.label &&
          typeof role.label[langKey] === 'string'
        ) {
          label = role.label[langKey];
        } else if (
          role.i18n &&
          typeof role.i18n[langKey] === 'string'
        ) {
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

      // Fallback bruto
      return { value: String(role ?? ''), label: String(role ?? '') };
    })
    // Garantir que nunca temos value vazio (Radix não gosta de "")
    .filter((r) => r.value.trim() !== '');
}

// Formatar label de desporto: usa name se for diferente do code;
// caso contrário, converte o code em “Title Case”.
function formatSportLabel(sport: SportOption): string {
  if (sport.name && sport.name.toLowerCase() !== sport.code.toLowerCase()) {
    return sport.name;
  }

  const withSpaces = sport.code.replace(/_/g, ' ');
  return withSpaces
    .split(' ')
    .filter(Boolean)
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
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
        'Um responsável de uma House vai contactar-te em 24-48 horas pelo método de contacto que escolheste.',
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
        'Un responsable de una House te contactará en 24-48 horas por tu método de contacto preferido.',
      submitFailedTitle: 'Error al enviar la solicitud',
      submitFailedFallback: 'Vuelve a intentarlo, por favor.',
      networkErrorTitle: 'Error de red',
      networkErrorDesc: 'Comprueba tu conexión e inténtalo de nuevo.',
    };
  }

  // EN (default)
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
      'A House admin will contact you within 24-48 hours via your preferred contact method.',
    submitFailedTitle: 'Submission failed',
    submitFailedFallback: 'Please try again',
    networkErrorTitle: 'Network error',
    networkErrorDesc: 'Please check your connection and try again',
  };
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // lista de desportos vinda da API
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsError, setSportsError] = useState<string | null>(null);

  // controlo de "Outro desporto" e "Outro papel"
  const [otherSport, setOtherSport] = useState(false);
  const [otherRole, setOtherRole] = useState(false);

  // diálogo pós-submissão
  const [showPostSubmitDialog, setShowPostSubmitDialog] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    telegram: '',
    full_name: '',
    country: '',
    sports_category: '', // aqui guardamos o "code" do desporto
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

    setLoading(true);

    try {
      const payload: any = { ...formData };

      // se o utilizador estiver autenticado, ligar submissão ao user_id
      if (user?.id) {
        payload.user_id = user.id;
      }

      // Tratar “Outro desporto” + sports_category_code
      if (payload.sports_category === 'other_sport') {
        payload.sports_category = payload.sports_category_other.trim();
        payload.sports_category_code = null;
      } else if (payload.sports_category) {
        // aqui assumimos que sports_category guarda o code
        payload.sports_category_code = payload.sports_category;
      } else {
        payload.sports_category_code = null;
      }

      // Tratar “Outro papel”
      if (payload.sports_role === 'other_role') {
        payload.sports_role = payload.sports_role_other.trim();
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

        // guardar email submetido para usar no popup
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

        // abrir popup de registo
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
      toast({
        title: v.networkErrorTitle,
        description: v.networkErrorDesc,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const sportRoleOptions = getSportRolesForLanguage(language);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {t('onboarding.title')}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('onboarding.subtitle')}
              </p>
            </div>

            <Card className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle>{t('onboarding.howItWorks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                      1
                    </div>
                    <p className="text-sm font-semibold mb-1">
                      {t('onboarding.fillForm')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {t('onboarding.fillFormDesc')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                      2
                    </div>
                    <p className="text-sm font-semibold mb-1">
                      {t('onboarding.adminReview')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {t('onboarding.adminReviewDesc')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                      3
                    </div>
                    <p className="text-sm font-semibold mb-1">
                      {t('onboarding.emailContact')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {t('onboarding.emailContactDesc')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                      4
                    </div>
                    <p className="text-sm font-semibold mb-1">
                      {t('onboarding.zoomMeeting')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {t('onboarding.zoomMeetingDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
              {/* Step 1 - Contactos */}
              <Card className="mb-6">
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
                        placeholder="+1234567890"
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
                        placeholder="@yourusername"
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
              <Card className="mb-6">
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
                      placeholder="John Doe"
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

              {/* Step 3 - Desporto + Role */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    {t('onboarding.step3')}
                  </CardTitle>
                </CardHeader>
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
                              <SelectItem key={sport.code} value={sport.code}>
                                {formatSportLabel(sport)}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Fallback para o caso da API falhar: usa HOUSES_OF_SPORTS antiga */}
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
                              )
                            )}
                          </>
                        )}

                        {/* Opção "Outro desporto" */}
                        <SelectItem value="other_sport">
                          {getOtherSportOptionLabel(language)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo extra quando escolhe "Outro desporto" */}
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

                        {/* Opção "Outro papel" */}
                        <SelectItem value="other_role">
                          {getOtherRoleOptionLabel(language)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo extra quando escolhe "Outro papel" */}
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
                      placeholder={t('onboarding.organizationPlaceholder')}
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
              </Card>

              {/* Step 4 - Web3 + interesses */}
              <Card className="mb-6">
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
                </CardContent>
              </Card>

              {/* Step 5 - Mensagem */}
              <Card className="mb-6">
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
      </main>

      <Footer />

      {/* Dialog pós-submissão */}
      <Dialog
        open={showPostSubmitDialog}
        onOpenChange={setShowPostSubmitDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you for your application!</DialogTitle>
            <DialogDescription>
              While you wait for the LEGACY team to contact you, register with
              the same email and start exploring exclusive content that is not
              visible to unregistered users.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              className="w-full bg-black text-white hover:bg-gray-900"
              onClick={handleGoToSignup}
            >
              Register
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPostSubmitDialog(false)}
            >
              Explore without account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
