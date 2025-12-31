'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/lib/auth';
import { withCanonicalUserRole } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    country: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getToken: () => string | null;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSyncId, setLastSyncId] = useState<string | null>(null);
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window === 'undefined') return;

    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        const parsed = JSON.parse(storedUser);
        setUser(withCanonicalUserRole(parsed));
      }
    } catch (error) {
      console.error('AuthProvider hydration error:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    setLoading(false);
  }, []);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const refreshUser = () => {
    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(withCanonicalUserRole(parsed));
        setHasSyncedProfile(false);
      }
    } catch (error) {
      console.error('refreshUser error:', error);
      setUser(null);
      setHasSyncedProfile(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || hasSyncedProfile) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();

    const syncProfile = async () => {
      try {
        const response = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data?.success && data.user) {
          const safeUser = withCanonicalUserRole(data.user);
          setUser(safeUser);
          localStorage.setItem('user', JSON.stringify(safeUser));
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Failed to sync user profile:', error);
        }
      } finally {
        setHasSyncedProfile(true);
      }
    };

    void syncProfile();

    return () => controller.abort();
  }, [isHydrated, hasSyncedProfile]);

  useEffect(() => {
    if (!isHydrated || !user) return;
    if (user.id === lastSyncId) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();

    const syncXp = async () => {
      try {
        const response = await fetch('/api/me/xp', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data?.success && data?.xp) {
          const xpFromServer = Number(data.xp.xp_total ?? data?.xp_total);
          if (Number.isFinite(xpFromServer) && xpFromServer !== user.xp_total) {
            const updatedUser = { ...user, xp_total: xpFromServer };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          setLastSyncId(user.id);
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('AuthProvider sync XP error:', error);
        }
      }
    };

    void syncXp();

    return () => controller.abort();
  }, [isHydrated, user?.id, lastSyncId]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setLastSyncId(null);
        const safeUser = withCanonicalUserRole(data.user);
        setUser(safeUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(safeUser));
          localStorage.setItem('token', data.token);
        }
        setHasSyncedProfile(true);
        return { success: true };
      }

      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      console.error('login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (signupData: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    country: string;
  }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setLastSyncId(null);
        const safeUser = withCanonicalUserRole(data.user);
        setUser(safeUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(safeUser));
          localStorage.setItem('token', data.token);
        }
        setHasSyncedProfile(true);
        return { success: true };
      }

      return { success: false, error: data.error || 'Signup failed' };
    } catch (error) {
      console.error('signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setLastSyncId(null);
    setHasSyncedProfile(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, getToken, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
