 'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to load house messages');
    }
    return response.json();
  });

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.houses.messages.status.all' },
  { value: 'unread', labelKey: 'admin.houses.messages.status.unread' },
  { value: 'read', labelKey: 'admin.houses.messages.status.read' },
  { value: 'open', labelKey: 'admin.houses.messages.status.open' },
  { value: 'sent', labelKey: 'admin.houses.messages.status.sent' },
];

const MESSAGE_LIMIT_OPTIONS = [25, 50, 100];

const DIRECTION_OPTIONS = [
  { value: 'all', labelKey: 'admin.houses.messages.direction.all' },
  { value: 'incoming', labelKey: 'admin.houses.messages.direction.incoming' },
  { value: 'outgoing', labelKey: 'admin.houses.messages.direction.outgoing' },
];

type HouseOption = {
  houseKey: string;
  label: string;
};

export default function AdminHouseMessagesPage() {
  const { language, t } = useLanguage();
  const { mutate } = useSWRConfig();
  const [hasPurgedSeeded, setHasPurgedSeeded] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    house: 'all',
    status: 'all',
    direction: 'all',
    search: '',
    limit: 25,
  });

  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.house && filters.house !== 'all') params.set('house', filters.house);
    if (filters.status) params.set('status', filters.status);
    if (filters.direction && filters.direction !== 'all') params.set('direction', filters.direction);
    if (filters.search) params.set('q', filters.search.trim());
    params.set('limit', filters.limit.toString());
    return params.toString();
  }, [filters]);

  const apiUrl = `/api/admin/houses/messages${queryKey ? `?${queryKey}` : ''}`;
  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const houses: HouseOption[] = data?.houses ?? [];
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  const handleFilterChange = (field: keyof typeof filters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const refreshMessages = () => mutate(apiUrl);

  useEffect(() => {
    if (hasPurgedSeeded || isLoading || !messages.length) return;
    const allSeeded = messages.every((message: any) => {
      const subject = (message?.subject || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return subject.startsWith('boas-vindas da house') || subject.startsWith('duvida sobre a');
    });
    if (!allSeeded) return;

    setHasPurgedSeeded(true);
    fetch('/api/admin/houses/messages/purge-seeded', { method: 'POST' })
      .then(() => refreshMessages())
      .catch((error) => {
        console.error('[admin house messages] purge seeded failed', error);
      });
  }, [hasPurgedSeeded, isLoading, messages, refreshMessages]);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(
      language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US',
    );

  const statusLabelKey: Record<string, string> = {
    unread: 'admin.houses.messages.status.badge.unread',
    read: 'admin.houses.messages.status.badge.read',
    open: 'admin.houses.messages.status.badge.open',
    sent: 'admin.houses.messages.status.badge.sent',
  };

  const statusClassName: Record<string, string> = {
    unread: 'border-rose-400/50 text-rose-200',
    read: 'border-emerald-400/40 text-emerald-200',
    open: 'border-cyan-400/50 text-cyan-200',
    sent: 'border-white/20 text-slate-200',
  };

  const handleStartReply = (message: any) => {
    setReplyError(null);
    setReplyDraft('');
    setReplyingToId(message.id);
  };

  const handleSendReply = async (message: any) => {
    if (!replyDraft.trim()) return;
    const recipientId = message?.direction === 'outgoing'
      ? message?.recipient?.id
      : message?.sender?.id;
    if (!recipientId) {
      setReplyError(t('admin.houses.messages.replyMissingRecipient'));
      return;
    }

    setSendingReply(true);
    setReplyError(null);
    try {
      const response = await fetch(`/api/houses/${message.houseKey}/private-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          body: replyDraft.trim(),
          subject: `${t('admin.houses.messages.replyPrefix')} ${message.subject || ''}`.trim(),
          replyToId: message.id,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to send reply.');
      }
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send reply.');
      }
      setReplyingToId(null);
      setReplyDraft('');
      refreshMessages();
    } catch (error) {
      console.error('[admin house messages] reply failed', error);
      setReplyError(t('admin.houses.messages.replyError'));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            {t('admin.houses.messages.title')}
          </h1>
          <p className="text-sm text-slate-300">{t('admin.houses.messages.description')}</p>
        </div>
        <Link href="/admin/houses">
          <Button variant="outline">{t('admin.houses.backToList')}</Button>
        </Link>
      </div>

      <section>
        <Card className="border-white/10 bg-[#03131d]/80">
          <CardHeader>
            <CardTitle className="text-lg">{t('admin.houses.messages.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {t('admin.houses.messages.filters.houseLabel')}
              </label>
              <Select
                value={filters.house}
                onValueChange={(value) => handleFilterChange('house', value)}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/10 bg-[#020b16] text-white">
                  <SelectValue placeholder={t('admin.houses.messages.filters.housePlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#02121c] text-white">
                  <SelectItem value="all">{t('admin.houses.messages.filters.allHouses')}</SelectItem>
                  {houses.map((house) => (
                    <SelectItem key={house.houseKey} value={house.houseKey}>
                      {house.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {t('admin.houses.messages.filters.statusLabel')}
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/10 bg-[#020b16] text-white">
                  <SelectValue placeholder={t('admin.houses.messages.filters.statusLabel')} />
                </SelectTrigger>
                <SelectContent className="bg-[#02121c] text-white">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {t('admin.houses.messages.filters.searchLabel')}
              </label>
              <Input
                placeholder={t('admin.houses.messages.filters.searchPlaceholder')}
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
                className="bg-[#020b16] border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {t('admin.houses.messages.filters.directionLabel')}
              </label>
              <Select
                value={filters.direction}
                onValueChange={(value) => handleFilterChange('direction', value)}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/10 bg-[#020b16] text-white">
                  <SelectValue placeholder={t('admin.houses.messages.filters.directionLabel')} />
                </SelectTrigger>
                <SelectContent className="bg-[#02121c] text-white">
                  {DIRECTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {t('admin.houses.messages.filters.limitLabel')}
              </label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => handleFilterChange('limit', Number(value))}
              >
                <SelectTrigger className="w-full rounded-xl border border-white/10 bg-[#020b16] text-white">
                  <SelectValue placeholder={t('admin.houses.messages.filters.limitLabel')} />
                </SelectTrigger>
                <SelectContent className="bg-[#02121c] text-white">
                  {MESSAGE_LIMIT_OPTIONS.map((limitOption) => (
                    <SelectItem key={limitOption} value={limitOption.toString()}>
                      {limitOption} {t('admin.houses.messages.filters.limitSuffix')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardContent className="flex items-center justify-between gap-3 border-t border-white/5 pt-4">
            <p className="text-sm text-slate-400">
              {t('admin.houses.messages.filters.totalLabel').replace('{total}', total.toString())}
            </p>
            <Button variant="outline" onClick={refreshMessages}>
              {t('admin.houses.messages.filters.refresh')}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-white/10 bg-[#03131d]/80">
          <CardHeader>
            <CardTitle className="text-lg">{t('admin.houses.messages.list.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <p className="text-sm text-slate-400">{t('admin.houses.messages.list.loading')}</p>
            )}
            {error && (
              <p className="text-sm text-rose-200">
                {t('admin.houses.messages.list.error')}
              </p>
            )}
            {!isLoading && !messages.length && (
              <p className="text-sm text-slate-400">
                {t('admin.houses.messages.list.empty')}
              </p>
            )}
            {messages.map((message: any) => (
              <article
                key={message.id}
                className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-4 shadow-[0_15px_45px_rgba(0,0,0,0.45)]"
              >
                <div className="flex flex-col gap-2 border-b border-white/5 pb-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                      {message.houseLabel}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      {message.direction === 'incoming'
                        ? t('admin.houses.messages.direction.incoming')
                        : t('admin.houses.messages.direction.outgoing')}
                    </p>
                    <h3 className="text-lg font-semibold text-white">{message.subject}</h3>
                  </div>
                  <Badge
                    variant={message.status === "unread" ? "outline" : "secondary"}
                    className={statusClassName[message.status] || "border-white/20 text-slate-200"}
                  >
                    {t(statusLabelKey[message.status] || statusLabelKey.unread)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-300 line-clamp-3">{message.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div>
                    {t("admin.houses.messages.list.from")} {message.sender?.name ?? "-"}
                    {" - "}
                    {t("admin.houses.messages.list.to")} {message.recipient?.name ?? "-"}
                  </div>
                  <div>{formatDateTime(message.createdAt)}</div>
                </div>
                {Array.isArray(message.history) && message.history.length > 0 && (
                  <div className="mt-4 space-y-1 text-xs text-slate-400">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                      {t("admin.houses.messages.history.title")}
                    </p>
                    {message.history.map((event: any) => (
                      <div key={event.id}>
                        {event.type === "read"
                          ? t("admin.houses.messages.history.read")
                          : t("admin.houses.messages.history.reply")}
                        {" "}
                        {event.actor?.name ? `${event.actor.name} ` : ""}
                        {event.createdAt ? formatDateTime(event.createdAt) : ""}
                      </div>
                    ))}
                  </div>
                )}
                {message.canReply && (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    {replyingToId !== message.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartReply(message)}
                      >
                        {t("admin.houses.messages.replyAction")}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder={t("admin.houses.messages.replyPlaceholder")}
                          className="bg-[#020b16] border-white/10 text-white"
                        />
                        {replyError ? (
                          <p className="text-xs text-rose-200">{replyError}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(message)}
                            disabled={sendingReply || !replyDraft.trim()}
                          >
                            {sendingReply
                              ? t("admin.houses.messages.replySending")
                              : t("admin.houses.messages.replySend")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingToId(null)}
                          >
                            {t("admin.houses.messages.replyCancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
