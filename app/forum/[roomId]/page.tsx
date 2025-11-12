'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Eye,
  TrendingUp,
  Clock,
  ArrowLeft,
  Lock,
  Plus,
  Pin
} from 'lucide-react';
import Link from 'next/link';

interface Topic {
  id: string;
  title: string;
  created_at: string;
  pinned: boolean;
  locked: boolean;
  view_count: number;
  reply_count: number;
  author: {
    id: string;
    username: string;
  };
  last_post: {
    created_at: string;
    author: {
      username: string;
    };
  } | null;
}

interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required_read: number;
  xp_required_post: number;
  topics: Topic[];
}

export default function ForumRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchRoom();
  }, [user, params.roomId]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/forum/rooms/${params.roomId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRoom(data.room);
      }
    } catch (error) {
      console.error('Failed to fetch room:', error);
    }
    setLoading(false);
  };

  if (!user) {
    return null;
  }

  const userXP = user?.xp_total || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading forum room...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Room Not Found</h3>
              <p className="text-gray-600 mb-4">This forum room doesn't exist.</p>
              <Link href="/forum">
                <Button>Back to Forum</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const canRead = userXP >= room.xp_required_read;
  const canPost = userXP >= room.xp_required_post;

  const sortedTopics = [...room.topics].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (sortBy === 'latest') {
      const aDate = a.last_post?.created_at || a.created_at;
      const bDate = b.last_post?.created_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    } else {
      return b.reply_count - a.reply_count;
    }
  });

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!canRead) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-yellow-500 bg-yellow-50">
                <CardContent className="text-center py-12">
                  <Lock className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">Room Locked</h3>
                  <p className="text-gray-600 mb-4">
                    You need <strong>{room.xp_required_read} XP</strong> to access this forum room.
                  </p>
                  <p className="text-gray-600 mb-6">
                    Current XP: <strong>{userXP} XP</strong> | Need: <strong>{room.xp_required_read - userXP} more XP</strong>
                  </p>
                  <Link href="/education/xp">
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      Learn How to Earn XP
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
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
              <Link href="/forum">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Forum
                </Button>
              </Link>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{room.icon}</div>
                    <div>
                      <CardTitle className="text-3xl">{room.name}</CardTitle>
                      <p className="text-gray-600 mt-2">{room.description}</p>
                    </div>
                  </div>
                  {canPost ? (
                    <Link href={`/forum/${room.id}/new-topic`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        New Topic
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      New Topic ({room.xp_required_post} XP)
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{room.topics.length} topics</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{room.topics.reduce((acc, t) => acc + t.view_count, 0)} views</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Topics</h2>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'latest' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('latest')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Latest
                </Button>
                <Button
                  variant={sortBy === 'popular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('popular')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Popular
                </Button>
              </div>
            </div>

            {sortedTopics.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Topics Yet</h3>
                  <p className="text-gray-600 mb-4">Be the first to start a discussion!</p>
                  {canPost && (
                    <Link href={`/forum/${room.id}/new-topic`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Create First Topic
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedTopics.map((topic) => (
                  <Link key={topic.id} href={`/forum/topic/${topic.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="flex-shrink-0">
                            <AvatarFallback>
                              {topic.author.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {topic.pinned && (
                                <Pin className="h-4 w-4 text-blue-600" />
                              )}
                              {topic.locked && (
                                <Lock className="h-4 w-4 text-gray-400" />
                              )}
                              <h3 className="font-semibold text-lg truncate">{topic.title}</h3>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                              <span>by {topic.author.username}</span>
                              <span>•</span>
                              <span>{getTimeSince(topic.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-600 flex-shrink-0">
                            <div className="text-center">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="font-semibold">{topic.reply_count}</span>
                              </div>
                              <div className="text-xs">replies</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span className="font-semibold">{topic.view_count}</span>
                              </div>
                              <div className="text-xs">views</div>
                            </div>
                          </div>
                        </div>

                        {topic.last_post && (
                          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                            Last reply by {topic.last_post.author.username} • {getTimeSince(topic.last_post.created_at)}
                          </div>
                        )}
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
