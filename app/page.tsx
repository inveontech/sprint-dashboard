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
    description: 'Aktif sprint durumunu, görev ilerleme durumunu ve takım hızını gerçek zamanlı olarak izleyin.',
    href: '/sprint-reports',
    icon: BarChart3,
  },
  {
    title: 'Sprint Comparison',
    description: 'Geçmiş sprintleri karşılaştırarak performans trendlerini ve iyileştirme fırsatlarını belirleyin.',
    href: '/sprint-comparison',
    icon: TrendingUp,
  },
  {
    title: 'Multi-Sprint Insights',
    description: 'Birden fazla sprint arasında trendleri analiz edin ve detaylı backlog takibi yapın.',
    href: '/sprint-insights/multi-sprint',
    icon: Layers,
  },
  {
    title: 'AI Analysis',
    description: 'Yapay zeka tarafından desteklenen akıllı öneriler ve uygulanabilir içgörüler alın.',
    href: '/ai-analysis',
    icon: Sparkles,
  },
  {
    title: 'Developer Performance',
    description: 'Geliştirici bazlı performans metriklerini izleyin ve takım üretkenliğini ölçün.',
    href: '/developer-performance',
    icon: Users,
  },
  {
    title: 'PM Dashboard',
    description: 'Proje yönetim özeti, önemli metrikler ve ilerleme göstergelerine erişin.',
    href: '/pm-dashboard',
    icon: UserCheck,
  },
  {
    title: 'Overdue Tasks',
    description: 'Geciken görevleri belirleyin ve yaklaşan son tarihleri yönetin.',
    href: '/overdue-tasks',
    icon: AlertCircle,
  },
  {
    title: 'Overwork Issues',
    description: 'Tahminini aşan görevleri tespit edin ve takım iş yükünü yönetin.',
    href: '/overwork-issues',
    icon: Activity,
  },
  {
    title: 'Test Failures',
    description: 'Başarısız testleri takip edin ve dağıtımdan önce kalite sorunlarını belirleyin.',
    href: '/test-failures',
    icon: XCircle,
  },
  {
    title: 'Settings',
    description: 'Dashboard tercihlerini, hedeflerini ve bildirim ayarlarını yapılandırın.',
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
        </div>
      </section>

      {/* Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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

