'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Award, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: any;
  description: any;
  content: any;
  xp_reward: number;
  duration_minutes: number;
  order: number;
  module_id: string;
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
  const { user } = useAuth();
  const { language } = useLanguage();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`/api/lessons/${params.id}`);
        const data = await response.json();

        if (data.success) {
          setLesson(data.lesson);
          setModule(data.module);
          setIsCompleted(data.isCompleted);

          const lessons = data.module.lessons.sort((a: Lesson, b: Lesson) => a.order - b.order);
          const currentIndex = lessons.findIndex((l: Lesson) => l.id === params.id);

          if (currentIndex > 0) {
            setPrevLesson(lessons[currentIndex - 1]);
          }
          if (currentIndex < lessons.length - 1) {
            setNextLesson(lessons[currentIndex + 1]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch lesson:', error);
      }
      setLoading(false);
    };

    fetchLesson();
  }, [params.id, user]);

  const handleComplete = async () => {
    if (!user || isCompleted) return;

    try {
      const response = await fetch(`/api/lessons/${params.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setIsCompleted(true);
      }
    } catch (error) {
      console.error('Failed to complete lesson:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading lesson...</p>
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
              <h3 className="text-xl font-semibold mb-2">Lesson Not Found</h3>
              <p className="text-gray-600 mb-4">This lesson doesn't exist or has been removed.</p>
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

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">{moduleTitle}</Badge>
                  {isCompleted && (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{title}</CardTitle>
                {description && (
                  <p className="text-gray-600 text-lg mt-2">{description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{lesson.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>{lesson.xp_reward} XP reward</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="prose prose-lg max-w-none py-8">
                <ContentTracker
                  contentId={lesson.id}
                  contentType="lesson"
                  xpReward={lesson.xp_reward}
                >
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </ContentTracker>
              </CardContent>
            </Card>

            {!isCompleted && user && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Complete this lesson</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Read through the entire lesson and click complete to earn {lesson.xp_reward} XP
                      </p>
                    </div>
                    <Button
                      onClick={handleComplete}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Mark as Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isCompleted && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Lesson Completed!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    You earned {lesson.xp_reward} XP for completing this lesson
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-4">
              {prevLesson ? (
                <Link href={`/education/lessons/${prevLesson.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous: {getMultilingualContent(prevLesson.title, language)}
                  </Button>
                </Link>
              ) : (
                <div className="flex-1"></div>
              )}

              {nextLesson ? (
                <Link href={`/education/lessons/${nextLesson.id}`} className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Next: {getMultilingualContent(nextLesson.title, language)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/education/courses/${module.course_id}`} className="flex-1">
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
