'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES, Language } from '@/lib/i18n';
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
import { Globe, User, LogOut, LayoutDashboard, Trophy, Menu, Bell, Calendar, Shield } from 'lucide-react';
import { useState, memo, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Header = memo(function Header() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`);
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              LEGACY
            </span>
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    {t('nav.home')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/education" legacyBehavior passHref>
                  <NavigationMenuTrigger>{t('nav.education')}</NavigationMenuTrigger>
                </Link>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-3 p-4">
                    <li>
                      <Link href="/education" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100 bg-blue-50">
                          <div className="text-sm font-medium">{t('nav.overview')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/education/courses" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100">
                          <div className="text-sm font-medium">{t('nav.courses')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/education/xp" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100">
                          <div className="text-sm font-medium">{t('nav.xp')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/education/leaderboard" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100">
                          <div className="text-sm font-medium">{t('nav.leaderboard')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/sports" legacyBehavior passHref>
                  <NavigationMenuTrigger>{t('nav.sports')}</NavigationMenuTrigger>
                </Link>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-3 p-4">
                    <li>
                      <Link href="/sports" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100 bg-blue-50">
                          <div className="text-sm font-medium">{t('nav.overview')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/sports/houses" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100">
                          <div className="text-sm font-medium">{t('nav.houses')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li>
                      <Link href="/sports/onboarding" legacyBehavior passHref>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100">
                          <div className="text-sm font-medium">{t('nav.onboarding')}</div>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/blog" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    {t('nav.blog')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    {t('nav.about')}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {user && (
                <NavigationMenuItem>
                  <Link href="/events" legacyBehavior passHref>
                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                      {t('nav.events')}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}

              {user && user.xp_total >= 369 && (
                <NavigationMenuItem>
                  <Link href="/forum" legacyBehavior passHref>
                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                      {t('nav.forum')}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                {LANGUAGES[language]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setLanguage(code as Language)}
                  className={language === code ? 'bg-gray-100' : ''}
                >
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <Link href="/notifications" className="relative">
              <Button variant="ghost" size="sm" className="w-9 px-0" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user.username}</span>
                  <span className="text-xs text-blue-600 font-semibold">{user.xp_total} XP</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href="/notifications">
                  <DropdownMenuItem className="cursor-pointer flex items-center justify-between">
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
                {(user.role === 'Super Admin' || user.role === 'Admin') && (
                  <>
                    <DropdownMenuSeparator />
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 font-semibold hover:from-blue-100 hover:to-cyan-100">
                        <Shield className="mr-2 h-4 w-4" />
                        {t('nav.admin')}
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" onClick={() => setMobileOpen(false)} className="text-lg font-medium">
                  {t('nav.home')}
                </Link>
                <div className="border-t pt-2">
                  <div className="text-sm font-semibold text-gray-500 mb-2">{t('nav.education')}</div>
                  <Link href="/education" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block mb-2">
                    {t('nav.overview')}
                  </Link>
                  <Link href="/education/courses" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block mb-2">
                    {t('nav.courses')}
                  </Link>
                  <Link href="/education/xp" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block mb-2">
                    {t('nav.xp')}
                  </Link>
                  <Link href="/education/leaderboard" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block">
                    {t('nav.leaderboard')}
                  </Link>
                </div>
                <div className="border-t pt-2">
                  <div className="text-sm font-semibold text-gray-500 mb-2">{t('nav.sports')}</div>
                  <Link href="/sports" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block mb-2">
                    {t('nav.overview')}
                  </Link>
                  <Link href="/sports/houses" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block mb-2">
                    {t('nav.houses')}
                  </Link>
                  <Link href="/sports/onboarding" onClick={() => setMobileOpen(false)} className="text-lg pl-4 block">
                    {t('nav.onboarding')}
                  </Link>
                </div>
                <Link href="/blog" onClick={() => setMobileOpen(false)} className="text-lg">
                  {t('nav.blog')}
                </Link>
                <Link href="/about" onClick={() => setMobileOpen(false)} className="text-lg">
                  {t('nav.about')}
                </Link>
                <Link href="/events" onClick={() => setMobileOpen(false)} className="text-lg">
                  {t('nav.events')}
                </Link>
                {user && user.xp_total >= 369 && (
                  <Link href="/forum" onClick={() => setMobileOpen(false)} className="text-lg">
                    {t('nav.forum')}
                  </Link>
                )}

                {user && (
                  <div className="border-t pt-4 mt-4">
                    <div className="text-sm font-semibold text-gray-500 mb-2">
                      {user.username} ({user.xp_total} XP)
                    </div>
                    <Link href="/profile" onClick={() => setMobileOpen(false)} className="text-lg block mb-2">
                      <User className="inline mr-2 h-4 w-4" />
                      {t('nav.profile')}
                    </Link>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="text-lg block mb-2">
                      <LayoutDashboard className="inline mr-2 h-4 w-4" />
                      {t('nav.dashboard')}
                    </Link>
                    <Link href="/notifications" onClick={() => setMobileOpen(false)} className="text-lg block mb-2 flex items-center justify-between">
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
                    {(user.role === 'Super Admin' || user.role === 'Admin') && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="text-lg block mb-2 text-blue-600 font-semibold">
                        <LayoutDashboard className="inline mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <Button onClick={() => { logout(); setMobileOpen(false); }} variant="outline" className="w-full mt-2">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.logout')}
                    </Button>
                  </div>
                )}

                {!user && (
                  <div className="flex flex-col gap-2 mt-4">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">
                        {t('nav.login')}
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
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
