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
  MessageSquare,
  Award,
  BarChart3,
  Target,
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/blog', label: 'Blog', icon: FileText },
  { href: '/admin/houses', label: 'Houses of Sports', icon: Trophy },
  { href: '/admin/houses/messages', label: 'House Messages', icon: MessageSquare },
  { href: '/admin/houses/pools', label: 'Sport Pools', icon: Layers },
  { href: '/admin/onboarding', label: 'Onboarding', icon: Mail },
  { href: '/admin/xp', label: 'XP Management', icon: Award },
  { href: '/admin/missions', label: 'Missions', icon: Target },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-[calc(100vh-120px)] w-64 flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27] p-6 shadow-[0_30px_65px_rgba(2,10,20,0.55)] md:flex">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#fdd87c]">
          <LayoutDashboard className="h-4 w-4 text-[#fdd87c]" />
          Admin Panel
        </h2>
        <p className="text-xs text-slate-200/80">Ferramentas de gestao</p>
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
                className={`w-full justify-start gap-3 rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-cyan-300/60 hover:bg-cyan-500/10 hover:text-white ${
                  isActive
                    ? 'border-[#fdd87c]/60 bg-gradient-to-r from-[#fdd87c]/20 via-transparent to-transparent text-white shadow-[0_0_25px_rgba(253,216,124,0.35)]'
                    : 'bg-white/5'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-[#fdd87c]' : 'text-cyan-300'
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
