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

type Props = {
  houseKey: string;
  roster: HouseProfilePayload['house']['roster'];
};

export function HouseMessageComposer({ houseKey, roster }: Props) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
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
    if (!user) {
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
        console.error('[house message composer] membership failed', error);
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [houseKey, user]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
      return;
    }
    if (loadingMembership) {
      return;
    }
    if (membership && !membership.isMember) {
      toast({
        title: t('houses.private.toastAccessErrorTitle'),
        description: t('houses.private.membershipAccessRequired'),
        variant: 'destructive',
      });
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
      const response = await fetch(`/api/houses/${houseKey}/private-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    return <p className="text-xs text-white/70">{t('houses.private.noRecipients')}</p>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSend}>
      {!membership?.isMember && (
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
  );
}
