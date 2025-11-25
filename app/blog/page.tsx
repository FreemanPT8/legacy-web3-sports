'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Lock, Eye } from 'lucide-react';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  category?: string | null;
  author?: string | null;
  created_at?: string;
  views?: number;
  registered_only?: boolean | null;
};

export default function PublicBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/blog?limit=50');
        const data = await res.json();

        if (data.success) {
          setPosts(data.posts || []);
        } else {
          console.error('Error loading public blog posts:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch public blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const getTitle = (title: MultiLang | string) => {
    if (typeof title === 'string') return title;
    return title.en || title.pt || title.es || 'Untitled post';
  };

  const getExcerpt = (excerpt: MultiLang | string) => {
    if (typeof excerpt === 'string') return excerpt;
    return excerpt.en || excerpt.pt || excerpt.es || '';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Blog
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Articles about blockchain, Web3, sports and education.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Loading posts...
                  </p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">
                    No posts published yet
                  </h3>
                  <p className="text-gray-600">
                    Check back soon for new content.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.id}`}>
                    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {post.category || 'General'}
                          </Badge>
                          {post.registered_only && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Lock className="h-3 w-3" />
                              Members only
                            </span>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2">
                          {getTitle(post.title)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {getExcerpt(post.excerpt) || 'No summary available.'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
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
                          </div>
                          {post.views && post.views > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {post.views}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
