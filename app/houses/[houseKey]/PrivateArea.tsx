'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar } from 'lucide-react';
import type { HouseProfilePayload } from '@/lib/houses/profile';

type RecommendedContent = {
  id: string;
  title: string;
  triggerLabel: string;
  body: string;
};

type MembershipResponse = {
  success: boolean;
  isMember: boolean;
  roles: string[];
};

type HouseMessage = {
  id: string;
  title: string;
  body: string;
  badgeLabel: string | null;
  updatedAt: string | null;
};

type HouseEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  visibility: 'public' | 'members';
  linkUrl: string | null;
};

const EVENT_EMPTY_COPY = {
  pt: 'Sem eventos programados para já. Quando o Head agendar sessões exclusivas, ficam disponíveis aqui.',
  es: 'Sin eventos programados por ahora. Cuando el Head programe sesiones exclusivas aparecerán aquí.',
  en: 'No events scheduled yet. Once the Head posts exclusive sessions they will show up here.',
} as const;

const EVENT_SECTION_TITLES = {
  pt: {
    upcoming: 'Próximos eventos',
    past: 'Eventos anteriores',
  },
  es: {
    upcoming: 'Próximos eventos',
    past: 'Eventos pasados',
  },
  en: {
    upcoming: 'Upcoming events',
    past: 'Past events',
  },
} as const;

const EVENT_VISIBILITY = {
  pt: { open: 'Aberto', reserved: 'Reservado' },
  es: { open: 'Abierto', reserved: 'Reservado' },
  en: { open: 'Open', reserved: 'Members only' },
} as const;

const EVENT_DETAIL_LINK = {
  pt: 'Ver detalhes',
  es: 'Ver detalles',
  en: 'View details',
} as const;

function resolveEventEmptyCopy(locale: string) {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('es')) return EVENT_EMPTY_COPY.es;
  if (normalized.startsWith('en')) return EVENT_EMPTY_COPY.en;
  return EVENT_EMPTY_COPY.pt;
}

function resolveLocaleBucket(locale: string): keyof typeof EVENT_SECTION_TITLES {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  return 'pt';
}

type Props = {
  houseKey: string;
  recommendedContent: RecommendedContent[];
  culture: string[];
  metrics: HouseProfilePayload['house']['metrics'];
  events: HouseEvent[];
};

export function PrivateArea({ houseKey, recommendedContent, culture, metrics, events }: Props) {
  const { user, loading } = useAuth();
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [messages, setMessages] = useState<HouseMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const { toast } = useToast();
  const [houseEvents, setHouseEvents] = useState<HouseEvent[]>(events);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const localeGuess = typeof navigator !== 'undefined' ? navigator.language || 'pt-PT' : 'pt-PT';
  const eventsEmptyCopy = resolveEventEmptyCopy(localeGuess);
  const localeBucket = resolveLocaleBucket(localeGuess);
  const sectionTitles = EVENT_SECTION_TITLES[localeBucket];

  useEffect(() => {
    if (loading || !user) {
      setMembership(null);
      return;
    }
    setLoadingMembership(true);
    fetch(`/api/houses/${houseKey}/membership`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          setMembership(null);
          return;
        }
        const data = (await response.json()) as MembershipResponse;
        setMembership(data);
      })
      .catch((error) => {
        console.error('[house membership] failed', error);
        toast({
          title: 'Falha ao verificar acesso',
          description: 'Tenta novamente mais tarde.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [loading, user, houseKey, toast]);

  useEffect(() => {
    if (!membership?.isMember) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    fetch(`/api/houses/${houseKey}/messages?limit=5`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { success: true; messages: HouseMessage[] }
          | { success: false; error?: string }
          | null;
        if (!response.ok || !payload || !payload.success) {
          const errorMessage =
            !payload || payload.success
              ? 'Falha ao carregar mensagens.'
              : payload.error || 'Falha ao carregar mensagens.';
          throw new Error(errorMessage);
        }
        setMessages(payload.messages ?? []);
      })
      .catch((error) => {
        console.error('[house messages] failed', error);
        setMessagesError('NÇœo foi possÇðvel carregar as mensagens.');
        setMessages([]);
      })
      .finally(() => {
        setMessagesLoading(false);
      });
  }, [houseKey, membership?.isMember]);

  useEffect(() => {
    if (!membership?.isMember) {
      setHouseEvents(events);
      setEventsError(null);
      setEventsLoading(false);
      return;
    }

    let active = true;
    setEventsLoading(true);
    setEventsError(null);
    const eventParams = new URLSearchParams();
    if (localeGuess) {
      eventParams.set('locale', localeGuess);
    }
    const querySuffix = eventParams.toString();
    fetch(`/api/houses/${houseKey}/events${querySuffix ? `?${querySuffix}` : ''}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { success: true; events: HouseEvent[] }
          | { success: false; error?: string }
          | null;
        if (!active) return;
        if (!response.ok || !payload || !payload.success) {
          const errorMessage =
            !payload || payload.success
              ? 'Falha ao carregar eventos.'
              : payload.error || 'Falha ao carregar eventos.';
          throw new Error(errorMessage);
        }
        setHouseEvents(payload.events ?? []);
      })
      .catch((error) => {
        if (!active) return;
        console.error('[house events] failed', error);
        setEventsError(error instanceof Error ? error.message : 'Não foi possível carregar os eventos.');
        setHouseEvents([]);
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [events, houseKey, membership?.isMember]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 md:px-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#030d18] via-[#021523] to-[#031b27] p-6 shadow-[0_35px_90px_rgba(3,10,25,0.45)] md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">Área Privada</p>
            <h2 className="text-2xl font-semibold text-white">Operação da House</h2>
            <p className="text-sm text-white/70">Conteúdos e mensagens reservadas a membros confirmados.</p>
          </div>
          {!user ? (
            <Button
              className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]"
              onClick={() => {
                window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
              }}
            >
              Iniciar sessão
            </Button>
          ) : null}
        </div>
      </div>

      {loadingMembership ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-[#030d18] text-white/70">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>A verificar acesso...</span>
          </div>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
          Inicia sessão para ver a operação interna desta House.
        </div>
      ) : !membership?.isMember ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
          Esta secção é reservada aos membros confirmados da House. Aguarda aprovação ou contacta o Head após completar o onboarding recomendado.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Progresso da House</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProgressStat label="Participantes totais" value={metrics.memberCount.toLocaleString()} />
                <ProgressStat label="Membros registados" value={metrics.registeredMembers.toLocaleString()} />
                <ProgressStat label="XP total" value={`${metrics.xpTotal.toLocaleString()} XP`} />
                <ProgressStat label="Termos aceites" value={metrics.termAcceptances.toLocaleString()} />
                <ProgressStat label="Pop-ups publicados" value={metrics.onboarding.published.toLocaleString()} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs text-white/80">
                <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-200">Distribuição de XP</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <ProgressStat label="Head" value={`${metrics.xpBreakdown.head.toLocaleString()} XP`} />
                  <ProgressStat
                    label="Moderadores"
                    value={`${metrics.xpBreakdown.moderators.toLocaleString()} XP`}
                  />
                  <ProgressStat label="Membros" value={`${metrics.xpBreakdown.members.toLocaleString()} XP`} />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  Head: {metrics.roleCounts.head} · Moderadores: {metrics.roleCounts.moderators} · Membros:{' '}
                  {metrics.roleCounts.members}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
                <p className="font-semibold text-white/90">Próximos passos</p>
                <p>
                  {metrics.onboarding.ready.toLocaleString()} mensagens prontas · {metrics.onboarding.draft.toLocaleString()} em
                  rascunho.
                </p>
                {metrics.onboarding.lastUpdate ? (
                  <p className="mt-2 text-white/60">
                    Última atualização{' '}
                    {new Date(metrics.onboarding.lastUpdate).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Conteúdos recomendados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedContent.length ? (
                recommendedContent.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">{item.triggerLabel}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-white/70">{item.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Ainda não existe uma sequência recomendada para esta House.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Mensagens & Cultura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {culture.length ? (
                <ul className="space-y-3">
                  {culture.map((item, index) => (
                    <li key={index} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">O Head ainda não definiu a cultura interna partilhada.</p>
              )}
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                Novas mensagens oficiais são enviadas via pop-ups e notificações internas. Confirma se tens o onboarding em dia.
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Mensagens oficiais recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>A carregar mensagens...</span>
                </div>
              ) : messagesError ? (
                <p className="text-rose-200">{messagesError}</p>
              ) : messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                      {message.badgeLabel || 'Pop-up oficial'}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{message.title}</p>
                    <p className="mt-2 text-sm text-white/70 line-clamp-3">{message.body}</p>
                    {message.updatedAt ? (
                      <p className="mt-2 text-xs text-white/60">
                        Atualizado{' '}
                        {new Date(message.updatedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-white/70">Sem mensagens recentes. Quando o Head publicar novas instruções elas surgem aqui.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-white">Eventos da House</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>A carregar eventos...</span>
                </div>
              ) : eventsError ? (
                <p className="text-rose-200">{eventsError}</p>
              ) : (
                <EventsSection
                  events={houseEvents}
                  localeBucket={localeBucket}
                  sectionTitles={sectionTitles}
                  emptyCopy={eventsEmptyCopy}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function formatEventDate(startAt: string, endAt?: string | null) {
  const locale = 'pt-PT';
  const start = new Date(startAt);
  const base = start.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!endAt) return base;
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const endPart = end.toLocaleDateString(locale, {
    day: sameDay ? undefined : '2-digit',
    month: sameDay ? undefined : 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `${base} - ${endTime}` : `${base} -> ${endPart}`;
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EventsSection({
  events,
  localeBucket,
  sectionTitles,
  emptyCopy,
}: {
  events: HouseEvent[];
  localeBucket: keyof typeof EVENT_SECTION_TITLES;
  sectionTitles: (typeof EVENT_SECTION_TITLES)[keyof typeof EVENT_SECTION_TITLES];
  emptyCopy: string;
}) {
  if (!events.length) {
    return <p className="text-sm text-white/70">{emptyCopy}</p>;
  }

  const now = Date.now();
  const upcoming = [...events]
    .filter((event) => new Date(event.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const past = [...events]
    .filter((event) => new Date(event.startAt).getTime() < now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const visibilityLabels = EVENT_VISIBILITY[localeBucket];
  const detailLabel = EVENT_DETAIL_LINK[localeBucket];

  const renderEvent = (event: HouseEvent) => (
    <div key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-300">
        <Calendar className="h-4 w-4" />
        {event.visibility === 'members' ? visibilityLabels.reserved : visibilityLabels.open}
      </div>
      <p className="mt-2 text-base font-semibold text-white">{event.title}</p>
      <p className="text-sm text-white/60">{formatEventDate(event.startAt, event.endAt)}</p>
      {event.location ? <p className="text-xs text-white/60">Local: {event.location}</p> : null}
      {event.description ? <p className="mt-2 text-sm text-white/70 line-clamp-3">{event.description}</p> : null}
      {event.linkUrl ? (
        <a
          href={event.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          {detailLabel}
        </a>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {upcoming.length ? (
        <section>
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-white/60">{sectionTitles.upcoming}</p>
          <div className="space-y-4">{upcoming.map(renderEvent)}</div>
        </section>
      ) : null}
      {past.length ? (
        <section>
          <p className="mb-3 mt-4 text-xs uppercase tracking-[0.4em] text-white/60">{sectionTitles.past}</p>
          <div className="space-y-4">{past.map(renderEvent)}</div>
        </section>
      ) : null}
      {!upcoming.length && !past.length ? <p className="text-sm text-white/70">{emptyCopy}</p> : null}
    </div>
  );
}
