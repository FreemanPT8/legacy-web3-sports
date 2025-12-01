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
  {
    href: '/admin',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/admin/courses',
    label: 'Courses',
    icon: BookOpen,
  },
  {
    href: '/admin/blog',
    label: 'Blog',
    icon: FileText,
  },
  {
    href: '/admin/houses',
    label: 'Houses of Sports',
    icon: Trophy,
  },
  {
    href: '/admin/onboarding',
    label: 'Onboarding',
    icon: Mail,
  },
  {
    href: '/admin/forum',
    label: 'Forum',
    icon: MessageCircle,
  },
  {
    href: '/admin/xp',
    label: 'XP Management',
    icon: Award,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    href: '/admin/settings/permissions',
    label: 'Permissions',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        p-6
        hidden md:flex flex-col gap-6
        sticky top-0 h-[calc(100vh-120px)]
      "
    >
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <LayoutDashboard className="h-5 w-5 text-blue-600" />
          Admin Panel
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ferramentas de gestão
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' &&
              pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`
                  w-full justify-start gap-2
                  ${isActive ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                `}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
