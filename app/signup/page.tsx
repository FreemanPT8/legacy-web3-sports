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
    <div className="min-h-screen flex items-center justify-center bg-[#000c12] p-4">
      <Card className="w-full max-w-md bg-card border border-border">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] bg-clip-text text-transparent">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {t('nav.signup')}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Create your account and start earning XP
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
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

            <div className="space-y-2">
              <Label htmlFor="sport">Sport *</Label>
              <Select
                value={formData.sportId}
                onValueChange={(value) =>
                  setFormData({ ...formData, sportId: value })
                }
                disabled={sportsLoading || !sports.length}
              >
                <SelectTrigger aria-invalid={!formData.sportId && !sportsLoading}>
                  <SelectValue placeholder={sportsLoading ? 'Loading sports...' : 'Select your sport'} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sportsError ? (
                <p className="text-xs text-red-400">{sportsError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {sportsLoading ? 'Loading official sports...' : 'Choose the House sport that matches your entry.'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : t('nav.signup')}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline"
              >
                {t('nav.login')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
