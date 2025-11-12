'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Users, Globe2, Zap, Target, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General',
    message: ''
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/education/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t('about.messageSent'),
      description: t('about.messageResponse'),
    });
    setFormData({ name: '', email: '', subject: 'General', message: '' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('about.title')}</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                <Card className="text-center">
                  <CardHeader>
                    <Users className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <CardTitle className="text-3xl font-bold">{stats?.activeUsers || 0}+</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{t('about.activeMembers')}</p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <CardTitle className="text-3xl font-bold">{stats?.totalLessons || 0}+</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{t('about.lessonsAvailable')}</p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Globe2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <CardTitle className="text-3xl font-bold">6</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{t('about.languagesSupported')}</p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Award className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <CardTitle className="text-3xl font-bold">{stats?.totalBlogPosts || 0}+</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{t('about.blogArticles')}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('about.mission')}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {t('about.missionDesc')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <Target className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle>{t('about.visionTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('about.visionDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Zap className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle>{t('about.quality')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('about.qualityDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Users className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle>{t('about.community')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('about.communityDesc')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Trophy className="h-10 w-10 text-blue-600 mb-3" />
                    <CardTitle>{t('about.gamification')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('about.gamificationDesc')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">{t('about.ourStory')}</h2>
              <div className="prose prose-lg max-w-none text-gray-600 dark:text-gray-300">
                <p className="mb-4">
                  {t('about.story1')}
                </p>
                <p className="mb-4">
                  {t('about.story2')}
                </p>
                <p>
                  {t('about.story3')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">{t('about.contact')}</h2>
              <Card>
                <CardHeader>
                  <CardTitle>{t('about.sendMessage')}</CardTitle>
                  <CardDescription>
                    {t('about.messagePrompt')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('about.name')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('about.email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t('about.subject')} *</Label>
                      <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">{t('about.general')}</SelectItem>
                          <SelectItem value="Support">{t('about.support')}</SelectItem>
                          <SelectItem value="Feedback">{t('about.feedback')}</SelectItem>
                          <SelectItem value="Partnership">{t('about.partnership')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t('about.message')} *</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
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
