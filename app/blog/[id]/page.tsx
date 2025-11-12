'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getMultilingualContent } from '@/lib/i18n';
import { Eye, Heart, Calendar, User, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BlogArticlePage() {
  const params = useParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/${params.id}`);
        const data = await response.json();

        if (data.success) {
          setPost(data.post);
        }
      } catch (error) {
        console.error('Failed to fetch post:', error);
      }
      setLoading(false);
    };

    fetchPost();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
              <p className="text-gray-600 mb-6">The article you're looking for doesn't exist.</p>
              <Link href="/blog">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Back to Blog
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const title = getMultilingualContent(post.title, language);
  const content = getMultilingualContent(post.content, language);
  const xpReward = Math.floor(Math.random() * 29) + 5;

  const articleContent = (
    <div className="max-w-4xl mx-auto">
      <Link href="/blog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>
      </Link>

      <article className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <div className="mb-6">
          <Badge className="mb-4">{post.category}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>LEGACY Team</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{post.likes || 0} likes</span>
            </div>
          </div>
        </div>

        {user && (
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    {xpReward}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Earn XP by reading</p>
                    <p className="text-sm text-blue-700">Read the full article to earn {xpReward} XP</p>
                  </div>
                </div>
                {xpEarned > 0 && (
                  <Badge className="bg-green-600">Earned!</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Like
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            {user && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Logged in as <span className="font-semibold">{user.username}</span>
              </div>
            )}
          </div>
        </div>
      </article>

      <Card>
        <CardContent className="py-8">
          <h2 className="text-2xl font-bold mb-4">Related Articles</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg mb-3"></div>
                <Badge variant="outline" className="mb-2">{post.category}</Badge>
                <h3 className="font-semibold mb-2">Related Article {i}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Learn more about Web3 and blockchain technology...</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          {user ? (
            <ContentTracker
              contentId={post.id}
              contentType="blog"
              xpReward={xpReward}
              onComplete={(xp) => setXpEarned(xp)}
            >
              {articleContent}
            </ContentTracker>
          ) : (
            articleContent
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
