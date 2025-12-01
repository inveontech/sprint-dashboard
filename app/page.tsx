'use client';

import Link from 'next/link';
import { 
  BarChart3, 
  AlertCircle, 
  Users, 
  XCircle, 
  Settings, 
  Sparkles, 
  TrendingUp, 
  UserCheck,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';

const modules = [
  {
    title: 'Sprint Reports',
    description: 'Track active sprint status, task progress, and team velocity in real-time.',
    href: '/sprint-reports',
    icon: BarChart3,
  },
  {
    title: 'Sprint Comparison',
    description: 'Compare historical sprints to identify performance patterns and improvement opportunities.',
    href: '/sprint-comparison',
    icon: TrendingUp,
  },
  {
    title: 'Multi-Sprint Insights',
    description: 'Analyze trends across multiple sprints with comprehensive backlog and issue tracking.',
    href: '/sprint-insights/multi-sprint',
    icon: Layers,
  },
  {
    title: 'AI Analysis',
    description: 'Get intelligent insights and actionable recommendations powered by AI analysis.',
    href: '/ai-analysis',
    icon: Sparkles,
  },
  {
    title: 'Developer Performance',
    description: 'Monitor individual contributor metrics and track development team productivity.',
    href: '/developer-performance',
    icon: Users,
  },
  {
    title: 'PM Dashboard',
    description: 'Project management overview with key metrics and progress indicators.',
    href: '/pm-dashboard',
    icon: UserCheck,
  },
  {
    title: 'Overdue Tasks',
    description: 'Identify and manage overdue items and upcoming deadlines.',
    href: '/overdue-tasks',
    icon: AlertCircle,
  },
  {
    title: 'Overwork Issues',
    description: 'Detect work items exceeding estimates and manage team workload.',
    href: '/overwork-issues',
    icon: Activity,
  },
  {
    title: 'Test Failures',
    description: 'Track failing tests and identify quality assurance issues before deployment.',
    href: '/test-failures',
    icon: XCircle,
  },
  {
    title: 'Settings',
    description: 'Configure dashboard preferences, targets, and notification settings.',
    href: '/settings',
    icon: Settings,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white dark:text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Sprint Dashboard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inveon inCommerce</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Jira Senkronize</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Sprint Management System
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Takım performansını izleyin, sprint kapasitesini optimize edin ve başarılı dağıtımlar için 
            gerçek zamanlı metriklere dayalı karar verin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sprint-reports"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              Sprint Raporuna Git
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ai-analysis"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              AI Analizi
            </Link>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Modules
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Access all essential tools for comprehensive sprint management and team performance tracking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-6 h-6 text-slate-900 dark:text-slate-100" />
                  <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {module.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              © 2025 Inveon inCommerce. Tüm hakları saklıdır.
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Sprint Dashboard v1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

