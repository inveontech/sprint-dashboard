'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, AlertCircle, Users, XCircle, Settings, Sparkles, TrendingUp, UserCheck } from 'lucide-react';

const menuItems = [
  {
    title: 'Sprint Raporu',
    href: '/sprint-reports',
    icon: BarChart3,
  },
  {
    title: 'Sprint Geçmişi ve Karşılaştırma',
    href: '/sprint-comparison',
    icon: TrendingUp,
  },
  {
    title: 'AI Sprint Analizi',
    href: '/ai-analysis',
    icon: Sparkles,
  },
  {
    title: 'Developer Sprint Başarıları',
    href: '/developer-performance',
    icon: Users,
  },
  {
    title: 'PM Dashboard',
    href: '/pm-dashboard',
    icon: UserCheck,
  },
  {
    title: 'Due Date',
    href: '/overdue-tasks',
    icon: AlertCircle,
  },
  {
    title: 'Test Failed',
    href: '/test-failures',
    icon: XCircle,
  },
  {
    title: 'Ayarlar',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sprint & Developer Analytics
        </h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Inveon Sprint Dashboard</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
