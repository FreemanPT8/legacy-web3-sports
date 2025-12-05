'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

interface CategoryApiResponse {
  success: boolean;
  articles: Article[];
  categoryName: string;
}

export default function BlogCategoryPage() {
  const params = useParams();
  const { language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`/api/blog/category/${params.slug}`);
      const data: CategoryApiResponse = await response.json();

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
    const diff = new Date().getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'há instantes';
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `há ${Math.floor(seconds / 86400)} dias`;
    return new Date(date).toLocaleDateString('pt-PT');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" />
            <p className="text-body">
              A carregar artigos...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link href="/blog">
                <Button
                  variant="ghost"
                  className="mb-4 text-body hover:text-sky-300 hover:bg-slate-900/60"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Blog
                </Button>
              </Link>
            </div>

            {/* Hero da categoria */}
            <section className="mb-8 rounded-3xl border-custom bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 px-6 py-6 md:px-10 md:py-8 shadow-[0_0_40px_rgba(56,189,248,0.18)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="h-7 w-7 text-sky-400" />
                    <h1 className="text-3xl md:text-4xl font-bold text-heading">
                      {categoryName}
                    </h1>
                  </div>
                  <p className="text-sm md:text-base text-body max-w-2xl">
                    Explora artigos sobre{' '}
                    <span className="font-semibold lowercase text-heading">
                      {categoryName}
                    </span>{' '}
                    e o que a Web3, a Apertum e o ecossistema LEGACY podem
                    significar para esta área do desporto.
                  </p>
                </div>

                <Card className="border-custom bg-card w-full md:w-72">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center text-heading">
                      <div>
                        <div className="text-xl font-bold text-sky-400">
                          {articles.length}
                        </div>
                        <div className="text-[11px] text-muted-custom">
                          Artigos
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-emerald-300">
                          {articles.reduce(
                            (acc, a) => acc + a.view_count,
                            0,
                          )}
                        </div>
                        <div className="text-[11px] text-muted-custom">
                          Visualizações
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-indigo-300">
                          {articles.reduce(
                            (acc, a) => acc + a.xp_reward,
                            0,
                          )}
                        </div>
                        <div className="text-[11px] text-muted-custom">
                          XP disponível
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Lista de artigos */}
            {articles.length === 0 ? (
              <Card className="border-custom bg-card">
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-custom mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-heading">
                    Ainda não há artigos nesta categoria
                  </h3>
                  <p className="text-body text-sm max-w-md mx-auto">
                    Volta mais tarde. Esta categoria vai receber conteúdos assim
                    que houver algo realmente útil para te mostrar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => {
                  const title = getMultilingualContent(
                    article.title,
                    language,
                  );
                  const excerpt = getMultilingualContent(
                    article.excerpt,
                    language,
                  );

                  return (
                    <Link key={article.id} href={`/blog/${article.id}`}>
                      <Card className="h-full bg-card border-custom hover:border-sky-500/70 hover:shadow-[0_0_30px_rgba(56,189,248,0.18)] transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-sky-600 text-white">
                              {article.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-slate-600 text-heading"
                            >
                              {article.xp_reward} XP
                            </Badge>
                          </div>
                          <CardTitle className="line-clamp-2 text-heading">
                            {title}
                          </CardTitle>
                          <CardDescription className="line-clamp-3 text-body">
                            {excerpt}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-xs text-muted-custom">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{article.reading_time} min</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>{article.view_count}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-[11px] text-muted-custom">
                            por @{article.author.username} ·{' '}
                            {getTimeSince(article.created_at)}
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
