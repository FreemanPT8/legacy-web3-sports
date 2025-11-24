'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Lock,
  CheckCircle,
  Clock,
} from 'lucide-react';

type Lesson = {
  id: string;
  title: any;
  content?: any;
  xp_reward?: number;
  xp_threshold?: number;
  order?: number;
  estimated_time?: number;
  is_completed?: boolean;
};

type Module = {
  id: string;
  title: any;
  description?: any;
  xp_threshold?: number;
  order?: number;
  lessons?: Lesson[];
};

type Course = {
  id: string;
  title: any;
  description: any;
  level?: string | null;
  xp_threshold?: number;
  image_url?: string | null;
  modules?: Module[];
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const userXP = user?.xp_total || 0;
  const courseId = params.id as string;

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const token = getToken();
        const res = await fetch(`/api/courses/${courseId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setCourse(null);
        } else {
          setCourse(data.course);
        }
      } catch (error) {
        console.error('Failed to fetch course:', error);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, getToken]);

  const getLevelBadge = (level?: string | null) => {
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

  const modulesArray: Module[] = useMemo(() => {
    if (!course || !Array.isArray(course.modules)) return [];
    return [...course.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course]);

  const allLessons: Lesson[] = useMemo(
    () =>
      modulesArray.flatMap((mod) =>
        Array.isArray(mod.lessons) ? mod.lessons : [],
      ),
    [modulesArray],
  );

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.is_completed).length;
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const totalXP = allLessons.reduce(
    (sum, l) => sum + (typeof l.xp_reward === 'number' ? l.xp_reward : 0),
    0,
  );

  const courseXpRequired =
    typeof course?.xp_threshold === 'number' ? course.xp_threshold! : 0;
  const courseLocked = userXP < courseXpRequired;

  const handleLessonClick = (lesson: Lesson, requiredXP: number) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (userXP < requiredXP) {
      return;
    }

    router.push(`/education/lessons/${lesson.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('courses.loading')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {t('courses.courseNotFound') || 'Course not found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('courses.courseNotFoundDesc') ||
                  "This course doesn't exist or has been removed."}
              </p>
              <Link href="/education/courses">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {t('courses.backToCourses') || 'Back to Courses'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const courseTitle = getMultilingualContent(course.title, language);
  const courseDescription = getMultilingualContent(course.description, language);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Link href="/education/courses">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('courses.backToCourses') || 'Back to Courses'}
                </Button>
              </Link>
            </div>

            {/* HEADER DO CURSO */}
            <Card className="mb-6">
              {course.image_url && (
                <div className="w-full h-56 bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={course.image_url}
                    alt={courseTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-3xl mb-2">
                      {courseTitle}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {courseDescription}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getLevelBadge(course.level)}
                    <Badge variant="outline">
                      {courseXpRequired} XP{' '}
                      {t('courses.required') || 'required'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">
                        {t('courses.modules') || 'Modules'}
                      </div>
                      <div className="font-semibold">
                        {modulesArray.length}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">
                        {t('courses.lessons') || 'Lessons'}
                      </div>
                      <div className="font-semibold">{totalLessons}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">
                        {t('courses.xpAvailable') || 'XP available'}
                      </div>
                      <div className="font-semibold">{totalXP} XP</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div className="w-full">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>{t('courses.progress') || 'Progress'}</span>
                        <span>
                          {completedLessons}/{totalLessons}
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </div>
                </div>

                {courseLocked && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span>
                      {t('courses.unlockAt') || 'Unlock at'}{' '}
                      <strong>{courseXpRequired} XP</strong>.{' '}
                      {t('courses.yourXP') || 'Your XP'}:{' '}
                      <strong>{userXP}</strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* INFO LOGIN */}
            {!user && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="py-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      {t('courses.loginRequiredTitle') ||
                        'Sign in to start learning'}
                    </h3>
                    <p className="text-sm text-blue-800">
                      {t('courses.loginRequiredDesc') ||
                        'Create a free account or sign in to unlock lessons and earn XP.'}
                    </p>
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push('/login')}
                  >
                    {t('auth.login') || 'Login'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* MÓDULOS E LIÇÕES */}
            {modulesArray.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  {t('courses.noModules') ||
                    'This course has no modules yet.'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {modulesArray.map((module, moduleIndex) => {
                  const moduleTitle = getMultilingualContent(
                    module.title,
                    language,
                  );
                  const moduleDescription = module.description
                    ? getMultilingualContent(module.description, language)
                    : '';

                  const moduleXp =
                    typeof module.xp_threshold === 'number'
                      ? module.xp_threshold
                      : 0;
                  const moduleRequiredXP = Math.max(
                    courseXpRequired,
                    moduleXp,
                  );

                  const moduleLessons = Array.isArray(module.lessons)
                    ? [...module.lessons].sort(
                        (a, b) => (a.order || 0) - (b.order || 0),
                      )
                    : [];

                  return (
                    <Card key={module.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <CardTitle className="text-xl">
                              {moduleIndex + 1}. {moduleTitle}
                            </CardTitle>
                            {moduleDescription && (
                              <CardDescription className="mt-1">
                                {moduleDescription}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {moduleRequiredXP > 0 && (
                              <Badge variant="outline">
                                {moduleRequiredXP} XP min
                              </Badge>
                            )}
                            {userXP < moduleRequiredXP ? (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                {t('courses.locked') || 'Locked'}
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {t('courses.availableNow') || 'Available'}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {moduleLessons.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            {t('courses.noLessons') ||
                              'No lessons in this module yet.'}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {moduleLessons.map((lesson, lessonIndex) => {
                              const lessonTitle = getMultilingualContent(
                                lesson.title,
                                language,
                              );

                              const lessonXp =
                                typeof lesson.xp_threshold === 'number'
                                  ? lesson.xp_threshold
                                  : 0;
                              const requiredXP = Math.max(
                                courseXpRequired,
                                moduleXp,
                                lessonXp,
                              );

                              const isLocked =
                                !user || userXP < requiredXP;
                              const isCompleted = !!lesson.is_completed;

                              const duration =
                                typeof lesson.estimated_time === 'number'
                                  ? lesson.estimated_time
                                  : 10;
                              const reward =
                                typeof lesson.xp_reward === 'number'
                                  ? lesson.xp_reward
                                  : 20;

                              return (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() =>
                                    handleLessonClick(lesson, requiredXP)
                                  }
                                  disabled={isLocked}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition ${
                                    isLocked
                                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : 'bg-white hover:bg-blue-50 border-gray-200 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                        isCompleted
                                          ? 'bg-green-600 text-white'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        lesson.order ||
                                        lessonIndex + 1
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">
                                        {lessonTitle}
                                      </div>
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {duration} min
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Award className="h-3 w-3" />
                                          {reward} XP
                                        </span>
                                        {requiredXP > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            {requiredXP} XP min
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isCompleted && (
                                      <Badge className="bg-green-600">
                                        {t('courses.completed') ||
                                          'Completed'}
                                      </Badge>
                                    )}
                                    {isLocked && !isCompleted && (
                                      <Badge variant="outline">
                                        {user
                                          ? t('courses.locked') || 'Locked'
                                          : t('courses.loginToUnlock') ||
                                            'Login to unlock'}
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
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
