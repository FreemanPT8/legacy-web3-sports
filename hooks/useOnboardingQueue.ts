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
  initialQueue?: OnboardingPopupData[];
};

export function useOnboardingQueue(options: UseOnboardingQueueOptions = {}) {
  const { initialQueue = [] } = options;
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue.map((item) => ({ ...item, scheduledAt: Date.now() })));
  const [active, setActive] = useState<QueueItem | null>(null);
  const [logs, setLogs] = useState<QueueLog[]>([]);
  const evaluating = useRef(false);
  const activeRef = useRef<QueueItem | null>(null);

  const pushLog = useCallback((entry: QueueLog) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const tryDeliverNext = useCallback(() => {
    if (evaluating.current) return;
    evaluating.current = true;
    setTimeout(() => {
      evaluating.current = false;
    }, 0);
    if (activeRef.current) return;
    setQueue((currentQueue) => {
      if (currentQueue.length === 0) return currentQueue;
      const [next, ...rest] = currentQueue;
      setActive(next);
      activeRef.current = next;
      pushLog({ popupId: next.id, action: 'delivered', timestamp: Date.now() });
      return rest;
    });
  }, [pushLog]);

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
  const queueSnapshot = useMemo<OnboardingPopupData[]>(
    () => queue.map(({ scheduledAt, ...popup }) => ({ ...popup })),
    [queue],
  );

  return {
    activePopup: active,
    enqueue,
    resetQueue,
    recordAction,
    logs,
    pending,
    queueSnapshot,
  };
}
