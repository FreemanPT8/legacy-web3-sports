 'use client';

import { useMemo, useState } from 'react';
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
];

const MESSAGE_LIMIT_OPTIONS = [25, 50, 100];

type HouseOption = {
  houseKey: string;
  label: string;
};

export default function AdminHouseMessagesPage() {
  const { language, t } = useLanguage();
  const { mutate } = useSWRConfig();
  const [filters, setFilters] = useState({
    house: 'all',
    status: 'all',
    search: '',
    limit: 25,
  });

  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.house && filters.house !== 'all') params.set('house', filters.house);
    if (filters.status) params.set('status', filters.status);
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
          <CardContent className="grid gap-4 md:grid-cols-4">
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
                    <h3 className="text-lg font-semibold text-white">{message.subject}</h3>
                  </div>
                <Badge
                  variant={message.status === 'unread' ? 'outline' : 'secondary'}
                  className={
                    message.status === 'unread'
                      ? 'border-rose-400/50 text-rose-200'
                      : 'border-emerald-400/40 text-emerald-200'
                  }
                >
                    {message.status === 'unread'
                      ? t('admin.houses.messages.status.badge.unread')
                      : t('admin.houses.messages.status.badge.read')}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-300 line-clamp-3">{message.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div>
                    {t('admin.houses.messages.list.from')} {message.sender?.name ?? '-'}
                    {' • '}
                    {t('admin.houses.messages.list.to')} {message.recipient?.name ?? '-'}
                  </div>
                  <div>{new Date(message.createdAt).toLocaleString(language)}</div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
