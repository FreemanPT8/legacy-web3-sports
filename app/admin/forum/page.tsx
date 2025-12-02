'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function ForumManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (
      !loading &&
      user &&
      user.role !== 'Super Admin' &&
      user.role !== 'Admin'
    ) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/forum/rooms');
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms || []);
        }
      } catch (error) {
        console.error('Failed to fetch forum rooms:', error);
      }
      setLoadingData(false);
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchRooms();
    }
  }, [user]);

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const totalRooms = rooms.length;
  const totalTopics = rooms.reduce(
    (acc, room) => acc + (room.topics?.length || 0),
    0,
  );
  const totalMembers = rooms.reduce(
    (acc, room) => acc + (room.members_count || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold">
                Forum Moderation
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor and moderate forum discussions
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalRooms}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTopics}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Members (sum)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {totalMembers}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forum Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No forum rooms yet</p>
                  <p className="text-sm text-gray-500">
                    Forum rooms are created automatically based on Houses of Sports
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{room.name}</h3>
                            {room.xp_threshold > 0 && (
                              <Badge variant="secondary">
                                {room.xp_threshold} XP required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {room.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {room.topics?.length || 0} topics
                            </span>
                            <span>{room.members_count || 0} members</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/forum/${room.id}`)}
                          >
                            View Room
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Moderation Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Content Moderation</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Review and moderate user-generated content in forum discussions
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    View Flagged Content
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">Coming Soon</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">User Reports</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Handle user reports and community feedback
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    View Reports
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">Coming Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
