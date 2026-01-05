'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { OnboardingPopupData } from '@/components/education/OnboardingPopup';

type QueueItem = OnboardingPopupData & { scheduledAt: number };

export type QueueLogAction = 'delivered' | 'primary' | 'secondary' | 'dismiss';

export type QueueLog = {
  popupId: string;
  action: QueueLogAction;
  timestamp: number;
};

type UseOnboardingQueueOptions = {
  dailyLimit?: number;
  weeklyLimit?: number;
  initialQueue?: OnboardingPopupData[];
};

const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = DAY_MS * 7;

export function useOnboardingQueue(options: UseOnboardingQueueOptions = {}) {
  const { dailyLimit = 1, weeklyLimit = 3, initialQueue = [] } = options;
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue.map((item) => ({ ...item, scheduledAt: Date.now() })));
  const [active, setActive] = useState<QueueItem | null>(null);
  const [logs, setLogs] = useState<QueueLog[]>([]);
  const [cooldownReason, setCooldownReason] = useState<string | null>(null);
  const evaluating = useRef(false);
  const activeRef = useRef<QueueItem | null>(null);

  const now = Date.now();
  const deliveredLogs = useMemo(() => logs.filter((log) => log.action === 'delivered'), [logs]);

  const deliveredToday = useMemo(() => {
    const cutoff = now - DAY_MS;
    return deliveredLogs.filter((log) => log.timestamp >= cutoff).length;
  }, [deliveredLogs, now]);

  const deliveredWeek = useMemo(() => {
    const cutoff = now - WEEK_MS;
    return deliveredLogs.filter((log) => log.timestamp >= cutoff).length;
  }, [deliveredLogs, now]);

  const canDeliver = deliveredToday < dailyLimit && deliveredWeek < weeklyLimit;

  const pushLog = useCallback((entry: QueueLog) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const tryDeliverNext = useCallback(() => {
    if (evaluating.current) return;
    evaluating.current = true;
    setTimeout(() => {
      evaluating.current = false;
    }, 0);
    setCooldownReason(null);
    if (activeRef.current) return;
    setQueue((currentQueue) => {
      if (currentQueue.length === 0) return currentQueue;
      if (!canDeliver) {
        setCooldownReason(deliveredToday >= dailyLimit ? 'daily' : 'weekly');
        return currentQueue;
      }
      const [next, ...rest] = currentQueue;
      setActive(next);
      activeRef.current = next;
      pushLog({ popupId: next.id, action: 'delivered', timestamp: Date.now() });
      return rest;
    });
  }, [canDeliver, deliveredToday, dailyLimit, pushLog]);

  useEffect(() => {
    if (!active) {
      tryDeliverNext();
    }
  }, [active, queue, tryDeliverNext]);

  const enqueue = useCallback((item: OnboardingPopupData) => {
    setQueue((prev) => [...prev, { ...item, scheduledAt: Date.now() }]);
  }, []);

  const resetQueue = useCallback((items: OnboardingPopupData[]) => {
    activeRef.current = null;
    setActive(null);
    setLogs([]);
    setCooldownReason(null);
    setQueue(items.map((item) => ({ ...item, scheduledAt: Date.now() })));
  }, []);

  const recordAction = useCallback(
    (action: QueueLogAction) => {
      if (!activeRef.current) return;
      pushLog({ popupId: activeRef.current.id, action, timestamp: Date.now() });
      if (action === 'dismiss' || action === 'primary' || action === 'secondary') {
        setActive(null);
        activeRef.current = null;
      }
    },
    [pushLog],
  );

  const pending = useMemo(() => queue.length, [queue.length]);

  return {
    activePopup: active,
    enqueue,
    resetQueue,
    recordAction,
    logs,
    pending,
    deliveredToday,
    deliveredWeek,
    dailyLimit,
    weeklyLimit,
    cooldownReason,
    canDeliver,
  };
}
