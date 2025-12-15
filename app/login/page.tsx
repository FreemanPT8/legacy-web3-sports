'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.username, formData.password);

    if (result.success) {
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });
      router.push('/dashboard');
    } else {
      toast({
        title: t('auth.loginFailed'),
        description: result.error || t('auth.invalidCredentials'),
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-[#05212b] p-6 md:p-8">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-cyan-300" />
              <span className="bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] bg-clip-text text-2xl font-bold text-transparent">
                LEGACY
              </span>
            </div>
          </div>
          <CardTitle className="text-center text-2xl text-white">{t('nav.login')}</CardTitle>
          <CardDescription className="text-center text-slate-300">
            Introduz as tuas credenciais para entrares no Legacy.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-slate-200">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="O teu username"
                className="bg-[#000c12] border-white/10 text-white placeholder:text-slate-400"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-200">
                Palavra-passe
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="A tua palavra-passe"
                className="bg-[#000c12] border-white/10 text-white placeholder:text-slate-400"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-slate-300 hover:text-cyan-300">
                Esqueceste a palavra-passe?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A entrar...' : t('nav.login')}
            </Button>
            <p className="text-center text-sm text-slate-400">
              Ainda não tens conta?{' '}
              <Link href="/signup" className="text-xs text-slate-300 hover:text-cyan-300">
                {t('nav.signup')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
