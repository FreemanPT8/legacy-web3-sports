'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HouseProfilePayload } from '@/lib/houses/profile';
import { HouseMembersList } from './HouseMembersList';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

type HouseHistoryEntry = {
  type: 'blog' | 'lesson' | 'course' | 'glossary' | 'dm';
  timestamp: string;
  title: string | Record<string, string> | null;
  user: { id: string; username: string | null; full_name: string | null } | null;
  meta?: Record<string, unknown> | null;
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

const HISTORY_COPY = {
  pt: {
    title: 'Histórico da House',
    subtitle: 'Consumo de conteúdos e mensagens privadas dos membros.',
    empty: 'Sem actividade recente.',
    loading: 'A carregar histórico...',
    error: 'Não foi possível carregar o histórico.',
    refresh: 'Atualizar histórico',
    columns: {
      member: 'Membro',
      action: 'Acção',
      content: 'Conteúdo',
      time: 'Data',
    },
    actions: {
      blog: 'Leitura de blog',
      lesson: 'Lição concluída',
      course: 'Curso concluído',
      glossary: 'Glossário lido',
      dm: 'Mensagem privada',
    },
    noTitle: 'Sem título',
  },
  es: {
    title: 'Historial de la House',
    subtitle: 'Consumo de contenidos y mensajes privados de los miembros.',
    empty: 'Sin actividad reciente.',
    loading: 'Cargando historial...',
    error: 'No se pudo cargar el historial.',
    refresh: 'Actualizar historial',
    columns: {
      member: 'Miembro',
      action: 'Acción',
      content: 'Contenido',
      time: 'Fecha',
    },
    actions: {
      blog: 'Lectura de blog',
      lesson: 'Lección completada',
      course: 'Curso completado',
      glossary: 'Glosario leído',
      dm: 'Mensaje privado',
    },
    noTitle: 'Sin título',
  },
  en: {
    title: 'House history',
    subtitle: 'Content consumption and private messages from members.',
    empty: 'No recent activity.',
    loading: 'Loading history...',
    error: 'Failed to load history.',
    refresh: 'Refresh history',
    columns: {
      member: 'Member',
      action: 'Action',
      content: 'Content',
      time: 'Date',
    },
    actions: {
      blog: 'Blog read',
      lesson: 'Lesson completed',
      course: 'Course completed',
      glossary: 'Glossary read',
      dm: 'Private message',
    },
    noTitle: 'Untitled',
  },
} as const;

const HISTORY_STAFF_ROLES = new Set(['head', 'moderator', 'super-admin', 'admin']);

type Props = {
  houseKey: string;
  houseId: string;
  recommendedContent: RecommendedContent[];
  culture: string[];
  metrics: HouseProfilePayload['house']['metrics'];
  roster: HouseProfilePayload['house']['roster'];
  houseLabel: string;
  welcomeMessage: string | null;
  showComposer?: boolean;
};

export function PrivateArea({
  houseKey,
  houseId,
  recommendedContent,
  culture,
  metrics,
  roster,
  houseLabel,
  welcomeMessage,
  showComposer = true,
}: Props) {
  const { user, loading, getToken } = useAuth();
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [messages, setMessages] = useState<HouseMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const historyLanguage = language === 'es' || language === 'en' ? language : 'pt';
  const historyCopy = HISTORY_COPY[historyLanguage];
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [privateMessagesError, setPrivateMessagesError] = useState<string | null>(null);
  const [history, setHistory] = useState<HouseHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [subjectDraft, setSubjectDraft] = useState('');
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

  const isStaff = useMemo(() => {
    const roles = (membership?.roles ?? []).map((role) => role.toLowerCase());
    return roles.some((role) => HISTORY_STAFF_ROLES.has(role));
  }, [membership?.roles]);

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
    const token = getToken();
    fetch(`/api/houses/${houseKey}/membership`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
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
          title: t('houses.private.toastAccessErrorTitle'),
          description: t('houses.private.toastAccessErrorBody'),
          variant: 'destructive',
        });
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [loading, user, houseKey, toast, getToken]);

  useEffect(() => {
    if (!membership?.isMember) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    const token = getToken();
    fetch(`/api/houses/${houseKey}/messages?limit=5`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { success: true; messages: HouseMessage[] }
          | { success: false; error?: string }
          | null;
        if (!response.ok || !payload || !payload.success) {
          const errorMessage =
            !payload || payload.success
              ? t('houses.private.errorOfficialMessagesLoad')
              : payload.error || t('houses.private.errorOfficialMessagesLoad');
          throw new Error(errorMessage);
        }
        setMessages(payload.messages ?? []);
      })
      .catch((error) => {
        console.error('[house messages] failed', error);
        setMessagesError('Nao foi possivel carregar as mensagens.');
        setMessages([]);
      })
      .finally(() => {
        setMessagesLoading(false);
      });
  }, [houseKey, membership?.isMember, getToken]);

  const loadPrivateMessages = useCallback(async () => {
    if (!membership?.isMember) {
      setPrivateMessages([]);
      return;
    }
    setPrivateMessagesLoading(true);
    setPrivateMessagesError(null);
    try {
      const token = getToken();
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load private messages.');
      }
      setPrivateMessages(data.messages ?? []);
    } catch (error) {
      console.error('[private messages] failed to load', error);
      setPrivateMessagesError(t('houses.private.errorPrivateMessagesLoad'));
      setPrivateMessages([]);
    } finally {
      setPrivateMessagesLoading(false);
    }
  }, [houseKey, membership?.isMember, language, getToken]);

  useEffect(() => {
    void loadPrivateMessages();
  }, [loadPrivateMessages]);

  useEffect(() => {
    if (!membership?.isMember) return;
    const interval = setInterval(() => {
      void loadPrivateMessages();
    }, 45000);
    return () => clearInterval(interval);
  }, [membership?.isMember, loadPrivateMessages]);

  useEffect(() => {
    if (!membership?.isMember) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadPrivateMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [membership?.isMember, loadPrivateMessages]);

  const formatPrivateMessageDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString(
      language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US',
      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
    );

  const resolveHistoryTitle = useCallback(
    (value: HouseHistoryEntry['title']) => {
      if (!value) return historyCopy.noTitle;
      if (typeof value === 'string') return value;
      const localized =
        value?.[historyLanguage] ??
        value?.pt ??
        value?.en ??
        value?.es ??
        Object.values(value)[0];
      return localized || historyCopy.noTitle;
    },
    [historyCopy.noTitle, historyLanguage],
  );

  const resolveHistoryAction = useCallback(
    (entry: HouseHistoryEntry) => historyCopy.actions[entry.type] ?? entry.type,
    [historyCopy.actions],
  );

  const formatHistoryDate = useCallback(
    (timestamp: string) =>
      new Date(timestamp).toLocaleString(
        historyLanguage === 'pt' ? 'pt-PT' : historyLanguage === 'es' ? 'es-ES' : 'en-US',
        { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
      ),
    [historyLanguage],
  );

  const loadHistory = useCallback(async () => {
    if (!membership?.isMember || !isStaff) {
      setHistory([]);
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await fetch(`/api/houses/${houseKey}/history?limit=40`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as
        | { success: true; history?: HouseHistoryEntry[] }
        | { success: false; error?: string }
        | null;
      if (!response.ok || !data?.success) {
        const errorMessage =
          data && !data.success ? data.error : 'Failed to load history';
        throw new Error(errorMessage || 'Failed to load history');
      }
      setHistory(data.history ?? []);
    } catch (error) {
      console.error('[house history] failed', error);
      setHistoryError(historyCopy.error);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken, historyCopy.error, houseKey, isStaff, membership?.isMember]);

  useEffect(() => {
    if (!membership?.isMember || !isStaff) return;
    void loadHistory();
  }, [loadHistory, membership?.isMember, isStaff, historyReloadKey]);

  const handleSendPrivateMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipient) {
      toast({
        title: t('houses.private.toastMissingRecipientTitle'),
        description: t('houses.private.errorRecipient'),
        variant: 'destructive',
      });
      return;
    }
    if (!subjectDraft.trim()) {
      toast({
        title: t('houses.private.toastMissingSubjectTitle'),
        description: t('houses.private.errorSubject'),
        variant: 'destructive',
      });
      return;
    }
    if (!messageDraft.trim()) {
      toast({
        title: t('houses.private.toastMissingMessageTitle'),
        description: t('houses.private.errorMessage'),
        variant: 'destructive',
      });
      return;
    }
    if (!hasXpForMessages) {
      toast({
        title: language === 'pt' ? 'XP insuficiente' : language === 'es' ? 'XP insuficiente' : 'Not enough XP',
        description: t('houses.private.unlockNotice').replace('{xp}', MESSAGE_XP_THRESHOLD.toString()),
        variant: 'destructive',
      });
      return;
    }
    setSendingMessage(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientId: selectedRecipient,
          body: messageDraft.trim(),
          subject: subjectDraft.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send private message.');
      }
      setSubjectDraft('');
      setMessageDraft('');
      void loadPrivateMessages();
      toast({
        title: t('houses.private.toastSentTitle'),
        description: t('houses.private.toastSentBody'),
      });
    } catch (error: any) {
      console.error('[private messages] send failed', error);
      const message = error?.message || '';
      toast({
        title: t('houses.private.toastSendFailTitle'),
        description: message || t('houses.private.toastTryLater'),
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const markMessageRead = async (messageId: string) => {
    try {
      const token = getToken();
      await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messageId }),
      });
      window.dispatchEvent(new Event('house:messages:update'));
      void loadPrivateMessages();
    } catch (error) {
      console.error('[private messages] mark read failed', error);
    }
  };

  const handleMessageOpen = (message: PrivateMessage) => {
    if (message.isIncoming && message.isUnread) {
      void markMessageRead(message.id);
    }
  };

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
                <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-200">
                  {t('houses.private.stats.distributionTitle')}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <ProgressStat label={t('houses.private.stats.headXp')} value={`${metrics.xpBreakdown.head.toLocaleString()} XP`} />
                <ProgressStat
                  label={t('houses.private.stats.moderatorsXp')}
                  value={`${metrics.xpBreakdown.moderators.toLocaleString()} XP`}
                />
                <ProgressStat label={t('houses.private.stats.membersXp')} value={`${metrics.xpBreakdown.members.toLocaleString()} XP`} />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
                  {applyTemplate(t('houses.private.stats.distributionCaption'), {
                    head: metrics.roleCounts.head.toString(),
                    moderators: metrics.roleCounts.moderators.toString(),
                    members: metrics.roleCounts.members.toString(),
                  })}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
                <p className="font-semibold text-white/90">
                  {t('houses.private.stats.nextStepsTitle')}
                </p>
                <p>
                  {applyTemplate(t('houses.private.stats.nextStepsDetail'), {
                    ready: metrics.onboarding.ready.toLocaleString(),
                    draft: metrics.onboarding.draft.toLocaleString(),
                  })}
                </p>
                {metrics.onboarding.lastUpdate ? (
                  <p className="mt-2 text-white/60">
                    {t('houses.private.stats.lastUpdateLabel')}{' '}
                    {new Date(metrics.onboarding.lastUpdate).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card
            id="house-private-message-composer"
            className="scroll-mt-28 border-white/10 bg-[#03131d]/90"
          >
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
          {isStaff ? (
            <Card className="border-white/10 bg-[#03131d]/90">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg text-white">{historyCopy.title}</CardTitle>
                  <CardDescription className="text-sm text-slate-300">{historyCopy.subtitle}</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryReloadKey((key) => key + 1)}
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={historyLoading}
                >
                  {historyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {historyCopy.refresh}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/80">
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{historyCopy.loading}</span>
                  </div>
                ) : historyError ? (
                  <p className="text-rose-200">{historyError}</p>
                ) : history.length ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-400 md:grid-cols-[1.2fr_1fr_2fr_1fr]">
                      <span>{historyCopy.columns.member}</span>
                      <span>{historyCopy.columns.action}</span>
                      <span>{historyCopy.columns.content}</span>
                      <span>{historyCopy.columns.time}</span>
                    </div>
                    {history.map((entry, index) => {
                      const memberLabel = entry.user?.full_name || entry.user?.username || '—';
                      return (
                        <div
                          key={`${entry.type}-${entry.user?.id ?? 'unknown'}-${entry.timestamp}-${index}`}
                          className="grid gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-xs md:grid-cols-[1.2fr_1fr_2fr_1fr]"
                        >
                          <span className="text-white">{memberLabel}</span>
                          <span className="text-slate-300">{resolveHistoryAction(entry)}</span>
                          <span className="text-slate-200">{resolveHistoryTitle(entry.title)}</span>
                          <span className="text-slate-400">{formatHistoryDate(entry.timestamp)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{historyCopy.empty}</p>
                )}
              </CardContent>
            </Card>
          ) : null}
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
              <p className="text-xs text-slate-400">
                {t('houses.private.messagesHint')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {showComposer ? (
                <>
                  {!hasXpForMessages && (
                    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                      {t('houses.private.unlockNotice').replace('{xp}', MESSAGE_XP_THRESHOLD.toString())}
                    </div>
                  )}
                  {recipientOptions.length && hasXpForMessages ? (
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
                              {option.label}{' '}
                              ({option.role === 'head' ? t('houses.private.roleHead') : t('houses.private.roleModerator')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="subject" className="text-xs uppercase tracking-[0.35em] text-slate-400">
                          {t('houses.private.subjectLabel')}
                        </Label>
                        <Input
                          id="subject"
                          value={subjectDraft}
                          onChange={(event) => setSubjectDraft(event.target.value)}
                          placeholder={t('houses.private.subjectPlaceholder')}
                          className="bg-[#020b16] border-white/10 text-white"
                        />
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
                          className="min-h-[120px]"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          disabled={sendingMessage || !recipientOptions.length}
                          className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                        >
                          {sendingMessage ? t('houses.private.sending') : t('houses.private.sendMessage')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-white/70">
                      {recipientOptions.length
                        ? t('houses.private.unlockNotice').replace('{xp}', MESSAGE_XP_THRESHOLD.toString())
                        : t('houses.private.noRecipients')}
                    </p>
                  )}
                </>
              ) : null}
              <div className="space-y-3">
                {privateMessagesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('houses.private.loadingPrivateMessages')}
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
                      } ${message.isIncoming && message.isUnread ? 'cursor-pointer' : ''}`}
                      onClick={() => handleMessageOpen(message)}
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
              <CardTitle className="text-lg text-white">
                {t('houses.private.section.officialMessages')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('houses.private.loadingOfficialMessages')}</span>
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
                <p className="text-white/70">{t('houses.private.officialMessages.empty')}</p>
              )}
            </CardContent>
          </Card>
        </div>
        </>
      )}
    </section>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

