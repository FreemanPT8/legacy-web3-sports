'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CoursesPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, statsRes] = await Promise.all([
          fetch('/api/courses'),
          fetch('/api/education/stats'),
        ]);

        const coursesData = await coursesRes.json();
        const statsData = await statsRes.json();

        if (coursesData.success) {
          setCourses(coursesData.courses);
        }
        if (statsData.success) {
          setStats(statsData.stats);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const totalLessons = courses.reduce((acc, course) => {
    const modulesArray = Array.isArray(course.modules) ? course.modules : [];
    return (
      acc +
      modulesArray.reduce((modAcc: number, mod: any) => {
        const lessonsArray = Array.isArray(mod.lessons) ? mod.lessons : [];
        return modAcc + lessonsArray.length;
      }, 0)
    );
  }, 0);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-green-600">
            {t('education.level.beginner')}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-yellow-600">
            {t('education.level.intermediate')}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-red-600">
            {t('education.level.advanced')}
          </Badge>
        );
      default:
        return <Badge>{t('education.level.unknown')}</Badge>;
    }
  };

  const userXP = user?.xp_total || 0;

  // Número de cursos disponíveis de acordo com o XP do utilizador
  const availableCoursesCount = courses.filter((c) => {
    const xpThreshold = c.xp_threshold ?? 0;
    return xpThreshold <= userXP;
  }).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {t('courses.mainTitle')}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('courses.mainSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {courses.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('courses.totalCourses')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {totalLessons}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('courses.lessons')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats?.totalUsers || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('courses.activeLearners')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      2,000+
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('courses.xpAvailable')}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('courses.yourProgress')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        {t('courses.yourXP')}
                      </span>
                      <span className="font-bold text-blue-600">
                        {userXP} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        {t('courses.availableCourses')}
                      </span>
                      <span className="font-bold">
                        {availableCoursesCount}/{courses.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        {t('courses.totalLessons')}
                      </span>
                      <span className="font-bold">{totalLessons}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {t('courses.loading')}
                </p>
              </div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {t('courses.noCourses')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('courses.noCoursesDesc')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const title = getMultilingualContent(
                    course.title,
                    language,
                  );
                  const description = getMultilingualContent(
                    course.description,
                    language,
                  );

                  const xpThreshold = course.xp_threshold ?? 0;
                  const isLocked = xpThreshold > userXP;

                  const modulesArray = Array.isArray(course.modules)
                    ? course.modules
                    : [];
                  const lessonsCount = modulesArray.reduce(
                    (acc: number, mod: any) => {
                      const lessonsArray = Array.isArray(mod.lessons)
                        ? mod.lessons
                        : [];
                      return acc + lessonsArray.length;
                    },
                    0,
                  );

                  return (
                    <Card
                      key={course.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          {getLevelBadge(course.level)}
                          <Badge variant="outline">
                            {xpThreshold} XP {t('courses.required')}
                          </Badge>
                        </div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <BookOpen className="h-4 w-4" />
                            <span>
                              {modulesArray.length} modules • {lessonsCount}{' '}
                              lessons
                            </span>
                          </div>
                          {isLocked ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                  {t('courses.unlockAt')} {xpThreshold} XP
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                disabled
                              >
                                {t('courses.locked')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                                <span className="text-sm">
                                  {t('courses.availableNow')}
                                </span>
                              </div>
                              <Link
                                href={`/education/courses/${course.id}`}
                              >
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                  {t('courses.startCourse')}
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
