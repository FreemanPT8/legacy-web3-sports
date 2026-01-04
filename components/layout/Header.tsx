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
} from 'lucide-react';
import { useState, memo, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Header = memo(function Header() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  const canAccessAdmin = user ? isAdminRole(user.role) : false;

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
                    <li>
                      <Link href="/sports/onboarding" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 leading-none no-underline outline-none transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                          <div className="text-sm font-medium text-slate-100">
                            {t('nav.onboarding')}
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
              {user && (
                <NavigationMenuItem>
                  <Link href="/events" legacyBehavior passHref>
                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white">
                      {t('nav.events')}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}

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

          {/* NOTIFICAÇÕES */}
          {user && (
            <Link href="/notifications" className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="w-9 px-0 text-gray-200"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
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
                  <Link
                    href="/sports/onboarding"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg pl-4 block"
                  >
                    {t('nav.onboarding')}
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
                <Link
                  href="/events"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg"
                >
                  {t('nav.events')}
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
