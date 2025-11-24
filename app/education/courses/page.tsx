'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  BookOpen,
  Award,
  Lock,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

type Lesson = {
  id: string;
  xp_reward: number;
};

type Module = {
  id: string;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: any;
  description: any;
  level?: string | null;
  xp_threshold: number;
  image_url?: string | null;
  modules?: Module[];
};

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const userXP = user?.xp_total || 0;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/courses?includeModules=true');
        const data = await res.json();

        if (!res.ok || !data.success) {
          console.error('Failed to load courses:', data.error);
          setCourses([]);
        } else {
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const getLevelBadge = (level?: string | null) => {
    switch (level) {
      case 'beginner':
        return (
          <Badge className="bg-green-600">
            {t('education.level.beginner') || 'Beginner'}
          </Badge>
        );
      case 'intermediate':
        return (
          <Badge className="bg-yellow-600">
            {t('education.level.intermediate') || 'Intermediate'}
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-red-600">
            {t('education.level.advanced') || 'Advanced'}
          </Badge>
        );
      default:
        return <Badge>{t('education.level.unknown') || 'All levels'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('courses.loading') || 'Loading courses...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Hero */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {t('courses.mainTitle') || t('courses.title') || 'Courses'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                  {t('courses.mainSubtitle') ||
                    t('courses.subtitle') ||
                    'Unlock structured learning paths about Web3, blockchain and the Apertum ecosystem. Earn XP as you progress.'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-gray-600 dark:text-gray-300">
                      {t('courses.yourXP') || 'Your XP'}:{' '}
                      <strong>{userXP}</strong>
                    </span>
                    <Badge variant="outline">
                      {t('courses.loggedIn') || 'Signed in'}
                    </Badge>
                  </>
                ) : (
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('auth.login') || 'Login to earn XP'}
                  </Button>
                )}
              </div>
            </div>

            {courses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  {t('courses.noCourses') ||
                    'No courses available yet. Check back soon!'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const title = getMultilingualContent(
                    course.title,
                    language,
                  );
                  const description = getMultilingualContent(
                    course.description,
                    language,
                  );

                  const modulesArray: Module[] = Array.isArray(course.modules)
                    ? (course.modules as Module[])
                    : [];

                  const totalModules = modulesArray.length;
                  const totalLessons = modulesArray.reduce(
                    (acc, m) =>
                      acc +
                      (Array.isArray(m.lessons) ? m.lessons.length : 0),
                    0,
                  );
                  const totalXP = modulesArray.reduce((acc, m) => {
                    if (!Array.isArray(m.lessons)) return acc;
                    return (
                      acc +
                      m.lessons.reduce(
                        (accL, l) => accL + (l.xp_reward || 0),
                        0,
                      )
                    );
                  }, 0);

                  const xpRequired = course.xp_threshold ?? 0;
                  const isLocked = userXP < xpRequired;

                  return (
                    <Card
                      key={course.id}
                      className="flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {course.image_url && (
                        <div className="w-full h-40 bg-gray-200 overflow-hidden">
                          <img
                            src={course.image_url}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle className="text-lg line-clamp-2">
                              {title}
                            </CardTitle>
                            {description && (
                              <CardDescription className="mt-1 line-clamp-3">
                                {description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getLevelBadge(course.level)}
                            {xpRequired > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {xpRequired} XP min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalModules}{' '}
                              {t('courses.modules') || 'modules'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalLessons}{' '}
                              {t('courses.lessons') || 'lessons'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span>
                              {totalXP}{' '}
                              {t('courses.totalXP') || 'XP total'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {isLocked ? (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                              <Lock className="h-3 w-3" />
                              <span>
                                {t('courses.unlockAt') || 'Unlock at'}{' '}
                                <strong>{xpRequired} XP</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>
                                {t('courses.unlocked') ||
                                  'You can access this course'}
                              </span>
                            </div>
                          )}

                          <Link href={`/education/courses/${course.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={isLocked && !user}
                            >
                              <span className="text-xs">
                                {t('courses.viewDetails') ||
                                  'View course'}
                              </span>
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
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
