'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HouseProfilePayload } from '@/lib/houses/profile';
import { HouseMembersList } from './HouseMembersList';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MESSAGE_XP_THRESHOLD } from '@/lib/private-messages';

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

type PrivateMessage = {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  isIncoming: boolean;
  isUnread: boolean;
  sender: { id: string; username: string | null; name: string; avatarUrl: string | null } | null;
  recipient: { id: string; username: string | null; name: string; avatarUrl: string | null } | null;
};

type RecipientOption = {
  id: string;
  label: string;
  role: 'head' | 'moderator';
};

const applyTemplate = (value: string, replacements: Record<string, string>) =>
  Object.entries(replacements).reduce((current, [key, replacement]) => {
    return current.replace(new RegExp(`{${key}}`, 'g'), replacement);
  }, value);

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
  roster: HouseProfilePayload['house']['roster'];
  houseLabel: string;
  welcomeMessage: string | null;
};

export function PrivateArea({
  houseKey,
  recommendedContent,
  culture,
  metrics,
  events,
  roster,
  houseLabel,
  welcomeMessage,
}: Props) {
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
  const { language, t } = useLanguage();
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [privateMessagesError, setPrivateMessagesError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const xpTotal = user?.xp_total ?? 0;
  const hasXpForMessages = xpTotal >= MESSAGE_XP_THRESHOLD;
  const recipientOptions = useMemo<RecipientOption[]>(() => {
    const entries: RecipientOption[] = [];
    if (roster.head) {
      entries.push({ id: roster.head.id, label: roster.head.name, role: 'head' });
    }
    roster.moderators.forEach((moderator) => {
      entries.push({ id: moderator.id, label: moderator.name, role: 'moderator' });
    });
    return entries;
  }, [roster.head, roster.moderators]);

  useEffect(() => {
    if (!selectedRecipient && recipientOptions.length > 0) {
      setSelectedRecipient(recipientOptions[0].id);
    }
  }, [recipientOptions, selectedRecipient]);

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

  const loadPrivateMessages = useCallback(async () => {
    if (!membership?.isMember) {
      setPrivateMessages([]);
      return;
    }
    setPrivateMessagesLoading(true);
    setPrivateMessagesError(null);
    try {
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load private messages.');
      }
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load private messages.');
      }
      setPrivateMessages(data.messages ?? []);
    } catch (error) {
      console.error('[private messages] failed to load', error);
      setPrivateMessagesError(
        language === 'pt'
          ? 'Falha ao carregar mensagens privadas.'
          : language === 'es'
            ? 'Error al cargar los mensajes privados.'
            : 'Failed to load private messages.',
      );
      setPrivateMessages([]);
    } finally {
      setPrivateMessagesLoading(false);
    }
  }, [houseKey, membership?.isMember, language]);

  useEffect(() => {
    void loadPrivateMessages();
  }, [loadPrivateMessages]);

  const formatPrivateMessageDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString(
      language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US',
      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
    );

  const handleSendPrivateMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipient || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedRecipient,
          body: messageDraft.trim(),
          subject: t('houses.private.messageSubject'),
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to send private message.');
      }
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send private message.');
      }
      setMessageDraft('');
      void loadPrivateMessages();
      toast({
        title: language === 'pt' ? 'Mensagem enviada' : language === 'es' ? 'Mensaje enviado' : 'Message sent',
        description:
          language === 'pt'
            ? 'A tua mensagem foi entregue ao Head da House.'
            : language === 'es'
              ? 'Tu mensaje fue entregado al Head de la House.'
              : 'Your message was delivered to the House leadership.',
      });
    } catch (error) {
      console.error('[private messages] send failed', error);
      toast({
        title: language === 'pt' ? 'Falha ao enviar' : language === 'es' ? 'Error al enviar' : 'Failed to send',
        description:
          language === 'pt'
            ? 'Tenta novamente mais tarde.'
            : language === 'es'
              ? 'Intenta de nuevo más tarde.'
              : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const markMessageRead = async (messageId: string) => {
    try {
      await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      void loadPrivateMessages();
    } catch (error) {
      console.error('[private messages] mark read failed', error);
    }
  };

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
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">{t('houses.private.areaLabel')}</p>
              <h2 className="text-2xl font-semibold text-white">{t('houses.private.areaTitle')}</h2>
              <p className="text-sm text-white/70">{t('houses.private.areaDescription')}</p>
            </div>
            {!user ? (
              <Button
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]"
                onClick={() => {
                  window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
                }}
              >
                {t('houses.private.loginCta')}
              </Button>
            ) : null}
          </div>
      </div>

      {loadingMembership ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-[#030d18] text-white/70">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('houses.private.accessChecking')}</span>
          </div>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
        {t('houses.private.loginPrompt')}
        </div>
      ) : !membership?.isMember ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
        {t('houses.private.membershipAccessRequired')}
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-slate-700 bg-[#020b16]/80 p-5 text-sm text-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
              {t('houses.private.welcomeTitle')}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {welcomeMessage || t('houses.private.welcomeFallback')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t('houses.private.welcomeHint')}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
          <Card className="border-white/10 bg-[#03131d]/90">
          <CardHeader>
            <CardTitle className="text-lg text-white">{t('houses.private.section.progress')}</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProgressStat label={t('houses.private.stats.totalParticipants')} value={metrics.memberCount.toLocaleString()} />
                <ProgressStat label={t('houses.private.stats.registeredMembers')} value={metrics.registeredMembers.toLocaleString()} />
                <ProgressStat label={t('houses.private.stats.totalXp')} value={`${metrics.xpTotal.toLocaleString()} XP`} />
                <ProgressStat label={t('houses.private.stats.termsAccepted')} value={metrics.termAcceptances.toLocaleString()} />
                <ProgressStat label={t('houses.private.stats.popupsPublished')} value={metrics.onboarding.published.toLocaleString()} />
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
              <CardTitle className="text-lg text-white">{t('houses.private.section.recommended')}</CardTitle>
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
                <p className="text-sm text-white/70">{t('houses.private.recommended.empty')}</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">{t('houses.private.section.culture')}</CardTitle>
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
                <p className="text-sm text-white/70">{t('houses.private.culture.empty')}</p>
              )}
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                {t('houses.private.culture.note')}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {applyTemplate(t('houses.private.section.network'), { house: houseLabel })}
              </CardTitle>
              <CardDescription className="text-sm text-white/70">
                {applyTemplate(t('houses.private.section.networkDescription'), { house: houseLabel })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HouseMembersList
                roster={roster}
                badgeLabel={houseLabel}
                totalCount={metrics.memberCount}
                variant="private"
              />
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg text-white">{t('houses.private.messagesTitle')}</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                {t('houses.private.messagesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipientOptions.length ? (
                <form className="space-y-4" onSubmit={handleSendPrivateMessage}>
                  <div className="space-y-1">
                    <Label htmlFor="recipient" className="text-xs uppercase tracking-[0.35em] text-slate-400">
                      {t('houses.private.recipientLabel')}
                    </Label>
                    <select
                      id="recipient"
                      value={selectedRecipient ?? ''}
                      onChange={(event) => setSelectedRecipient(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#020b16] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring focus:ring-cyan-400/40"
                    >
                      {recipientOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} ({option.role === 'head' ? t('houses.private.roleHead') : t('houses.private.roleModerator')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="private-message" className="text-xs uppercase tracking-[0.35em] text-slate-400">
                      {t('houses.private.messageLabel')}
                    </Label>
                    <Textarea
                      id="private-message"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder={t('houses.private.messagePlaceholder')}
                      disabled={!hasXpForMessages}
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={!hasXpForMessages || sendingMessage || !recipientOptions.length || !messageDraft.trim()}
                      className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      {sendingMessage ? t('houses.private.sending') : t('houses.private.sendMessage')}
                    </Button>
                    {!hasXpForMessages && (
                      <p className="text-xs text-rose-300">
                        {t('houses.private.unlockNotice').replace('{xp}', MESSAGE_XP_THRESHOLD.toString())}
                      </p>
                    )}
                  </div>
                </form>
              ) : (
                <p className="text-sm text-white/70">{t('houses.private.noRecipients')}</p>
              )}
              <div className="space-y-3">
                {privateMessagesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === 'pt'
                      ? 'A carregar mensagens privadas...'
                      : language === 'es'
                        ? 'Cargando mensajes privados...'
                        : 'Loading private messages...'}
                  </div>
                ) : privateMessagesError ? (
                  <p className="text-sm text-rose-200">{privateMessagesError}</p>
                ) : privateMessages.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('houses.private.emptyState')}</p>
                ) : (
                  privateMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`space-y-2 rounded-2xl border px-4 py-3 transition ${
                        message.isIncoming ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">
                            {message.isIncoming ? t('houses.private.incomingLabel') : t('houses.private.outgoingLabel')}
                          </p>
                          <p className="text-base font-semibold text-white">{message.subject}</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatPrivateMessageDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 line-clamp-4">{message.body}</p>
                      {message.isIncoming && message.isUnread && (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-100">
                          <span className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-[10px]">{t('houses.private.unread')}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-cyan-200 hover:text-cyan-100"
                            onClick={() => markMessageRead(message.id)}
                          >
                            {t('houses.private.markAsRead')}
                          </Button>
                        </div>
                      )}
                    </article>
                  ))
                )}
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
        </>
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
