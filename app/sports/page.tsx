'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, HOUSES_OF_SPORTS, SPORTS_ROLES } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Phone, MessageSquare, User, Trophy, Lightbulb } from 'lucide-react';

type SportOption = {
  id: string;
  code: string;
  name: string;
};

export default function OnboardingPage() {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // lista de desportos vinda da API
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsError, setSportsError] = useState<string | null>(null);

  // controlo de "Outro desporto" e "Outro papel"
  const [otherSport, setOtherSport] = useState(false);
  const [otherRole, setOtherRole] = useState(false);

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

  // helpers manuais para “Outro desporto / Outro papel” em 6 línguas
  const getOtherSportOptionLabel = (lang: string): string => {
    switch (lang) {
      case 'pt':
        return 'Outro desporto';
      case 'es':
        return 'Otro deporte';
      case 'fr':
        return 'Autre sport';
      case 'de':
        return 'Andere Sportart';
      case 'it':
        return 'Altro sport';
      default:
        return 'Other sport';
    }
  };

  const getOtherSportPlaceholder = (lang: string): string => {
    switch (lang) {
      case 'pt':
        return 'Especifica o teu desporto / disciplina';
      case 'es':
        return 'Especifica tu deporte / disciplina';
      case 'fr':
        return 'Précise ton sport / ta discipline';
      case 'de':
        return 'Gib deine Sportart / Disziplin an';
      case 'it':
        return 'Specifica il tuo sport / la tua disciplina';
      default:
        return 'Please specify your sport / discipline';
    }
  };

  const getOtherRolePlaceholder = (lang: string): string => {
    switch (lang) {
      case 'pt':
        return 'Especifica o teu papel no desporto';
      case 'es':
        return 'Especifica tu papel en el deporte';
      case 'fr':
        return 'Précise ton rôle dans le sport';
      case 'de':
        return 'Gib deine Rolle im Sport an';
      case 'it':
        return 'Specifica il tuo ruolo nello sport';
      default:
        return 'Please specify your role in sports';
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name || !formData.country) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.message.length < 8 || formData.message.length > 8888) {
      toast({
        title: 'Invalid message length',
        description: 'Message must be between 8 and 8888 characters',
        variant: 'destructive',
      });
      return;
    }

    // validação específica para “Outro desporto”
    if (formData.sports_category === 'other_sport' && !formData.sports_category_other.trim()) {
      toast({
        title: 'Please specify your sport',
        description: 'You selected "Other sport". Please specify which sport.',
        variant: 'destructive',
      });
      return;
    }

    // validação específica para “Outro papel”
    if (formData.sports_role === 'Other role' && !formData.sports_role_other.trim()) {
      toast({
        title: 'Please specify your role',
        description: 'You selected "Other role". Please specify your role in sports.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // preparar payload para não partir o backend:
      const payload: any = { ...formData };

      if (payload.sports_category === 'other_sport') {
        payload.sports_category = payload.sports_category_other.trim();
      }

      if (payload.sports_role === 'Other role') {
        payload.sports_role = payload.sports_role_other.trim();
      }

      // não enviamos os campos auxiliares para o backend
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
          title: 'Application submitted!',
          description:
            'A House admin will contact you within 24-48 hours via your preferred contact method.',
        });
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
        setStep(1);
      } else {
        toast({
          title: 'Submission failed',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Onboarding submit error:', error);
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('onboarding.title')}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">{t('onboarding.subtitle')}</p>
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
                    <p className="text-sm font-semibold mb-1">{t('onboarding.fillForm')}</p>
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
                      <Label htmlFor="telegram">{t('onboarding.telegram')}</Label>
                      <Input
                        id="telegram"
                        placeholder="@yourusername"
                        value={formData.telegram}
                        onChange={(e) =>
                          setFormData({ ...formData, telegram: e.target.value })
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
                    <Label htmlFor="full_name">{t('onboarding.fullName')} *</Label>
                    <Input
                      id="full_name"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">{t('onboarding.country')} *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) =>
                        setFormData({ ...formData, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('onboarding.selectCountry')} />
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
                        <SelectValue placeholder={t('onboarding.selectSport')} />
                      </SelectTrigger>
                      <SelectContent>
                        {sportsLoading && (
                          <SelectItem value="loading" disabled>
                            Loading sports...
                          </SelectItem>
                        )}

                        {!sportsLoading && sports.length > 0 && (
                          <>
                            {sports.map((sport) => (
                              <SelectItem key={sport.code} value={sport.code}>
                                {sport.name}
                              </SelectItem>
                            ))}
                          </>
                        )}

                        {/* Fallback para o caso da API falhar: usa HOUSES_OF_SPORTS antiga */}
                        {!sportsLoading && sports.length === 0 && (
                          <>
                            {HOUSES_OF_SPORTS[language].map((sportLabel, index) => (
                              <SelectItem
                                key={sportLabel as string}
                                value={HOUSES_OF_SPORTS.en[index] as string}
                              >
                                {sportLabel}
                              </SelectItem>
                            ))}
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
                    <Label htmlFor="sports_role">{t('onboarding.yourRole')}</Label>
                    <Select
                      value={formData.sports_role}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          sports_role: value,
                        }));
                        const isOther = value === 'Other role'; // valor canónico em inglês
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
                        <SelectValue placeholder={t('onboarding.selectRole')} />
                      </SelectTrigger>
                     <SelectContent>
  {(SPORTS_ROLES[language] as any[]).map((roleLabel: any, index: number) => {
    const roleEn = (SPORTS_ROLES.en as any[])[index];

    return (
      <SelectItem
        key={roleLabel.code ?? roleLabel ?? index}
        value={roleEn.code ?? roleEn}
      >
        {roleLabel.label ?? roleLabel}
      </SelectItem>
    );
  })}
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
                      placeholder={t(
                        'onboarding.organizationPlaceholder'
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
                        <div key={interest} className="flex items-center space-x-2">
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
    </div>
  );
}
