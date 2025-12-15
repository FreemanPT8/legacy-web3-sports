'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  ArrowLeft,
  Lock,
  Pin,
  ThumbsUp,
  Send,
} from 'lucide-react';
import Link from 'next/link';

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes: number;
  author: {
    id: string;
    username: string;
    xp_total: number;
  };
}

interface Topic {
  id: string;
  title: string;
  content: string;
  created_at: string;
  pinned: boolean;
  locked: boolean;
  view_count: number;
  room_id: string;
  author: {
    id: string;
    username: string;
    xp_total: number;
  };
  room: {
    name: string;
    xp_required_post: number;
  };
  posts: Post[];
}

export default function ForumTopicPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.topicId]);

  const fetchTopic = async () => {
    try {
      const response = await fetch(`/api/forum/topics/${params.topicId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTopic(data.topic);
      }
    } catch (error) {
      console.error('Failed to fetch topic:', error);
    }
    setLoading(false);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/forum/topics/${params.topicId}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ content: replyContent }),
        },
      );

      if (response.ok) {
        setReplyContent('');
        fetchTopic();
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
    setSubmitting(false);
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!user) {
    return null;
  }

  const userXP = user?.xp_total || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-body">{t('forum.loadingTopic')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md bg-card border-custom">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-custom mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-heading">
                {t('forum.topicNotFound')}
              </h3>
              <p className="text-body mb-4">
                {t('forum.topicNotFoundDesc')}
              </p>
              <Link href="/forum">
                <Button>{t('forum.backToForum')}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const canReply = userXP >= topic.room.xp_required_post && !topic.locked;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href={`/forum/${topic.room_id}`}>
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('forum.backToRoom')} {topic.room.name}
                </Button>
              </Link>
            </div>

            {/* Tópico principal */}
            <Card className="mb-6 bg-card border-custom">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {topic.pinned && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Pin className="h-3 w-3 mr-1" />
                      {t('forum.pinned')}
                    </Badge>
                  )}
                  {topic.locked && (
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      {t('forum.locked')}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {topic.view_count} {t('forum.views')}
                  </Badge>
                </div>

                <h1 className="text-3xl font-bold mb-6 text-heading">
                  {topic.title}
                </h1>

                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-custom">
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback>
                      {topic.author.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-heading">
                        {topic.author.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {topic.author.xp_total} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-custom mb-4">
                      {getTimeSince(topic.created_at)}
                    </p>
                    <div className="prose max-w-none">
                      <p className="text-body whitespace-pre-wrap">
                        {topic.content}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-body">
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    {topic.posts.length} {t('forum.replies')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Replies */}
            <div className="space-y-4 mb-6">
              {topic.posts.length > 0 ? (
                topic.posts.map(post => (
                  <Card key={post.id} className="bg-card border-custom">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="flex-shrink-0">
                          <AvatarFallback>
                            {post.author.username
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-heading">
                              {post.author.username}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {post.author.xp_total} XP
                            </Badge>
                            <span className="text-sm text-muted-custom">
                              {getTimeSince(post.created_at)}
                            </span>
                          </div>
                          <p className="text-body whitespace-pre-wrap mb-3">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              {post.likes}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-card border-custom">
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-custom mx-auto mb-3" />
                    <p className="text-body">{t('forum.noReplies')}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Caixa de resposta / avisos */}
            {canReply ? (
              <Card className="bg-card border-custom">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 text-heading">
                    {t('forum.postReply')}
                  </h3>
                  <form onSubmit={handleSubmitReply}>
                    <Textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder={t('forum.writeReply')}
                      className="min-h-32 mb-4"
                      disabled={submitting}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-body">{t('forum.earnXp')}</p>
                      <Button
                        type="submit"
                        disabled={!replyContent.trim() || submitting}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting
                          ? t('forum.posting')
                          : t('forum.reply')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : topic.locked ? (
              <Card className="border-2 border-border bg-card">
                <CardContent className="text-center py-8">
                  <Lock className="h-12 w-12 text-muted-custom mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 text-heading">
                    {t('forum.topicLocked')}
                  </h3>
                  <p className="text-body">
                    {t('forum.topicLockedDesc')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-yellow-500 bg-yellow-500/10">
                <CardContent className="text-center py-8">
                  <Lock className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 text-heading">
                    {t('forum.insufficientXp')}
                  </h3>
                  <p className="text-body mb-4">
                    {t('forum.needXpToPost')}{' '}
                    <strong>{topic.room.xp_required_post} XP</strong>{' '}
                    {t('forum.toPostInForum')}
                  </p>
                  <p className="text-body mb-6">
                    {t('forum.currentXp')}{' '}
                    <strong>{userXP} XP</strong> | {t('forum.needMore')}{' '}
                    <strong>
                      {topic.room.xp_required_post - userXP}{' '}
                      {t('forum.moreXp')}
                    </strong>
                  </p>
                  <Link href="/education/xp">
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      {t('forum.learnHowToEarnXp')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
