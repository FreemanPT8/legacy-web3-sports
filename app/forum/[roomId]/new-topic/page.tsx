'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Lock,
  MessageSquare,
  PlusCircle,
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required_read: number;
  xp_required_post: number;
}

export default function NewTopicPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const [room, setRoom] = useState<Room | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomId = params?.roomId as string | undefined;

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Carregar dados da room
  useEffect(() => {
    if (!user || !roomId) return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/forum/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setRoom(data.room);
        }
      } catch (err) {
        console.error('Failed to fetch room:', err);
      } finally {
        setRoomLoading(false);
      }
    };

    fetchRoom();
  }, [user, roomId]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  const userXP = user?.xp_total || 0;

  const canPost = room ? userXP >= room.xp_required_post : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !canPost || submitting) return;

    if (!title.trim() || !content.trim()) {
      setError('Preenche o título e o conteúdo antes de publicar.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forum/rooms/${room.id}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to create topic:', data.error);
        setError(
          data.error ||
            'Não foi possível criar o tópico. Tenta novamente dentro de alguns minutos.',
        );
        setSubmitting(false);
        return;
      }

      const topicId = data.topic?.id || data.id;
      if (topicId) {
        router.push(`/forum/topic/${topicId}`);
      } else {
        setError('Tópico criado mas sem ID devolvido pela API.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to create topic:', err);
      setError('Erro inesperado. Tenta novamente mais tarde.');
      setSubmitting(false);
    }
  };

  // Estado de loading / room não carregada
  if (roomLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('forum.loadingRoom') || 'Loading forum room...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Room não encontrada
  if (!room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {t('forum.roomNotFound') || 'Room Not Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('forum.roomNotFoundDesc') ||
                  'This forum room does not exist or is not available.'}
              </p>
              <Link href="/forum">
                <Button>{t('forum.backToForum') || 'Back to Forum'}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Falta de XP para criar tópico
  if (!canPost) {
    const needed = room.xp_required_post - userXP;

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-yellow-500 bg-yellow-50">
                <CardContent className="text-center py-12">
                  <Lock className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">
                    {t('forum.insufficientXp') || 'Insufficient XP'}
                  </h3>
                  <p className="text-gray-700 mb-4">
                    {t('forum.needXpToPost')}{' '}
                    <strong>{room.xp_required_post} XP</strong>{' '}
                    {t('forum.toPostInForum')}
                  </p>
                  <p className="text-gray-700 mb-6">
                    {t('forum.currentXp')}{' '}
                    <strong>{userXP} XP</strong> | {t('forum.needMore')}{' '}
                    <strong>
                      {needed} {t('forum.moreXp')}
                    </strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/education/xp">
                      <Button className="bg-yellow-600 hover:bg-yellow-700">
                        {t('forum.learnHowToEarnXp')}
                      </Button>
                    </Link>
                    <Link href={`/forum/${room.id}`}>
                      <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('forum.backToRoom')}{' '}
                        {room.name}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Vista normal: formulário de novo tópico
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <Link href={`/forum/${room.id}`}>
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('forum.backToRoom') || 'Back to room'} {room.name}
                </Button>
              </Link>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{room.icon}</div>
                    <div>
                      <CardTitle className="text-2xl">
                        {t('forum.newTopicIn') || 'New Topic in'} {room.name}
                      </CardTitle>
                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        {room.description}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600">
                    {room.xp_required_post} XP
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                    >
                      {t('forum.topicTitle') || 'Topic title'}
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder={
                        t('forum.topicTitlePlaceholder') ||
                        'Escreve um título claro e direto'
                      }
                      maxLength={160}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('forum.topicTitleHelp') ||
                        'Pensa no título como um resumo em 1 frase do que queres discutir.'}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="content"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
                    >
                      {t('forum.topicContent') || 'Content'}
                    </label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[220px]"
                      placeholder={
                        t('forum.topicContentPlaceholder') ||
                        'Explica o contexto, o que já tentaste e o que gostavas de aprender com esta discussão.'
                      }
                      disabled={submitting}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('forum.topicContentHelp') ||
                        'Tópicos com contexto, detalhe e respeito tendem a gerar melhores respostas e mais XP.'}
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500">
                      {t('forum.topicEarnXp') ||
                        'Criar um tópico relevante pode atribuir-te XP adicional.'}
                    </p>
                    <Button
                      type="submit"
                      disabled={submitting || !title.trim() || !content.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {submitting
                        ? t('forum.posting') || 'Publishing...'
                        : t('forum.createTopic') || 'Create Topic'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
