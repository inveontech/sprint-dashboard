'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface SprintMetrics {
  velocity: number;
  completionRate: number;
  bugCount: number;
}

interface Sprint {
  id: number;
  name: string;
  metrics?: SprintMetrics;
}

interface SprintInsightsProps {
  sprints: Sprint[];
}

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  icon: JSX.Element;
}

export default function SprintInsights({ sprints }: SprintInsightsProps) {
  if (!sprints || sprints.length === 0) {
    return null;
  }

  // Calculate insights
  const insights: Insight[] = [];

  // Get metrics
  const velocities = sprints.map(s => s.metrics?.velocity || 0);
  const completions = sprints.map(s => s.metrics?.completionRate || 0);
  const bugs = sprints.map(s => s.metrics?.bugCount || 0);

  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const avgCompletion = completions.reduce((a, b) => a + b, 0) / completions.length;
  const avgBugs = bugs.reduce((a, b) => a + b, 0) / bugs.length;

  const latestVelocity = velocities[0] || 0;
  const latestCompletion = completions[0] || 0;
  const latestBugs = bugs[0] || 0;

  // 1. Velocity Trend Analysis
  if (velocities.length >= 3) {
    const recent3 = velocities.slice(0, 3);
    const previous3 = velocities.slice(3, 6);
    
    if (previous3.length > 0) {
      const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
      const previousAvg = previous3.reduce((a, b) => a + b, 0) / previous3.length;
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (Math.abs(change) > 10) {
        if (change > 0) {
          insights.push({
            type: 'success',
            title: 'Velocity Artışı',
            description: `Son 3 sprintte velocity %${change.toFixed(1)} arttı (${previousAvg.toFixed(0)} SP → ${recentAvg.toFixed(0)} SP). Takım kapasitesi artıyor.`,
            icon: <TrendingUp className="h-5 w-5" />
          });
        } else {
          insights.push({
            type: 'warning',
            title: 'Velocity Düşüşü',
            description: `Son 3 sprintte velocity %${Math.abs(change).toFixed(1)} düştü (${previousAvg.toFixed(0)} SP → ${recentAvg.toFixed(0)} SP). Kapasite kontrolü önerilir.`,
            icon: <TrendingDown className="h-5 w-5" />
          });
        }
      }
    }
  }

  // 2. Completion Rate Analysis
  if (latestCompletion < 70) {
    insights.push({
      type: 'danger',
      title: 'Düşük Tamamlanma Oranı',
      description: `Son sprint %${latestCompletion} tamamlanma oranı ile hedefin altında. Sprint planning gözden geçirilmeli.`,
      icon: <AlertTriangle className="h-5 w-5" />
    });
  } else if (latestCompletion >= 95) {
    insights.push({
      type: 'success',
      title: 'Mükemmel Tamamlanma',
      description: `Son sprint %${latestCompletion} tamamlanma oranı ile hedefi aştı. Takım planlamaya hakim.`,
      icon: <CheckCircle className="h-5 w-5" />
    });
  }

  // 3. Completion Consistency
  const completionVariance = completions.reduce((sum, val) => {
    return sum + Math.pow(val - avgCompletion, 2);
  }, 0) / completions.length;
  const completionStdDev = Math.sqrt(completionVariance);

  if (completionStdDev > 15) {
    insights.push({
      type: 'warning',
      title: 'Değişken Performans',
      description: `Tamamlanma oranları sprintler arası çok değişken (σ=${completionStdDev.toFixed(1)}). Daha tutarlı planlama gerekli.`,
      icon: <AlertTriangle className="h-5 w-5" />
    });
  } else if (completionStdDev < 10 && avgCompletion > 80) {
    insights.push({
      type: 'success',
      title: 'Tutarlı Performans',
      description: `Takım son ${sprints.length} sprintte çok tutarlı (%${avgCompletion.toFixed(0)} ort.). Sprint tahminleri güvenilir.`,
      icon: <CheckCircle className="h-5 w-5" />
    });
  }

  // 4. Bug Trend Analysis
  if (bugs.length >= 3) {
    const recent3Bugs = bugs.slice(0, 3);
    const previous3Bugs = bugs.slice(3, 6);
    
    if (previous3Bugs.length > 0) {
      const recentBugAvg = recent3Bugs.reduce((a, b) => a + b, 0) / recent3Bugs.length;
      const previousBugAvg = previous3Bugs.reduce((a, b) => a + b, 0) / previous3Bugs.length;
      
      if (recentBugAvg > previousBugAvg * 1.3) {
        insights.push({
          type: 'danger',
          title: 'Bug Sayısı Artıyor',
          description: `Son 3 sprintte bug sayısı %${(((recentBugAvg - previousBugAvg) / previousBugAvg) * 100).toFixed(0)} arttı (${previousBugAvg.toFixed(0)} → ${recentBugAvg.toFixed(0)}). Kalite kontrolü güçlendirilmeli.`,
          icon: <AlertTriangle className="h-5 w-5" />
        });
      } else if (recentBugAvg < previousBugAvg * 0.7) {
        insights.push({
          type: 'success',
          title: 'Bug Sayısı Azalıyor',
          description: `Son 3 sprintte bug sayısı %${(((previousBugAvg - recentBugAvg) / previousBugAvg) * 100).toFixed(0)} azaldı. Kalite iyileştirmeleri etkili.`,
          icon: <CheckCircle className="h-5 w-5" />
        });
      }
    }
  }

  // 5. Latest Sprint vs Average
  if (latestVelocity > avgVelocity * 1.2) {
    insights.push({
      type: 'info',
      title: 'Olağanüstü Sprint',
      description: `Son sprint velocity (${latestVelocity} SP), ortalamadan %${(((latestVelocity - avgVelocity) / avgVelocity) * 100).toFixed(0)} yüksek. Bu performans sürdürülebilir mi kontrol edin.`,
      icon: <Lightbulb className="h-5 w-5" />
    });
  } else if (latestVelocity < avgVelocity * 0.8) {
    insights.push({
      type: 'warning',
      title: 'Düşük Sprint Performansı',
      description: `Son sprint velocity (${latestVelocity} SP), ortalamadan %${(((avgVelocity - latestVelocity) / avgVelocity) * 100).toFixed(0)} düşük. Engeller araştırılmalı.`,
      icon: <AlertTriangle className="h-5 w-5" />
    });
  }

  // 6. Bug to Velocity Ratio
  const bugRatio = (latestBugs / latestVelocity) * 100;
  if (latestVelocity > 0 && bugRatio > 15) {
    insights.push({
      type: 'warning',
      title: 'Yüksek Bug Oranı',
      description: `Son sprintte her 100 SP'ye ${bugRatio.toFixed(0)} bug düştü. Code review ve test süreçleri gözden geçirilmeli.`,
      icon: <AlertTriangle className="h-5 w-5" />
    });
  }

  // 7. Recommendations
  const recommendations: Insight[] = [];

  if (avgCompletion < 80) {
    recommendations.push({
      type: 'info',
      title: 'Sprint Planlama Önerisi',
      description: 'Story point tahminlerini daha gerçekçi yapın. Planning poker seanslarını detaylandırın.',
      icon: <Lightbulb className="h-5 w-5" />
    });
  }

  if (avgBugs > 50) {
    recommendations.push({
      type: 'info',
      title: 'Kalite İyileştirme',
      description: 'Test coverage artırılmalı. Code review süreçleri güçlendirilmeli. Otomatik test sayısı artırılabilir.',
      icon: <Lightbulb className="h-5 w-5" />
    });
  }

  if (completionStdDev > 15) {
    recommendations.push({
      type: 'info',
      title: 'Tahmin Tutarlılığı',
      description: 'Sprint retrospective\'lerde tahmin doğruluğu tartışılmalı. Geçmiş sprint verilerine dayalı kapasite planlaması yapın.',
      icon: <Lightbulb className="h-5 w-5" />
    });
  }

  // If no insights, add generic positive message
  if (insights.length === 0 && recommendations.length === 0) {
    insights.push({
      type: 'success',
      title: 'Dengeli Performans',
      description: `Son ${sprints.length} sprint dengeli ve tutarlı. Ortalama ${avgVelocity.toFixed(0)} SP velocity, %${avgCompletion.toFixed(0)} tamamlanma oranı.`,
      icon: <CheckCircle className="h-5 w-5" />
    });
  }

  const getVariantClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800';
      case 'danger':
        return 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800';
      default:
        return '';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprint Analizi ve Öneriler</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Key Insights */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                Önemli Bulgular
              </h3>
              {insights.map((insight, index) => (
                <Alert key={index} className={getVariantClass(insight.type)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{insight.title}</div>
                      <AlertDescription>{insight.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                Öneriler
              </h3>
              {recommendations.map((rec, index) => (
                <Alert key={index} className={getVariantClass(rec.type)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getIconColor(rec.type)}`}>
                      {rec.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{rec.title}</div>
                      <AlertDescription>{rec.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-3">
              Son {sprints.length} Sprint Özeti
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Ort. Velocity</div>
                <div className="text-xl font-bold">{avgVelocity.toFixed(0)} SP</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Ort. Tamamlanma</div>
                <div className="text-xl font-bold">{avgCompletion.toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Ort. Bug</div>
                <div className="text-xl font-bold">{avgBugs.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
