'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Award,
  MessageSquare,
  BookOpen,
  Trophy,
  Check,
  Trash2
} from 'lucide-react';
import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

interface Notification {
  id: string;
  type: 'achievement' | 'comment' | 'course' | 'xp' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true, userId: user.id }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications/${id}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'xp':
        return <Award className="h-5 w-5 text-primary" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-emerald-400" />;
      case 'course':
        return <BookOpen className="h-5 w-5 text-fuchsia-400" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-foreground">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <HeroSection className="mb-6">
              <HeroContent className="items-center">
                <HeroTextColumn className="space-y-2">
                  <HeroEyebrow>Alerts</HeroEyebrow>
                  <HeroTitle className="text-white">Notifications</HeroTitle>
                  <HeroDescription className="text-muted-foreground">
                    {unreadCount > 0
                      ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                      : 'All caught up!'}
                  </HeroDescription>
                </HeroTextColumn>
                {unreadCount > 0 && (
                  <div className="text-right">
                    <Button onClick={markAllAsRead} variant="outline">
                      <Check className="h-4 w-4 mr-2" />
                      Mark all as read
                    </Button>
                  </div>
                )}
              </HeroContent>
            </HeroSection>

            {loading ? (
              <Card className="bg-card border border-border">
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading notifications...</p>
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card className="bg-card border border-border">
                <CardContent className="text-center py-12">
                  <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
                  <p className="text-muted-foreground">You're all caught up! Check back later.</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">
                    All
                    {notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {notifications.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread
                    {unreadCount > 0 && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all bg-card border border-border ${
                        !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.link) {
                          router.push(notification.link);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-heading">
                                {notification.title}
                                {!notification.read && (
                                  <Badge className="ml-2 bg-primary text-primary-foreground text-xs">
                                    New
                                  </Badge>
                                )}
                              </h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {getTimeSince(notification.created_at)}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-sm">{notification.message}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="unread" className="space-y-3">
                  {unreadNotifications.length === 0 ? (
                    <Card className="bg-card border border-border">
                      <CardContent className="text-center py-12">
                        <Check className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">All Caught Up!</h3>
                        <p className="text-muted-foreground">No unread notifications</p>
                      </CardContent>
                    </Card>
                  ) : (
                    unreadNotifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className="cursor-pointer transition-all bg-card border border-border border-l-4 border-l-primary bg-primary/5"
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.link) {
                            router.push(notification.link);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-heading">
                                  {notification.title}
                                  <Badge className="ml-2 bg-primary text-primary-foreground text-xs">
                                    New
                                  </Badge>
                                </h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {getTimeSince(notification.created_at)}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-sm">{notification.message}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
