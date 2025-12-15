'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Trophy,
  Mail,
  MessageCircle,
  Award,
  BarChart3,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/blog', label: 'Blog', icon: FileText },
  { href: '/admin/houses', label: 'Houses of Sports', icon: Trophy },
  { href: '/admin/onboarding', label: 'Onboarding', icon: Mail },
  { href: '/admin/forum', label: 'Forum', icon: MessageCircle },
  { href: '/admin/xp', label: 'XP Management', icon: Award },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings/permissions', label: 'Permissions', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-[calc(100vh-120px)] w-64 flex-col gap-6 border-r border-white/10 bg-[#05212b] p-6 md:flex">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">
          <LayoutDashboard className="h-4 w-4 text-cyan-300" />
          Admin Panel
        </h2>
        <p className="text-xs text-slate-400">Ferramentas de gestao</p>
      </div>

      <nav className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="outline"
                className={`w-full justify-start gap-3 border-white/30 text-white transition hover:border-cyan-300/40 hover:text-cyan-300 ${
                  isActive
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-white' : 'text-cyan-300'
                  }`}
                />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
