'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

export function useTermAgreement(houseKeyInput = 'LEGACY') {
  const { getToken, user } = useAuth();
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const houseKey = (houseKeyInput || 'LEGACY').toUpperCase();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setAcceptedAt(null);
        setLoading(false);
        setError(null);
        return;
      }
      const token = getToken?.();
      if (!token) {
        setAcceptedAt(null);
        setLoading(false);
        setError('Precisas de iniciar sessão.');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/onboarding/term?house=${encodeURIComponent(houseKey)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = (await response.json()) as { success: boolean; acceptedAt?: string | null; error?: string };
        if (!active) return;
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load term status');
        }
        setAcceptedAt(data.acceptedAt ? new Date(data.acceptedAt).getTime() : null);
      } catch (err) {
        if (!active) return;
        console.error('[useTermAgreement] load failed', err);
        setAcceptedAt(null);
        setError('Falha ao validar o Termo.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [getToken, houseKey, user]);

  const accept = useCallback(async () => {
    if (!user) {
      setError('Precisas de iniciar sessão.');
      return;
    }
    const token = getToken?.();
    if (!token) {
      setError('Token de autenticação em falta.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/onboarding/term', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ house: houseKey }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept term');
      }
      setAcceptedAt(Date.now());
    } catch (err) {
      console.error('[useTermAgreement] accept failed', err);
      setError('Falha ao registar o Termo.');
    } finally {
      setSaving(false);
    }
  }, [getToken, houseKey, user]);

  return { acceptedAt, loading, accept, isAccepted: !!acceptedAt, error, saving };
}
