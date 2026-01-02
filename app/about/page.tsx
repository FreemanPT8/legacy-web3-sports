'use client';

import { useState, useEffect } from 'react';
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
import {
  Trophy,
  Users,
  Globe2,
  Zap,
  Target,
  Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

interface EducationStats {
  activeUsers?: number;
  totalLessons?: number;
  totalBlogPosts?: number;
}

export default function AboutPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [stats, setStats] = useState<EducationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General',
    message: '',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/education/stats');
        const data = await response.json();
        if (data?.success) {
          setStats(data.stats || null);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    toast({
      title: t('about.messageSent'),
      description: t('about.messageResponse'),
    });

    setFormData({
      name: '',
      email: '',
      subject: 'General',
      message: '',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] text-white">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <HeroSection className="text-center">
              <HeroTextColumn className="mx-auto max-w-3xl space-y-4">
                <HeroEyebrow className="text-cyan-200 mb-0">
                  {t('about.mission')}
                </HeroEyebrow>
                <HeroTitle className="text-3xl md:text-5xl text-white">
                  {t('about.title')}
                </HeroTitle>
                <HeroDescription className="text-base text-slate-200 md:text-xl">
                  {t('about.subtitle')}
                </HeroDescription>
              </HeroTextColumn>
            </HeroSection>
          </div>
        </section>

        {/* STATS / NUMEROS DA PLATAFORMA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-400" />
                <p className="text-sm text-slate-300">
                  A carregar estatisticas da comunidade...
                </p>
              </div>
            ) : (
              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
                <Card className="border border-white/10 bg-[#04131b]/80 text-center shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                  <CardHeader>
                    <Users className="mx-auto mb-2 h-10 w-10 text-[#5af3ff]" />
                    <CardTitle className="text-2xl font-bold text-[#fdd87c]">
                      {(stats?.activeUsers ?? 0) + '+'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.activeMembers')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 text-center shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                  <CardHeader>
                    <Trophy className="mx-auto mb-2 h-10 w-10 text-[#5af3ff]" />
                    <CardTitle className="text-2xl font-bold text-[#fdd87c]">
                      {(stats?.totalLessons ?? 0) + '+'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.lessonsAvailable')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 text-center shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                  <CardHeader>
                    <Globe2 className="mx-auto mb-2 h-10 w-10 text-[#5af3ff]" />
                    <CardTitle className="text-2xl font-bold text-[#fdd87c]">6</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.languagesSupported')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 text-center shadow-[0_25px_60px_rgba(3,10,25,0.65)]">
                  <CardHeader>
                    <Award className="mx-auto mb-2 h-10 w-10 text-[#5af3ff]" />
                    <CardTitle className="text-2xl font-bold text-[#fdd87c]">
                      {(stats?.totalBlogPosts ?? 0) + '+'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.blogArticles')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* MISSAO / VISAO / QUALIDADE / COMUNIDADE */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-200">
                  {t('about.mission')}
                </p>
                <h2 className="mb-3 text-2xl font-bold text-[#fdd87c] md:text-3xl">
                  {t('about.mission')}
                </h2>
                <p className="text-base text-slate-200">
                  {t('about.missionDesc')}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border border-white/10 bg-[#04131b]/80 shadow-[0_25px_60px_rgba(3,10,25,0.6)]">
                  <CardHeader>
                    <Target className="mb-2 h-8 w-8 text-[#5af3ff]" />
                    <CardTitle className="text-white">
                      {t('about.visionTitle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.visionDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 shadow-[0_25px_60px_rgba(3,10,25,0.6)]">
                  <CardHeader>
                    <Zap className="mb-2 h-8 w-8 text-[#5af3ff]" />
                    <CardTitle className="text-white">
                      {t('about.quality')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.qualityDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 shadow-[0_25px_60px_rgba(3,10,25,0.6)]">
                  <CardHeader>
                    <Users className="mb-2 h-8 w-8 text-[#5af3ff]" />
                    <CardTitle className="text-white">
                      {t('about.community')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.communityDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 shadow-[0_25px_60px_rgba(3,10,25,0.6)]">
                  <CardHeader>
                    <Trophy className="mb-2 h-8 w-8 text-[#5af3ff]" />
                    <CardTitle className="text-white">
                      {t('about.gamification')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300">
                      {t('about.gamificationDesc')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORIA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#04131b]/90 px-6 py-10 text-center shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
              <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-200">
                {t('about.ourStory')}
              </p>
              <h2 className="mb-6 text-2xl font-bold text-[#fdd87c] md:text-3xl">
                {t('about.ourStory')}
              </h2>
              <div className="prose prose-sm mx-auto max-w-3xl text-left text-slate-200 md:prose-lg">
                <p className="mb-4 text-slate-300">{t('about.story1')}</p>
                <p className="mb-4 text-slate-300">{t('about.story2')}</p>
                <p className="text-slate-300">{t('about.story3')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
              <h2 className="mb-6 text-center text-2xl font-bold text-[#fdd87c] md:text-3xl">
                {t('about.contact')}
              </h2>
              <Card className="border border-white/10 bg-[#04131b]/80 shadow-[0_25px_60px_rgba(3,10,25,0.6)]">
                <CardHeader>
                  <CardTitle className="text-white">
                    {t('about.sendMessage')}
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    {t('about.messagePrompt')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-200">
                        {t('about.name')} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200">
                        {t('about.email')} *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-slate-200">
                        {t('about.subject')} *
                      </Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) =>
                          setFormData({ ...formData, subject: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">
                            {t('about.general')}
                          </SelectItem>
                          <SelectItem value="Support">
                            {t('about.support')}
                          </SelectItem>
                          <SelectItem value="Feedback">
                            {t('about.feedback')}
                          </SelectItem>
                          <SelectItem value="Partnership">
                            {t('about.partnership')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-slate-200">
                        {t('about.message')} *
                      </Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      {t('about.sendBtn')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
