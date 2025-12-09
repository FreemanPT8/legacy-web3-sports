'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Plus, Edit, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function AdminEventsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/events?showAll=true&userId=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const togglePublished = async (eventId: string, currentStatus: boolean) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          published: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to toggle published:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user || !confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/events/${eventId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    return null;
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      webinar: 'bg-blue-600',
      workshop: 'bg-green-600',
      meetup: 'bg-purple-600',
      competition: 'bg-red-600',
    };
    return <Badge className={colors[category] || 'bg-gray-600'}>{category}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Events Management</h1>
                <p className="text-gray-600 dark:text-gray-300">Create and manage platform events</p>
              </div>
              <Link href="/admin/events/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </Link>
            </div>

            {/* ACTION PANEL */}
            <Card className="mb-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-blue-900/60 shadow-2xl">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-100 border border-blue-500/40">
                    Pulse
                  </Badge>
                  <CardTitle className="text-heading text-lg">
                    Operação de eventos com impacto
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-custom max-w-3xl">
                  Use os eventos planejados para engajar a comunidade e transformar experiências em XP e participação ativa.
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => router.push('/admin/events/create')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Planejar novo evento
                  </Button>
                  <Button
                    className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
                    disabled={events.length === 0}
                    onClick={() => {
                      if (events.length === 0) return;
                      router.push(`/admin/events/${events[0].id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Revisar evento recente
                  </Button>
                  <Button
                    className="flex-1 border border-emerald-500 text-emerald-100 bg-emerald-950/50 hover:bg-emerald-900"
                    onClick={() => router.push('/admin')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Ver impacto comunitário
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
                  <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-blue-100">
                    <p className="font-semibold uppercase tracking-wide text-[11px]">
                      Total
                    </p>
                    <p className="text-sm font-bold mt-1">{events.length} eventos</p>
                    <p className="text-muted-custom text-[11px]">
                      Dados reais do backend; atualizamos ao carregar a lista.
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                    <p className="font-semibold uppercase tracking-wide text-[11px]">
                      Ativos
                    </p>
                    <p className="text-sm font-bold mt-1">
                      {events.filter((event) => event.published).length} publicados
                    </p>
                    <p className="text-muted-custom text-[11px]">
                      Use a publicação para garantir XP aos participantes.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
                    <p className="font-semibold uppercase tracking-wide text-[11px]">
                      Próximos
                    </p>
                    <p className="text-sm font-bold mt-1">
                      {
                        events.filter((event) => {
                          const date = new Date(event.date);
                          return date.getTime() >= Date.now();
                        }).length
                      } agendados
                    </p>
                    <p className="text-muted-custom text-[11px]">
                      Isso mostra o pipeline de experiências no momento.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingEvents ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">Start by creating your first event</p>
                  <Link href="/admin/events/create">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl">
                              {event.title.en || event.title.pt || 'Untitled Event'}
                            </CardTitle>
                            {getCategoryBadge(event.category)}
                            <Badge variant={event.published ? 'default' : 'secondary'}>
                              {event.published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {event.description.en || event.description.pt || ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePublished(event.id, event.published)}
                          >
                            {event.published ? (
                              <><EyeOff className="h-4 w-4 mr-1" /> Unpublish</>
                            ) : (
                              <><Eye className="h-4 w-4 mr-1" /> Publish</>
                            )}
                          </Button>
                          <Link href={`/admin/events/${event.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{event.current_attendees} / {event.max_attendees} attendees</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
