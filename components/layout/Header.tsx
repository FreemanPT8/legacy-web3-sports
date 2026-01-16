'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';
import { isAdminRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Globe,
  User,
  LogOut,
  LayoutDashboard,
  Trophy,
  Menu,
  Bell,
  Shield,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { useState, memo, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Header = memo(function Header() {
  const { user, logout, getToken } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageBadgeCount, setMessageBadgeCount] = useState(0);
  const [messageStaffAccess, setMessageStaffAccess] = useState(false);
  const [pendingHeadInvites, setPendingHeadInvites] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  type NotificationPreview = {
    id: string;
    title: string;
    message: string;
    created_at: string;
    link?: string | null;
    type?: string | null;
  };
  type InvitePreview = {
    id: string;
    houseName: string;
    houseKey: string;
    createdAt: string;
    expiresAt?: string | null;
  };

  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [bellInvites, setBellInvites] = useState<InvitePreview[]>([]);
  const [bellInvitesLoading, setBellInvitesLoading] = useState(false);
  const [bellInvitesError, setBellInvitesError] = useState<string | null>(null);
  const selectableLanguages = SUPPORTED_LANGUAGES.map((code) => ({
    code,
    label: LANGUAGES[code] ?? code.toUpperCase(),
  }));

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          `/api/notifications?userId=${user.id}&unreadOnly=true`,
        );
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const refreshPrivateMessageCount = useCallback(async () => {
    try {
      const response = await fetch('/api/houses/private-messages/unread-count');
      const data = await response.json();
      if (response.ok && data?.success) {
        const count = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
        setMessageBadgeCount(count);
        setMessageStaffAccess(!!data.isStaff);
      }
    } catch (error) {
      console.error('Failed to fetch private message count:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setMessageBadgeCount(0);
      setMessageStaffAccess(false);
      return;
    }

    refreshPrivateMessageCount();
    const interval = setInterval(refreshPrivateMessageCount, 60000);
    return () => clearInterval(interval);
  }, [refreshPrivateMessageCount, user]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void refreshPrivateMessageCount();
    };
    window.addEventListener('house:messages:update', handler);
    return () => window.removeEventListener('house:messages:update', handler);
  }, [refreshPrivateMessageCount, user]);

  useEffect(() => {
    if (!user) {
      setPendingHeadInvites(0);
      return;
    }

    const fetchHeadInvites = async () => {
      const token = getToken();
      if (!token) {
        setPendingHeadInvites(0);
        return;
      }
      try {
        const response = await fetch('/api/head-invites', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data?.success) {
          setPendingHeadInvites((data.invites || []).length);
        }
      } catch (error) {
        console.error('Failed to fetch head invites:', error);
      }
    };

    fetchHeadInvites();
    const interval = setInterval(fetchHeadInvites, 60000);
    return () => clearInterval(interval);
  }, [user, getToken]);

  const canAccessAdmin = user ? isAdminRole(user.role) : false;
  const canAccessMessagesAdmin = !!user && (canAccessAdmin || messageStaffAccess);
  const messagesHref = canAccessMessagesAdmin ? '/admin/houses/messages' : '/sports/houses';
  const totalBellCount = unreadCount + pendingHeadInvites;
  const noNotificationsText =
    {
      pt: 'Não existem novas notificações neste momento.',
      en: 'No new notifications right now.',
      es: 'No hay nuevas notificaciones en este momento.',
    }[language] || 'No notifications available.';
  const notificationsLabel =
    {
      pt: 'Notificações',
      en: 'Notifications',
      es: 'Notificaciones',
    }[language] || 'Notifications';
  const invitesLabel =
    {
      pt: 'Convites de House',
      en: 'House invites',
      es: 'Invitaciones House',
    }[language] || 'House invites';
  const invitesCtaLabel =
    {
      pt: 'Ver convites',
      en: 'View invites',
      es: 'Ver invitaciones',
    }[language] || 'View invites';
  const messagesLabel =
    {
      pt: 'Mensagens',
      en: 'Messages',
      es: 'Mensajes',
    }[language] || 'Messages';

  const loadBellNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&limit=5`);
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load notifications');
      }
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('[Header] load notifications failed', error);
      setNotificationsError(
        language === 'pt'
          ? 'Falha ao carregar notificações.'
          : language === 'es'
            ? 'Error al cargar notificaciones.'
            : 'Failed to load notifications.',
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [language, user]);

  const loadBellInvites = useCallback(async () => {
    if (!user) {
      setBellInvites([]);
      return;
    }
    const token = getToken();
    if (!token) {
      setBellInvites([]);
      return;
    }
    setBellInvitesLoading(true);
    setBellInvitesError(null);
    try {
      const response = await fetch('/api/head-invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load invites');
      }
      setBellInvites(
        (data.invites || []).map((invite: any) => ({
          id: invite.id,
          houseName: invite.houseName || invite.houseKey || 'House',
          houseKey: invite.houseKey || 'HOUSE',
          createdAt: invite.createdAt || invite.created_at || new Date().toISOString(),
          expiresAt: invite.expiresAt || invite.expires_at || null,
        })),
      );
    } catch (error) {
      console.error('[Header] load invites failed', error);
      setBellInvitesError(
        language === 'pt'
          ? 'Falha ao carregar convites.'
          : language === 'es'
            ? 'Error al cargar invitaciones.'
            : 'Failed to load invites.',
      );
      setBellInvites([]);
    } finally {
      setBellInvitesLoading(false);
    }
  }, [getToken, language, user]);

  const formatDate = useCallback(
    (isoDate: string) =>
      new Date(isoDate).toLocaleString(
        language === 'pt' ? 'pt-PT' : language === 'es' ? 'es-ES' : 'en-US',
        { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
      ),
    [language],
  );

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] shadow-[0_12px_35px_rgba(0,0,0,0.55)]"
    >
      <div className="border-b border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 lg:justify-end">
          <span>Disponível em 3 línguas</span>
          <span className="text-white/80">PT · EN · ES</span>
        </div>
      </div>
      <div className="container flex h-16 items-center justify-between text-slate-100">
        {/* LOGO + NAV DESKTOP */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-sky-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              LEGACY
            </span>
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-white focus:border-cyan-300/60 focus:text-white">
                    {t('nav.home')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {/* EDUCATION */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 shadow-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-white">
                  {t('nav.education')}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="border border-white/10 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27]">
                  <ul className="grid w-[240px] gap-3 p-4">
                    <li>
                      <Link href="/education" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-sky-100">
                            {t('nav.overview')}
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/education/courses" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-slate-100">
                            {t('nav.courses')}
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    {user && (
                      <li>
                        <Link href="/education/xp" legacyBehavior passHref>
                          <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                            <div className="text-sm font-medium text-slate-100">
                              {t('nav.xp')}
                            </div>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        href="/education/leaderboard"
                        legacyBehavior
                        passHref
                      >
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-slate-100">
                            {t('nav.leaderboard')}
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/education/glossary"
                        legacyBehavior
                        passHref
                      >
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-[#fdd87c]/40 hover:bg-[#fdd87c]/10">
                          <div className="text-sm font-medium text-[#fdd87c]">
                            Glossário Legacy
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* SPORTS */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 shadow-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-white">
                  {t('nav.sports')}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="border border-white/10 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27]">
                  <ul className="grid w-[240px] gap-3 p-4">
                    <li>
                      <Link href="/sports" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-sky-100">
                            {t('nav.overview')}
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/sports/houses" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-slate-100">
                            {t('nav.houses')}
                          </div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* BLOG */}
              <NavigationMenuItem>
                <Link href="/blog" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-white focus:border-cyan-300/60 focus:text-white">
                    {t('nav.blog')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {/* ABOUT */}
              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-white focus:border-cyan-300/60 focus:text-white">
                    {t('nav.about')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {/* EVENTS (só se user) */}

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* LADO DIREITO: LANGUAGE + USER + MOBILE MENU */}
        <div className="flex items-center gap-2">
          {/* LANG */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-200">
                <Globe className="h-4 w-4 mr-2" />
                {LANGUAGES[language] ?? language.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-950 border border-gray-800">
              {selectableLanguages.map(({ code, label }) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={language === code ? 'bg-gray-900 text-white' : 'text-gray-200'}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href={messagesHref}>
            <Button
              variant="ghost"
              size="sm"
              className="relative w-9 px-0 text-gray-200"
              aria-label={messagesLabel}
              title={messagesLabel}
            >
              <MessageSquare className="h-4 w-4" />
              {messageBadgeCount > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                  {messageBadgeCount > 9 ? '9+' : messageBadgeCount}
                </span>
              )}
            </Button>
          </Link>

          {/* NOTIFICAÇÕES */}
          {user && (
            <DropdownMenu
              open={bellOpen}
              onOpenChange={(open) => {
                setBellOpen(open);
                if (open) {
                  void loadBellNotifications();
                  void loadBellInvites();
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative w-9 px-0 text-gray-200"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {totalBellCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {totalBellCount > 9 ? '9+' : totalBellCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 border border-white/10 bg-[#010915] text-white shadow-[0_25px_70px_rgba(0,0,0,0.65)]"
              >
                <div className="border-b border-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  {notificationsLabel}
                </div>
                <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
                  {notificationsLoading || bellInvitesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === 'pt'
                        ? 'A carregar notificações...'
                        : language === 'es'
                          ? 'Cargando notificaciones...'
                          : 'Loading notifications...'}
                    </div>
                  ) : notificationsError || bellInvitesError ? (
                    <p className="text-sm text-rose-300">
                      {notificationsError || bellInvitesError}
                    </p>
                  ) : notifications.length === 0 && bellInvites.length === 0 ? (
                    <p className="text-sm text-slate-400">{noNotificationsText}</p>
                  ) : (
                    <>
                      {bellInvites.length > 0 && (
                        <div className="rounded-2xl border border-white/10 bg-[#020b16]/80 p-3 text-sm">
                          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-cyan-200">
                            {invitesLabel}
                            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {bellInvites.length > 9 ? '9+' : bellInvites.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {bellInvites.map((invite) => (
                              <div key={invite.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <p className="font-semibold text-white">{invite.houseName}</p>
                                <p className="text-xs text-slate-400">{invite.houseKey}</p>
                                <p className="text-[11px] text-slate-500">
                                  {formatDate(invite.createdAt)}
                                  {invite.expiresAt ? ` · expira ${formatDate(invite.expiresAt)}` : ''}
                                </p>
                                <Link
                                  href="/admin/houses?tab=invites"
                                  className="mt-2 inline-flex text-xs font-semibold text-sky-300 hover:text-sky-100"
                                >
                                  {invitesCtaLabel}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {notifications.length > 0 && (
                        <div className="space-y-3">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"
                            >
                              <p className="font-semibold text-white">{notification.title}</p>
                              <p className="text-slate-300">{notification.message}</p>
                              <p className="text-[11px] text-slate-500">
                                {formatDate(notification.created_at)}
                              </p>
                              {notification.link && (
                                <Link
                                  href={notification.link}
                                  className="mt-2 inline-flex text-xs font-semibold text-cyan-300 hover:text-cyan-100"
                                >
                                  {language === 'pt'
                                    ? 'Abrir detalhe'
                                    : language === 'es'
                                      ? 'Abrir detalle'
                                      : 'Open'}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="border-t border-white/10 px-4 py-2 text-right">
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                    <Link href="/notifications" className="hover:text-cyan-100">
                      {language === 'pt'
                        ? 'Ver histórico'
                        : language === 'es'
                          ? 'Ver historial'
                          : 'View history'}
                    </Link>
                    {bellInvites.length > 0 && (
                      <Link href="/admin/houses?tab=invites" className="text-sky-400 hover:text-sky-200">
                        {invitesCtaLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* USER DROPDOWN / LOGIN */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-200"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user.username}</span>
                  <span className="text-xs text-sky-400 font-semibold">
                    {user.xp_total} XP
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-gray-950 border border-gray-800"
              >
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer text-gray-200 hover:bg-gray-900">
                    <User className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer text-gray-200 hover:bg-gray-900">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-gray-800" />
                <Link href="/notifications">
                  <DropdownMenuItem className="cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-900">
                    <div className="flex items-center">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                </Link>
                {pendingHeadInvites > 0 && (
                  <Link href="/admin/houses?tab=invites">
                    <DropdownMenuItem className="cursor-pointer flex items-center justify-between text-sky-200 hover:bg-sky-900/50">
                      <div className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Convites de House
                      </div>
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                        {pendingHeadInvites > 9 ? '9+' : pendingHeadInvites}
                      </span>
                    </DropdownMenuItem>
                  </Link>
                )}
                {canAccessAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 text-sky-300 font-semibold hover:from-slate-800 hover:to-slate-700">
                        <Shield className="mr-2 h-4 w-4" />
                        {t('nav.admin')}
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-gray-200 hover:bg-gray-900"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-200">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950"
                >
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          )}

          {/* MOBILE MENU */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-200 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-l border-white/10 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27] text-slate-100"
            >
              <nav className="flex flex-col gap-4 mt-8">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium"
                >
                  {t('nav.home')}
                </Link>

                <div className="border-t border-white/10 pt-2">
                  <div className="text-sm font-semibold text-slate-400 mb-2">
                    {t('nav.education')}
                  </div>
                  <Link
                    href="/education"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block mb-2"
                  >
                    {t('nav.overview')}
                  </Link>
                  <Link
                    href="/education/courses"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block mb-2"
                  >
                    {t('nav.courses')}
                  </Link>
                  {user && (
                    <Link
                      href="/education/xp"
                      onClick={() => setMobileOpen(false)}
                      className="text-lg pl-4 block mb-2"
                    >
                      {t('nav.xp')}
                    </Link>
                  )}
                  <Link
                    href="/education/leaderboard"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block"
                  >
                    {t('nav.leaderboard')}
                  </Link>
                  <Link
                    href="/education/glossary"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block text-[#fdd87c]"
                  >
                    Glossário Legacy
                  </Link>
                </div>

                <div className="border-t border-white/10 pt-2">
                  <div className="text-sm font-semibold text-slate-400 mb-2">
                    {t('nav.sports')}
                  </div>
                  <Link
                    href="/sports"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block mb-2"
                  >
                    {t('nav.overview')}
                  </Link>
                  <Link
                    href="/sports/houses"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block mb-2"
                  >
                    {t('nav.houses')}
                  </Link>
                </div>

                <Link
                  href="/blog"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg"
                >
                  {t('nav.blog')}
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg"
                >
                  {t('nav.about')}
                </Link>

                {user && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="text-sm font-semibold text-slate-400 mb-2">
                    {user.username} ({user.xp_total} XP)
                  </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="text-lg block mb-2"
                    >
                      <User className="inline mr-2 h-4 w-4" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-lg block mb-2"
                    >
                      <LayoutDashboard className="inline mr-2 h-4 w-4" />
                      {t('nav.dashboard')}
                    </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg block mb-2 flex items-center justify-between"
                >
                  <div>
                    <Bell className="inline mr-2 h-4 w-4" />
                    Notifications
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                {pendingHeadInvites > 0 && (
                  <Link
                    href="/admin/houses?tab=invites"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg block mb-2 flex items-center justify-between text-sky-200"
                  >
                    <div>
                      <Shield className="inline mr-2 h-4 w-4" />
                      Convites de House
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                      {pendingHeadInvites > 9 ? '9+' : pendingHeadInvites}
                    </span>
                  </Link>
                )}
                    {canAccessAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="text-lg block mb-2 text-sky-400 font-semibold"
                      >
                        <LayoutDashboard className="inline mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <Button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full border-white/20 text-slate-100 hover:bg-white/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.logout')}
                    </Button>
                  </div>
                )}

                {!user && (
                  <div className="flex flex-col gap-2 mt-4">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-slate-100 hover:bg-white/10"
                      >
                        {t('nav.login')}
                      </Button>
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950">
                        {t('nav.signup')}
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
});
