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
  Zap,
  Target,
  Activity,
  Clock,
  CheckCircle2,
  GitBranch,
  Layers
} from 'lucide-react';

const features = [
  {
    title: 'Sprint Raporu',
    description: 'Aktif sprint durumunu, tamamlanan ve devam eden görevleri görüntüleyin.',
    href: '/sprint-reports',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Sprint Geçmişi',
    description: 'Geçmiş sprintleri karşılaştırın ve performans trendlerini analiz edin.',
    href: '/sprint-comparison',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'AI Sprint Analysis',
    description: 'Yapay zeka destekli sprint içgörüleri ve öneriler alın.',
    href: '/ai-analysis',
    icon: Sparkles,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Developer Performans',
    description: 'Geliştirici bazlı sprint başarı oranlarını takip edin.',
    href: '/developer-performance',
    icon: Users,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    title: 'PM Dashboard',
    description: 'Proje yöneticileri için özelleştirilmiş metrikleri görüntüleyin.',
    href: '/pm-dashboard',
    icon: UserCheck,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    title: 'Due Date Takibi',
    description: 'Geciken ve yaklaşan görevleri takip edin.',
    href: '/overdue-tasks',
    icon: AlertCircle,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Test Başarısızlıkları',
    description: 'Başarısız test sonuçlarını ve sorunlu alanları inceleyin.',
    href: '/test-failures',
    icon: XCircle,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    title: 'Ayarlar',
    description: 'Dashboard tercihlerini ve hedefleri yapılandırın.',
    href: '/settings',
    icon: Settings,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    iconColor: 'text-gray-600 dark:text-gray-400',
  },
];

const stats = [
  { label: 'Modül', value: '8+', icon: Layers },
  { label: 'Gerçek Zamanlı', value: 'Jira Sync', icon: Zap },
  { label: 'AI Destekli', value: 'Analiz', icon: Sparkles },
  { label: 'Hedef Takibi', value: 'Aktif', icon: Target },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Header */}
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

            {/* Quick Action Buttons */}
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

          {/* Stats */}
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

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Tüm Özellikler
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Sprint yönetimi için ihtiyacınız olan her şey tek bir yerde
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Hover gradient border effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-sm`}></div>
                <div className="absolute inset-[1px] rounded-2xl bg-white dark:bg-gray-800"></div>
                
                <div className="relative">
                  <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Görüntüle</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-100 mb-4">
            <GitBranch className="w-5 h-5" />
            <span className="text-sm font-medium">Jira ile Senkronize</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ekibinizin sprint performansını optimize edin
          </h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Gerçek zamanlı veriler, AI destekli öneriler ve kapsamlı raporlama ile 
            sprint hedeflerinize daha hızlı ulaşın.
          </p>
          <Link
            href="/sprint-reports"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            Hemen Başla
          </Link>
        </div>
      </div>

      {/* Version Footer */}
      <div className="bg-gray-50 dark:bg-gray-900 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Sprint Dashboard v1.0.0</span>
            </div>
            <div>
              © 2025 Inveon. Tüm hakları saklıdır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

