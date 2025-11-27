'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Award,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: any;
  description: any;
  content: any;
  xp_reward: number;
  estimated_time?: number;
  order: number;
  module_id: string;
  author_id?: string | null;
}

interface Module {
  id: string;
  title: any;
  course_id: string;
  lessons: Lesson[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language } = useLanguage();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const token = getToken();
        const response = await fetch(`/api/lessons/${params.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json();

        if (data.success) {
          const lessonData: Lesson = data.lesson;
          setLesson(lessonData);
          setModule(data.module);

          const creatorFlag =
            !!user && !!lessonData.author_id && lessonData.author_id === user.id;
          setIsCreator(creatorFlag);

          const completedFlag = !!data.isCompleted && !creatorFlag;
          setIsCompleted(completedFlag);

          if (data.module?.lessons && Array.isArray(data.module.lessons)) {
            const lessons: Lesson[] = data.module.lessons
              .slice()
              .sort(
                (a: Lesson, b: Lesson) => (a.order || 0) - (b.order || 0),
              );

            const currentIndex = lessons.findIndex(
              (l: Lesson) => l.id === params.id,
            );

            if (currentIndex > 0) {
              setPrevLesson(lessons[currentIndex - 1]);
            }
            if (currentIndex < lessons.length - 1) {
              setNextLesson(lessons[currentIndex + 1]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch lesson:', error);
      }
      setLoading(false);
    };

    fetchLesson();
  }, [params.id, user, getToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              Loading lesson...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!lesson || !module) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Lesson Not Found
              </h3>
              <p className="text-gray-600 mb-4">
                This lesson doesn&apos;t exist or has been removed.
              </p>
              <Link href="/education/courses">
                <Button>Back to Courses</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const title = getMultilingualContent(lesson.title, language);
  const description = getMultilingualContent(lesson.description, language);
  const content = getMultilingualContent(lesson.content, language);
  const moduleTitle = getMultilingualContent(module.title, language);

  const durationMinutes = lesson.estimated_time ?? 10;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href={`/education/courses/${module.course_id}`}>
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Course
                </Button>
              </Link>
            </div>

            {/* Header da lição */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">{moduleTitle}</Badge>
                  {isCreator ? (
                    <Badge className="bg-purple-600 text-white">
                      Creator
                    </Badge>
                  ) : (
                    isCompleted && (
                      <Badge className="bg-green-600 text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    )
                  )}
                </div>
                <CardTitle className="text-3xl">{title}</CardTitle>
                {description && (
                  <p className="text-gray-600 text-lg mt-2">
                    {description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{durationMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>{lesson.xp_reward} XP reward</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Banner para criador */}
            {isCreator && (
              <Card className="mb-4 bg-purple-50 border-purple-200">
                <CardContent className="py-4 text-sm text-purple-900">
                  <p>
                    <strong>You created this lesson.</strong> You don&apos;t
                    earn XP by reading your own content. Every time another
                    member completes this lesson, you automatically receive{' '}
                    <strong>19% of the XP</strong> they earn.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Conteúdo */}
            <Card className="mb-6">
              <CardContent className="prose prose-lg max-w-none py-8">
                {isCreator ? (
                  // Criador: vê o conteúdo livremente, sem ContentTracker / XP
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                  // Utilizador normal: ContentTracker controla XP e completion
                  <ContentTracker
                    userId={user?.id ?? null}
                    contentId={lesson.id}
                    contentType="lesson"
                    xpReward={lesson.xp_reward}
                    estimatedMinutes={durationMinutes}
                    initialCompleted={isCompleted}
                    onComplete={() => setIsCompleted(true)}
                  >
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  </ContentTracker>
                )}
              </CardContent>
            </Card>

            {/* Mensagem de conclusão (apenas para não-criadores) */}
            {!isCreator && isCompleted && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">
                    Lesson Completed!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    You earned {lesson.xp_reward} XP for completing this
                    lesson (only the first time you read it).
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Navegação Prev / Next */}
            <div className="flex justify-between gap-4">
              {prevLesson ? (
                <Link
                  href={`/education/lessons/${prevLesson.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous:{' '}
                    {getMultilingualContent(
                      prevLesson.title,
                      language,
                    )}
                  </Button>
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {nextLesson ? (
                <Link
                  href={`/education/lessons/${nextLesson.id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Next:{' '}
                    {getMultilingualContent(nextLesson.title, language)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link
                  href={`/education/courses/${module.course_id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Back to Course
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
