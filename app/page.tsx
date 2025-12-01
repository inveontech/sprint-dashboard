'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
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
  Clock,
  CheckCircle2,
  GitBranch,
  Layers,
  LogIn,
  UserPlus,
  LogOut,
  User
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

const stats = [
  { icon: Clock, value: 'Real-time', label: 'Jira Sync' },
  { icon: CheckCircle2, value: 'AI', label: 'Powered' },
  { icon: GitBranch, value: '10+', label: 'Modül' },
  { icon: Users, value: 'Team', label: 'Analytics' },
];

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Auth Header */}
      <div className="absolute top-0 right-0 z-20 p-4">
        {isLoading ? (
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
        ) : user ? (
          <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email.split('@')[0]}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Giriş</span>
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Kayıt Ol</span>
            </Link>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Activity className="w-4 h-4" />
              <span>Inveon inCommerce Team</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Sprint & Developer
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Analytics Dashboard
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Jira entegrasyonu ile sprint performansınızı takip edin, AI destekli analizlerle 
              içgörüler elde edin ve ekip verimliliğinizi artırın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sprint-reports"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                <BarChart3 className="w-5 h-5" />
                Sprint Raporuna Git
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/ai-analysis"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Analizi Dene
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 text-center border border-gray-200/50 dark:border-gray-700/50"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Modüller</h2>
          <p className="text-gray-600 dark:text-gray-400">Sprint yönetimi için gerekli tüm araçlara erişim sağlayın</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
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
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>© 2025 Inveon inCommerce. Tüm hakları saklıdır.</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">Sprint Dashboard v1.0.0</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
