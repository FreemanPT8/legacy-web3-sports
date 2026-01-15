'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { MESSAGE_XP_THRESHOLD } from '@/lib/private-messages';
import type { HouseProfilePayload } from '@/lib/houses/profile';

type RecipientOption = {
  id: string;
  label: string;
  role: 'head' | 'moderator';
};

type MembershipResponse = {
  success: boolean;
  isMember: boolean;
  roles: string[];
};

type PrivateMessage = {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  isIncoming: boolean;
  isUnread: boolean;
  isArchived: boolean;
  sender: { id: string; username: string | null; name: string; avatarUrl: string | null } | null;
  recipient: { id: string; username: string | null; name: string; avatarUrl: string | null } | null;
};

type Props = {
  houseKey: string;
  roster: HouseProfilePayload['house']['roster'];
};

export function HouseMessageComposer({ houseKey, roster }: Props) {
  const { user, getToken } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inboxMessages, setInboxMessages] = useState<PrivateMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [showArchived, setShowArchived] = useState(false);
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

  const loadInboxMessages = async () => {
    if (!user) return;
    const token = getToken();
    setInboxLoading(true);
    setInboxError(null);
    try {
      const querySuffix = showArchived ? '?includeArchived=true' : '';
      const response = await fetch(`/api/houses/${houseKey}/private-messages${querySuffix}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load private messages.');
      }
      setInboxMessages(data.messages ?? []);
    } catch (error) {
      console.error('[house message composer] inbox failed', error);
      setInboxError(t('houses.private.errorPrivateMessagesLoad'));
      setInboxMessages([]);
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
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
        if (!response.ok || !data?.success) {
          setMembership(null);
          return;
        }
        setMembership(data);
      })
      .catch((error) => {
        console.error('[house message composer] membership failed', error);
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [houseKey, user, toast, t, getToken]);

  useEffect(() => {
    void loadInboxMessages();
  }, [houseKey, user, showArchived]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void loadInboxMessages();
    };
    window.addEventListener('house:messages:update', handler);
    return () => window.removeEventListener('house:messages:update', handler);
  }, [user, houseKey, showArchived]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
      return;
    }
    if (loadingMembership) {
      return;
    }
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
          subject: subjectDraft.trim(),
          body: messageDraft.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send private message.');
      }
      setSubjectDraft('');
      setMessageDraft('');
      void loadInboxMessages();
      window.dispatchEvent(new Event('house:messages:update'));
      toast({
        title: t('houses.private.toastSentTitle'),
        description: t('houses.private.toastSentBody'),
      });
    } catch (error: any) {
      console.error('[house message composer] send failed', error);
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

  const handleInboxReply = async (message: PrivateMessage) => {
    if (!replyDraft.trim()) {
      toast({
        title: t('houses.private.toastMissingMessageTitle'),
        description: t('houses.private.errorMessage'),
        variant: 'destructive',
      });
      return;
    }
    const recipientId = message.isIncoming ? message.sender?.id : message.recipient?.id;
    if (!recipientId) {
      toast({
        title: t('houses.private.toastMissingRecipientTitle'),
        description: t('houses.private.errorRecipient'),
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
          recipientId,
          subject: `Re: ${message.subject}`.trim(),
          body: replyDraft.trim(),
          replyToId: message.id,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send reply.');
      }
      setReplyingToId(null);
      setReplyDraft('');
      void loadInboxMessages();
      window.dispatchEvent(new Event('house:messages:update'));
    } catch (error: any) {
      console.error('[house message composer] reply failed', error);
      const messageText = error?.message || '';
      toast({
        title: t('houses.private.toastSendFailTitle'),
        description: messageText || t('houses.private.toastTryLater'),
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageAction = async (messageId: string, action: 'archive' | 'unarchive' | 'delete') => {
    try {
      const token = getToken();
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messageId, action }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update message.');
      }
      void loadInboxMessages();
      window.dispatchEvent(new Event('house:messages:update'));
    } catch (error) {
      console.error('[house message composer] message action failed', error);
      toast({
        title: t('houses.private.toastSendFailTitle'),
        description: t('houses.private.toastTryLater'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkRead = async (messageId: string) => {
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
      void loadInboxMessages();
    } catch (error) {
      console.error('[house message composer] mark read failed', error);
    }
  };

  const formatInboxDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString(
      language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US',
      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
    );

  if (!user) {
    return (
      <Button
        className="mt-3 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]"
        onClick={() => {
          window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
        }}
      >
        {t('houses.private.loginCta')}
      </Button>
    );
  }

  if (loadingMembership) {
    return (
      <p className="text-xs text-white/60">{t('houses.private.accessChecking')}</p>
    );
  }

  if (recipientOptions.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-white/70">{t('houses.private.noRecipients')}</p>
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{t('houses.private.inboxTitle')}</span>
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-cyan-400/40 hover:text-white"
          >
            {showArchived ? t('houses.private.hideArchived') : t('houses.private.showArchived')}
          </button>
        </div>
        <InboxList
          loading={inboxLoading}
          error={inboxError}
          messages={inboxMessages}
          onMarkRead={handleMarkRead}
          formatDate={formatInboxDate}
          onArchive={(messageId) => handleMessageAction(messageId, 'archive')}
          onUnarchive={(messageId) => handleMessageAction(messageId, 'unarchive')}
          onDelete={(messageId) => handleMessageAction(messageId, 'delete')}
          onReplyStart={(messageId) => {
            setReplyingToId(messageId);
            setReplyDraft('');
          }}
          onReplyCancel={() => {
            setReplyingToId(null);
            setReplyDraft('');
          }}
          onReplySend={handleInboxReply}
          replyingToId={replyingToId}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSend}>
        {membership?.success && !membership.isMember && (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
            {t('houses.private.membershipAccessRequired')}
          </div>
        )}
        {!hasXpForMessages && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
            {t('houses.private.unlockNotice').replace('{xp}', MESSAGE_XP_THRESHOLD.toString())}
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="house-recipient" className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {t('houses.private.recipientLabel')}
          </Label>
          <select
            id="house-recipient"
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
          <Label htmlFor="house-subject" className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {t('houses.private.subjectLabel')}
          </Label>
          <Input
            id="house-subject"
            value={subjectDraft}
            onChange={(event) => setSubjectDraft(event.target.value)}
            placeholder={t('houses.private.subjectPlaceholder')}
            className="bg-[#020b16] border-white/10 text-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="house-message-body" className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {t('houses.private.messageLabel')}
          </Label>
          <Textarea
            id="house-message-body"
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder={t('houses.private.messagePlaceholder')}
            className="min-h-[120px]"
          />
        </div>
        <Button
          type="submit"
          disabled={sendingMessage || recipientOptions.length === 0}
          className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
        >
          {sendingMessage ? t('houses.private.sending') : t('houses.private.sendMessage')}
        </Button>
      </form>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{t('houses.private.inboxTitle')}</span>
        <button
          type="button"
          onClick={() => setShowArchived((prev) => !prev)}
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-cyan-400/40 hover:text-white"
        >
          {showArchived ? t('houses.private.hideArchived') : t('houses.private.showArchived')}
        </button>
      </div>
      <InboxList
        loading={inboxLoading}
        error={inboxError}
        messages={inboxMessages}
        onMarkRead={handleMarkRead}
        formatDate={formatInboxDate}
        onArchive={(messageId) => handleMessageAction(messageId, 'archive')}
        onUnarchive={(messageId) => handleMessageAction(messageId, 'unarchive')}
        onDelete={(messageId) => handleMessageAction(messageId, 'delete')}
        onReplyStart={(messageId) => {
          setReplyingToId(messageId);
          setReplyDraft('');
        }}
        onReplyCancel={() => {
          setReplyingToId(null);
          setReplyDraft('');
        }}
        onReplySend={handleInboxReply}
        replyingToId={replyingToId}
        replyDraft={replyDraft}
        setReplyDraft={setReplyDraft}
        t={t}
      />
    </div>
  );
}

function InboxList({
  loading,
  error,
  messages,
  onMarkRead,
  formatDate,
  onArchive,
  onUnarchive,
  onDelete,
  onReplyStart,
  onReplyCancel,
  onReplySend,
  replyingToId,
  replyDraft,
  setReplyDraft,
  t,
}: {
  loading: boolean;
  error: string | null;
  messages: PrivateMessage[];
  onMarkRead: (messageId: string) => void;
  formatDate: (timestamp: string) => string;
  onArchive: (messageId: string) => void;
  onUnarchive: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onReplyStart: (messageId: string) => void;
  onReplyCancel: () => void;
  onReplySend: (message: PrivateMessage) => void;
  replyingToId: string | null;
  replyDraft: string;
  setReplyDraft: (value: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-slate-300">{t('houses.private.loadingPrivateMessages')}</p>
      ) : error ? (
        <p className="text-xs text-rose-200">{error}</p>
      ) : messages.length === 0 ? (
        <p className="text-xs text-slate-400">{t('houses.private.emptyState')}</p>
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            className={`space-y-2 rounded-2xl border px-4 py-3 ${
              message.isIncoming ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-white/10 bg-black/20'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">
                  {message.isIncoming ? t('houses.private.incomingLabel') : t('houses.private.outgoingLabel')}
                </p>
                <p className="text-sm font-semibold text-white">{message.subject}</p>
              </div>
              <span className="text-xs text-slate-400">{formatDate(message.createdAt)}</span>
            </div>
            <p className="text-sm text-white/70 line-clamp-4">{message.body}</p>
            {message.isIncoming && message.isUnread && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-100">
                <span className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-[10px]">
                  {t('houses.private.unread')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-cyan-200 hover:text-cyan-100"
                  onClick={() => onMarkRead(message.id)}
                >
                  {t('houses.private.markAsRead')}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <Button size="sm" variant="ghost" onClick={() => onReplyStart(message.id)}>
                {t('houses.private.actionReply')}
              </Button>
              {message.isArchived ? (
                <Button size="sm" variant="ghost" onClick={() => onUnarchive(message.id)}>
                  {t('houses.private.actionUnarchive')}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onArchive(message.id)}>
                  {t('houses.private.actionArchive')}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDelete(message.id)}>
                {t('houses.private.actionDelete')}
              </Button>
            </div>
            {replyingToId === message.id && (
              <div className="space-y-2">
                <Textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder={t('houses.private.replyPlaceholder')}
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onReplySend(message)}>
                    {t('houses.private.replySend')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onReplyCancel}>
                    {t('houses.private.replyCancel')}
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
