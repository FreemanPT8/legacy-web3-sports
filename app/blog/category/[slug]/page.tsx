'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Eye, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';

interface Article {
  id: string;
  title: any;
  excerpt: any;
  category: string;
  reading_time: number;
  view_count: number;
  xp_reward: number;
  created_at: string;
  author: {
    username: string;
  };
}

export default function BlogCategoryPage() {
  const params = useParams();
  const { language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchArticles();
  }, [params.slug]);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`/api/blog/category/${params.slug}`);
      const data = await response.json();

      if (data.success) {
        setArticles(data.articles);
        setCategoryName(data.categoryName);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    }
    setLoading(false);
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading articles...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link href="/blog">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Blog
                </Button>
              </Link>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Tag className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl md:text-4xl font-bold">{categoryName}</h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Explore articles about {categoryName.toLowerCase()} and Web3 technology
              </p>
            </div>

            <Card className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{articles.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Articles</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {articles.reduce((acc, a) => acc + a.view_count, 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Views</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {articles.reduce((acc, a) => acc + a.xp_reward, 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total XP Available</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {articles.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Articles Yet</h3>
                  <p className="text-gray-600 dark:text-gray-300">Check back soon for new content in this category!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => {
                  const title = getMultilingualContent(article.title, language);
                  const excerpt = getMultilingualContent(article.excerpt, language);

                  return (
                    <Link key={article.id} href={`/blog/${article.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-blue-600">{article.category}</Badge>
                            <Badge variant="outline">{article.xp_reward} XP</Badge>
                          </div>
                          <CardTitle className="line-clamp-2">{title}</CardTitle>
                          <CardDescription className="line-clamp-3">{excerpt}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{article.reading_time}m</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>{article.view_count}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-gray-500">
                            by {article.author.username} • {getTimeSince(article.created_at)}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
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
