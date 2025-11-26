'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';

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
  Calendar,
  User,
  Eye,
  Lock,
  Award,
  CheckCircle,
} from 'lucide-react';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  content: MultiLang | string;
  category?: string | null;
  author?: string | null;
  created_at?: string;
  views?: number;
  registered_only?: boolean | null;
  xp_reward?: number | null;
};

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  const id = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        // endpoint já incrementa views
        const res = await fetch(`/api/blog/${id}`);
        const data = await res.json();

        if (!res.ok || !data.success || !data.post) {
          setNotFound(true);
          setPost(null);
        } else {
          setPost(data.post);
          setNotFound(false);
        }
      } catch (error) {
        console.error('Error loading public blog post:', error);
        setNotFound(true);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  const getTitle = (title: MultiLang | string) => {
    if (typeof title === 'string') return title;
    return (
      title.en ||
      title.pt ||
      title.es ||
      title.fr ||
      title.it ||
      title.de ||
      'Untitled post'
    );
  };

  const getContent = (content: MultiLang | string) => {
    if (typeof content === 'string') return content;
    return (
      content.en ||
      content.pt ||
      content.es ||
      content.fr ||
      content.it ||
      content.de ||
      ''
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Loading post...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold mb-2">Post not found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The blog post you are looking for does not exist or is not
              published.
            </p>
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const htmlContent = getContent(post.content);
  const title = getTitle(post.title);
  const isMembersOnly = !!post.registered_only;
  const xpReward =
    typeof post.xp_reward === 'number' ? post.xp_reward : 15;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.push('/blog')}
              className="mb-4 inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to blog
            </button>

            {/* Cabeçalho do artigo */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {post.category || 'General'}
                    </Badge>
                    {isMembersOnly && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        Members only
                      </Badge>
                    )}
                    {user && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Award className="h-3 w-3" />
                        {xpReward} XP
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {title}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author || 'Admin'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.created_at
                      ? new Date(post.created_at).toLocaleDateString()
                      : '-'}
                  </span>
                  {typeof post.views === 'number' && post.views >= 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views}
                    </span>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Mensagem de XP ganho (visual apenas) */}
            {earnedXp !== null && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="py-4 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="text-sm text-green-900">
                    You earned <strong>{earnedXp} XP</strong> for reading
                    this article (only counted the first time).
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conteúdo / gating */}
            {isMembersOnly && !user ? (
              <Card className="mb-6">
                <CardContent className="py-8 text-center space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    This article is exclusive to registered members. Create a
                    free account or login to read the full content and earn XP.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/signup">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Create account
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline">Login</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent>
                  <ContentTracker
                    contentId={post.id}
                    contentType="blog"
                    xpReward={xpReward}
                    onComplete={(xp) => {
                      // alguns ContentTracker chamam onComplete() sem arg;
                      if (typeof xp === 'number') {
                        setEarnedXp(xp);
                      } else {
                        setEarnedXp(xpReward);
                      }
                    }}
                  >
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </ContentTracker>
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
