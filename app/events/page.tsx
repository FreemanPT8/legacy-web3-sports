'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Bell,
} from 'lucide-react';

interface LegacyEvent {
  id: string;
  title: any;
  description: any;
  category: 'webinar' | 'workshop' | 'meetup' | 'competition' | string;
  date: string;
  is_online: boolean;
  location?: string | null;
  current_attendees?: number | null;
  max_attendees?: number | null;
  image_url?: string | null;
  registration_url?: string | null;
}

export default function EventsPage() {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<string>('all');
  const [events, setEvents] = useState<LegacyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        if (data?.success) {
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents =
    filter === 'all'
      ? events
      : events.filter((e) => e.category === filter);

  const upcomingEvents = filteredEvents.filter(
    (e) => new Date(e.date) > new Date()
  );

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'webinar':
        return 'bg-blue-100 text-blue-800';
      case 'workshop':
        return 'bg-purple-100 text-purple-800';
      case 'meetup':
        return 'bg-green-100 text-green-800';
      case 'competition':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalAttendees = events.reduce(
    (acc, e) => acc + (e.current_attendees || 0),
    0
  );

  const totalOnline = events.filter((e) => e.is_online).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* HEADER / INTRO */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {t('events.calendar')}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                {t('events.calendarDesc')}
              </p>
            </div>

            {/* STATS CARDS */}
            {!loading && (
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {events.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('events.totalEvents')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {upcomingEvents.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('events.upcoming')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {totalAttendees}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('events.totalAttendees')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-yellow-50">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {totalOnline}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t('events.onlineEvents')}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TABS + LISTA DE EVENTOS */}
            <Tabs
              defaultValue="all"
              className="space-y-6"
              value={filter}
              onValueChange={setFilter}
            >
              <TabsList>
                <TabsTrigger value="all">
                  {t('events.allEvents')}
                </TabsTrigger>
                <TabsTrigger value="webinar">
                  {t('events.webinars')}
                </TabsTrigger>
                <TabsTrigger value="workshop">
                  {t('events.workshops')}
                </TabsTrigger>
                <TabsTrigger value="meetup">
                  {t('events.meetups')}
                </TabsTrigger>
                <TabsTrigger value="competition">
                  {t('events.competitions')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-6">
                {loading ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        A carregar eventos…
                      </p>
                    </CardContent>
                  </Card>
                ) : filteredEvents.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t('events.noEventsFound')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {t('events.checkBackLater')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredEvents.map((event) => {
                    const title = getMultilingualContent(
                      event.title,
                      language
                    );
                    const description = getMultilingualContent(
                      event.description,
                      language
                    );

                    const emoji =
                      event.image_url ||
                      (event.category === 'webinar'
                        ? '🎥'
                        : event.category === 'workshop'
                        ? '💻'
                        : event.category === 'meetup'
                        ? '🤝'
                        : '🏆');

                    return (
                      <Card
                        key={event.id}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-4 gap-6">
                            <div className="flex items-center justify-center text-6xl">
                              {typeof emoji === 'string' &&
                              emoji.startsWith('http') ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={emoji}
                                  alt={title}
                                  className="max-h-24 rounded-md object-contain"
                                />
                              ) : (
                                <span>{emoji}</span>
                              )}
                            </div>

                            <div className="md:col-span-3 space-y-4">
                              <div>
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <h3 className="text-2xl font-bold">
                                    {title}
                                  </h3>
                                  <Badge
                                    className={getEventTypeColor(
                                      event.category
                                    )}
                                  >
                                    {event.category}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300">
                                  {description}
                                </p>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(event.date)}</span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  {event.is_online ? (
                                    <>
                                      <Video className="h-4 w-4" />
                                      <span>{t('events.online')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="h-4 w-4" />
                                      <span>
                                        {event.location || '-'}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Users className="h-4 w-4" />
                                  <span>
                                    {event.current_attendees ?? 0} /{' '}
                                    {event.max_attendees ?? '-'}{' '}
                                    {t('events.attendees')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                {event.registration_url ? (
                                  <a
                                    href={event.registration_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                      <Bell className="h-4 w-4 mr-2" />
                                      {t('events.register')}
                                    </Button>
                                  </a>
                                ) : (
                                  <Button
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled
                                  >
                                    <Bell className="h-4 w-4 mr-2" />
                                    {t('events.register')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>

            {/* CTA FINAL PARA HOSTS */}
            <Card className="mt-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {t('events.hostEvent')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm md:text-base text-blue-100">
                  {t('events.hostEventDesc')}
                </p>
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  {t('events.submitProposal')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
