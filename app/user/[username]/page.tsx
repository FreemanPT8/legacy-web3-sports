'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getXpLevelLabel } from '@/lib/education/xpLevels';
import {
  User,
  Award,
  Trophy,
  BookOpen,
  Calendar,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  username: string;
  bio: string;
  sports_role: string;
  dao1_did_nft: string;
  xp_total: number;
  created_at: string;
  streak_count: number;
  stats: {
    lessonsCompleted: number;
    articlesRead: number;
    rank: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    xp: number;
    created_at: string;
  }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [params.username]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/users/${params.username}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    setLoading(false);
  };

  const getLevel = (xp: number) => getXpLevelLabel(xp);

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md bg-card border border-border">
            <CardContent className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">User Not Found</h3>
              <p className="text-muted-foreground mb-4">This user doesn&apos;t exist.</p>
              <Link href="/education/leaderboard">
                <Button>View Leaderboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-[#000c12] py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="mb-6 bg-card border border-border">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-3xl">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                      <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                        {getLevel(profile.xp_total)}
                      </Badge>
                    </div>

                    {profile.sports_role && (
                      <p className="text-muted-foreground mb-3">{profile.sports_role}</p>
                    )}

                    {profile.bio && (
                      <p className="text-muted-foreground mb-4 max-w-2xl">{profile.bio}</p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                      {profile.streak_count > 0 && (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-500" />
                          <span>{profile.streak_count} day streak</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {profile.xp_total.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total XP</div>
                    {profile.stats.rank > 0 && (
                      <Badge variant="outline" className="mt-2">
                        <Trophy className="h-3 w-3 mr-1" />
                        Rank #{profile.stats.rank}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Lessons Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{profile.stats.lessonsCompleted}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Articles Read
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">{profile.stats.articlesRead}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">{profile.streak_count}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="activity" className="space-y-4">
              <TabsList>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <Card className="bg-card border border-border">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {profile.recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Award className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium text-white">{activity.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {getTimeSince(activity.created_at)}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-primary text-primary-foreground">+{activity.xp} XP</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Learning Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Lessons Completed</span>
                        <span className="font-bold text-primary">
                          {profile.stats.lessonsCompleted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Articles Read</span>
                        <span className="font-bold text-primary">
                          {profile.stats.articlesRead}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Current Level</span>
                        <span className="font-bold text-primary">
                          {getLevel(profile.xp_total)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Engagement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Active Streak</span>
                        <span className="font-bold text-primary">
                          {profile.streak_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Leaderboard Rank</span>
                        <span className="font-bold text-primary">
                          #{profile.stats.rank}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
