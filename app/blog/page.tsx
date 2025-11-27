'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Calendar,
  User,
  Eye,
  Lock,
  CheckCircle,
  Award,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  category?: string | null;
  author?: string | null;
  created_at?: string;
  views?: number | null;
  registered_only?: boolean | null;
  xp_reward?: number | null;
  is_completed?: boolean;
};

export default function BlogIndexPage() {
  const { user, getToken } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('/api/blog', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setPosts([]);
        } else {
          const basePosts = Array.isArray(data.posts) ? data.posts : [];

          // extra: OR com localStorage para garantir "Completed" neste browser
          if (typeof window !== 'undefined' && user) {
            const enriched = basePosts.map((p: any) => {
              const key = `content-completed:blog:${p.id}`;
              const localCompleted =
                window.localStorage.getItem(key) === 'true';
              return {
                ...p,
                is_completed: p.is_completed || localCompleted,
              };
            });
            setPosts(enriched);
          } else {
            setPosts(basePosts);
          }
        }
      } catch (error) {
        console.error('Error loading blog posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [getToken, user]);

  const getTitle = (title: MultiLang | string) => {
    if (typeof title === 'string') return title;
    return title.en || title.pt || title.es || 'Untitled post';
  };

  const getExcerpt = (excerpt: MultiLang | string) => {
    if (typeof excerpt === 'string') return excerpt;
    return (
      excerpt.en ||
      excerpt.pt ||
      excerpt.es ||
      excerpt.fr ||
      excerpt.it ||
      excerpt.de ||
      ''
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  Legacy Blog
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Articles about blockchain, Web3, sports, education and
                  community – plus XP rewards for readers.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {user ? (
                  <span>
                    Logged in as{' '}
                    <span className="font-semibold">
                      {user.username}
                    </span>
                  </span>
                ) : (
                  <>
                    <span>Login to earn XP from articles.</span>
                    <Link href="/login">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Login
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Loading articles...
                  </p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  No blog posts published yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const title = getTitle(post.title);
                  const excerpt = getExcerpt(post.excerpt);
                  const isMembersOnly = !!post.registered_only;
                  const xpReward =
                    typeof post.xp_reward === 'number'
                      ? post.xp_reward
                      : 15;

                  return (
                    <Card
                      key={post.id}
                      className="hover:shadow-md transition"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
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
                            {post.is_completed && (
                              <Badge className="bg-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          {user && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Award className="h-3 w-3" />
                              <span>{xpReward} XP</span>
                            </div>
                          )}
                        </div>

                        <CardTitle className="text-xl">
                          <Link
                            href={`/blog/${post.id}`}
                            className="hover:underline"
                          >
                            {title}
                          </Link>
                        </CardTitle>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author || 'Admin'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {post.created_at
                              ? new Date(
                                  post.created_at,
                                ).toLocaleDateString()
                              : '-'}
                          </span>
                          {typeof post.views === 'number' &&
                            post.views >= 0 && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {post.views}
                              </span>
                            )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 pb-4">
                        {excerpt && (
                          <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 line-clamp-3">
                            {excerpt}
                          </p>
                        )}
                        <Link href={`/blog/${post.id}`}>
                          <Button variant="outline" size="sm">
                            Read article
                          </Button>
                        </Link>
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
