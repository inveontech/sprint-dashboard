'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, AlertCircle, Users, XCircle, Settings, Sparkles, TrendingUp, UserCheck, ChevronDown, ChevronRight, LineChart } from 'lucide-react';

interface MenuItem {
  title: string;
  href?: string;
  icon: any;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Sprint Insights',
    icon: LineChart,
    children: [
      {
        title: 'Sprint Summary',
        href: '/sprint-reports',
        icon: BarChart3,
      },
      {
        title: 'Sprint Historical Analysis',
        href: '/sprint-comparison',
        icon: TrendingUp,
      },
      {
        title: 'AI Sprint Analysis',
        href: '/ai-analysis',
        icon: Sparkles,
      },
      {
        title: 'Multi-Sprint Backlog',
        href: '/sprint-insights/multi-sprint',
        icon: AlertCircle,
      },
    ],
  },
  {
    title: 'Developer Metrics',
    icon: Users,
    children: [
      {
        title: 'Developer Performance',
        href: '/developer-performance',
        icon: Users,
      },
      {
        title: 'Overdue Tasks',
        href: '/overdue-tasks',
        icon: AlertCircle,
      },
      {
        title: 'Overwork Issues',
        href: '/overwork-issues',
        icon: AlertCircle,
      },
      {
        title: 'Test Failures',
        href: '/test-failures',
        icon: XCircle,
      },
    ],
  },
  {
    title: 'PM Analytics',
    icon: UserCheck,
    children: [
      {
        title: 'PM Dashboard',
        href: '/pm-dashboard',
        icon: UserCheck,
      },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Sprint Insights', 'Developer Metrics', 'PM Analytics']);

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isChildActive = (children: MenuItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => 
      pathname === child.href || pathname?.startsWith(child.href + '/')
    );
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const Icon = item.icon;
    const isActive = item.href && (pathname === item.href || pathname?.startsWith(item.href + '/'));
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedCategories.includes(item.title);
    const childActive = isChildActive(item.children);

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleCategory(item.title)}
            className={`
              w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors
              ${childActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <span>{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
          ${isChild ? 'pl-6' : ''}
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
      >
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sprint Management System
        </h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Sprint Management System</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
