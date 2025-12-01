'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, AlertCircle, Users, XCircle, Settings, Sparkles, TrendingUp, UserCheck, ChevronDown, ChevronRight, LineChart, Home, LogOut, Shield, User, Activity, Layers } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ROLE_NAMES } from '@/lib/permissions';

interface MenuItem {
  title: string;
  href?: string;
  icon: any;
  permission?: string | null;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Ana Sayfa',
    href: '/',
    icon: Home,
    permission: null,
  },
  {
    title: 'Sprint Insights',
    icon: LineChart,
    children: [
      {
        title: 'Sprint Summary',
        href: '/sprint-reports',
        icon: BarChart3,
        permission: 'sprint:read',
      },
      {
        title: 'Sprint Historical Analysis',
        href: '/sprint-comparison',
        icon: TrendingUp,
        permission: 'sprint:read',
      },
      {
        title: 'AI Sprint Analysis',
        href: '/ai-analysis',
        icon: Sparkles,
        permission: 'ai:analyze',
      },
      {
        title: 'Multi-Sprint Backlog',
        href: '/sprint-insights/multi-sprint',
        icon: Layers,
        permission: 'sprint:read',
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
        permission: 'developers:read',
      },
      {
        title: 'Overdue Tasks',
        href: '/overdue-tasks',
        icon: AlertCircle,
        permission: 'sprint:read',
      },
      {
        title: 'Overwork Issues',
        href: '/overwork-issues',
        icon: Activity,
        permission: 'sprint:read',
      },
      {
        title: 'Test Failures',
        href: '/test-failures',
        icon: XCircle,
        permission: 'sprint:read',
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
        permission: 'sprint:read',
      },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings:read',
  },
];

// Pages that viewers can access (restricted list)
const VIEWER_ALLOWED_PAGES = ['/', '/sprint-reports', '/sprint-comparison'];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Sprint Insights', 'Developer Metrics', 'PM Analytics']);

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Check if user has permission for an item
  const hasPermission = (item: MenuItem): boolean => {
    if (!user) return false;
    
    // Viewer role has restricted access
    if (user.role === 'viewer') {
      if (item.href) {
        return VIEWER_ALLOWED_PAGES.includes(item.href);
      }
      // For parent items, check if any child is allowed
      if (item.children) {
        return item.children.some(child => child.href && VIEWER_ALLOWED_PAGES.includes(child.href));
      }
      return false;
    }
    
    // No permission required
    if (!item.permission) return true;
    
    // Check permission
    return user.permissions.includes(item.permission as typeof user.permissions[number]);
  };

  // Filter children based on permissions
  const filterChildren = (children: MenuItem[] | undefined): MenuItem[] => {
    if (!children) return [];
    return children.filter(child => hasPermission(child));
  };

  const isChildActive = (children: MenuItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => 
      pathname === child.href || pathname?.startsWith(child.href + '/')
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pm': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'developer': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'viewer': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    if (!hasPermission(item)) return null;

    const Icon = item.icon;
    const isActive = item.href && (pathname === item.href || pathname?.startsWith(item.href + '/'));
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = filterChildren(item.children);
    const isExpanded = expandedCategories.includes(item.title);
    const childActive = isChildActive(item.children);

    // Skip parent if no visible children
    if (hasChildren && filteredChildren.length === 0) return null;

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleCategory(item.title)}
            className={\`
              w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors
              \${childActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            \`}
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
              {filteredChildren.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        className={\`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
          \${isChild ? 'pl-6' : ''}
          \${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        \`}
      >
        <Icon className="w-5 h-5" />
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

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : user ? (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className={\`text-xs px-2 py-0.5 rounded-full font-medium \${getRoleBadgeColor(user.role)}\`}>
                {ROLE_NAMES[user.role]}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Giriş yapılmadı</p>
          </div>
        )}
        
        {/* Version */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Inveon Sprint Dashboard v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
}
