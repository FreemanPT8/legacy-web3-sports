'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  duration_minutes: number;
  xp_reward: number;
  order: number;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState({
    title: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    description: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    level: 'beginner',
    xp_required: 0,
    published: false,
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const addModule = () => {
    const newModule: Module = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      order: modules.length + 1,
      lessons: [],
    };
    setModules([...modules, newModule]);
  };

  const removeModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const updateModule = (moduleId: string, field: string, value: string) => {
    setModules(modules.map(m =>
      m.id === moduleId ? { ...m, [field]: value } : m
    ));
  };

  const addLesson = (moduleId: string) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        const newLesson: Lesson = {
          id: `temp-${Date.now()}`,
          title: '',
          description: '',
          content: '',
          duration_minutes: 10,
          xp_reward: 20,
          order: m.lessons.length + 1,
        };
        return { ...m, lessons: [...m.lessons, newLesson] };
      }
      return m;
    }));
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
      }
      return m;
    }));
  };

  const updateLesson = (moduleId: string, lessonId: string, field: string, value: any) => {
    setModules(modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: m.lessons.map(l =>
            l.id === lessonId ? { ...l, [field]: value } : l
          ),
        };
      }
      return m;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/courses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ course, modules }),
      });

      if (response.ok) {
        router.push('/admin/courses');
      }
    } catch (error) {
      console.error('Failed to save course:', error);
    }
    setSaving(false);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Português' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'de', name: 'Deutsch' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Link href="/admin/courses">
                  <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Courses
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold">Create New Course</h1>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Course'}
              </Button>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  {languages.map(lang => (
                    <Badge
                      key={lang.code}
                      variant={currentLanguage === lang.code ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setCurrentLanguage(lang.code)}
                    >
                      {lang.name}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Title ({languages.find(l => l.code === currentLanguage)?.name})</Label>
                    <Input
                      value={course.title[currentLanguage as keyof typeof course.title]}
                      onChange={(e) => setCourse({
                        ...course,
                        title: { ...course.title, [currentLanguage]: e.target.value }
                      })}
                      placeholder="Enter course title"
                    />
                  </div>

                  <div>
                    <Label>Description ({languages.find(l => l.code === currentLanguage)?.name})</Label>
                    <Textarea
                      value={course.description[currentLanguage as keyof typeof course.description]}
                      onChange={(e) => setCourse({
                        ...course,
                        description: { ...course.description, [currentLanguage]: e.target.value }
                      })}
                      placeholder="Enter course description"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Level</Label>
                    <Select value={course.level} onValueChange={(value) => setCourse({ ...course, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>XP Required to Unlock</Label>
                    <Input
                      type="number"
                      value={course.xp_required}
                      onChange={(e) => setCourse({ ...course, xp_required: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Modules & Lessons</CardTitle>
                  <Button onClick={addModule} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {modules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No modules yet. Click "Add Module" to get started.
                  </div>
                ) : (
                  modules.map((module, moduleIndex) => (
                    <Card key={module.id} className="border-2">
                      <CardHeader className="bg-gray-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Module {moduleIndex + 1}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => addLesson(module.id)}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Lesson
                            </Button>
                            <Button
                              onClick={() => removeModule(module.id)}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        <div>
                          <Label>Module Title</Label>
                          <Input
                            value={module.title}
                            onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                            placeholder="Enter module title"
                          />
                        </div>

                        <div>
                          <Label>Module Description</Label>
                          <Textarea
                            value={module.description}
                            onChange={(e) => updateModule(module.id, 'description', e.target.value)}
                            placeholder="Enter module description"
                            rows={2}
                          />
                        </div>

                        {module.lessons.length > 0 && (
                          <div className="space-y-3 pt-4 border-t">
                            <h4 className="font-semibold">Lessons</h4>
                            {module.lessons.map((lesson, lessonIndex) => (
                              <Card key={lesson.id} className="bg-blue-50">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">Lesson {lessonIndex + 1}</h5>
                                    <Button
                                      onClick={() => removeLesson(module.id, lesson.id)}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <Input
                                    value={lesson.title}
                                    onChange={(e) => updateLesson(module.id, lesson.id, 'title', e.target.value)}
                                    placeholder="Lesson title"
                                  />

                                  <Textarea
                                    value={lesson.description}
                                    onChange={(e) => updateLesson(module.id, lesson.id, 'description', e.target.value)}
                                    placeholder="Lesson description"
                                    rows={2}
                                  />

                                  <Textarea
                                    value={lesson.content}
                                    onChange={(e) => updateLesson(module.id, lesson.id, 'content', e.target.value)}
                                    placeholder="Lesson content (HTML supported)"
                                    rows={4}
                                  />

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Duration (minutes)</Label>
                                      <Input
                                        type="number"
                                        value={lesson.duration_minutes}
                                        onChange={(e) => updateLesson(module.id, lesson.id, 'duration_minutes', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">XP Reward</Label>
                                      <Input
                                        type="number"
                                        value={lesson.xp_reward}
                                        onChange={(e) => updateLesson(module.id, lesson.id, 'xp_reward', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
