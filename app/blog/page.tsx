'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Heart, Calendar, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function BlogPage() {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();
        if (data.success) {
          setPosts(data.posts);
        }
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const title = getMultilingualContent(post.title, language).toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = posts.find(p => p.published) || posts[0];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('blog.title')}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('blog.subtitle')}
              </p>
            </div>

            {featuredPost && (
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Link href={`/blog/${featuredPost.id}`} className="md:col-span-2">
                  <Card className="h-full bg-gradient-to-br from-blue-600 to-cyan-600 text-white hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Badge className="bg-white text-blue-600 w-fit mb-2">{t('blog.featured')}</Badge>
                      <CardTitle className="text-2xl">{getMultilingualContent(featuredPost.title, language)}</CardTitle>
                      <CardDescription className="text-blue-100">
                        {getMultilingualContent(featuredPost.content, language).substring(0, 150).replace(/<[^>]*>/g, '')}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-blue-100">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{featuredPost.views || 0} {t('blog.views')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          <span>{featuredPost.likes || 0} {t('blog.likes')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(featuredPost.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('blog.totalArticles')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-blue-600">{posts.length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{t('blog.publishedArticles')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('blog.categories')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{t('blog.categoriesDesc')}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('blog.search')}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder={t('blog.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('blog.allCategories')}</SelectItem>
                  <SelectItem value="blockchain">Blockchain</SelectItem>
                  <SelectItem value="web3">Web3</SelectItem>
                  <SelectItem value="apertum">Apertum Network</SelectItem>
                  <SelectItem value="sports">Sports Technology</SelectItem>
                  <SelectItem value="nft">NFTs</SelectItem>
                  <SelectItem value="defi">DeFi</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">{t('blog.loadingArticles')}</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('blog.noArticles')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('blog.noArticlesDesc')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {filteredPosts.map((post) => {
                  const title = getMultilingualContent(post.title, language);
                  const content = getMultilingualContent(post.content, language);
                  const excerpt = content.substring(0, 120).replace(/<[^>]*>/g, '');

                  return (
                    <Link key={post.id} href={`/blog/${post.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="h-40 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg mb-4 flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-blue-400" />
                          </div>
                          <Badge variant="outline" className="w-fit mb-2">{post.category}</Badge>
                          <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {excerpt}...
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{post.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              <span>{post.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <p className="text-blue-600 hover:underline text-sm font-medium">Read article →</p>
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
