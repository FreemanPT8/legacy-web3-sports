'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, MessageSquare, Heart, Trophy, Flame, Target, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function XPPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('education.xp.title')}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('education.xp.description')}
              </p>
            </div>

            <Card className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="text-2xl">{t('education.xp.whatIsXP')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t('education.xp.whatIsXPDesc')}
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold">{t('education.xp.learn')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.learnDesc')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold">{t('education.xp.engage')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.engageDesc')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold">{t('education.xp.achieve')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.achieveDesc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    {t('education.xp.earningXP')}
                  </CardTitle>
                  <CardDescription>{t('education.xp.earningXPDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('education.xp.action')}</TableHead>
                        <TableHead className="text-right">{t('education.xp.xpReward')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{t('education.xp.completeLesson')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">7-33 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.readArticle')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">5-33 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.addBio')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+25 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.setSportsRole')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+19 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.relevantComment')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+5 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.maxPerDay25')}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.forumPost')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+3 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.maxPerDay30')}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.createTopic')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+12 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.maxPerDay36')}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.dailyMission')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+12 XP {t('education.xp.each')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.streakBonus')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+222 XP</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{t('education.xp.likeContent')}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">+0.5 XP</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    {t('education.xp.xpUnlocks')}
                  </CardTitle>
                  <CardDescription>{t('education.xp.xpUnlocksDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        0
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.basicAccess')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.basicAccessDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        99
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.profileEditing')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.profileEditingDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        369
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.forumRead')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.forumReadDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        444
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.forumInteract')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.forumInteractDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <div className="bg-cyan-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        555
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.forumCreate')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.forumCreateDesc')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="bg-yellow-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        3333
                      </div>
                      <div>
                        <p className="font-semibold">{t('education.xp.hallOfFame')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t('education.xp.hallOfFameDesc')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  {t('education.xp.streaksTitle')}
                </CardTitle>
                <CardDescription>{t('education.xp.streaksTitleDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('education.xp.dailyStreak')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    {t('education.xp.dailyStreakDesc')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('education.xp.dailyMissions')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    {t('education.xp.dailyMissionsDesc')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">{t('education.xp.masteryStrategies')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">1</Badge>
                    <span>{t('education.xp.strategy1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">2</Badge>
                    <span>{t('education.xp.strategy2')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">3</Badge>
                    <span>{t('education.xp.strategy3')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">4</Badge>
                    <span>{t('education.xp.strategy4')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">5</Badge>
                    <span>{t('education.xp.strategy5')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-white text-blue-600 mt-1">6</Badge>
                    <span>{t('education.xp.strategy6')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
