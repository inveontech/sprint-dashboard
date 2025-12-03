'use client';

import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Target, Bug } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { fetchWithAuth } from '@/lib/api-client';
import MetricCard from '@/components/dashboard/MetricCard';
import CustomerSelector from '@/components/dashboard/CustomerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';

// Lazy loaded chart components
const VelocityChart = lazy(() => import('@/components/charts/VelocityChart'));
const CompletionChart = lazy(() => import('@/components/charts/CompletionChart'));
const SuccessTrendChart = lazy(() => import('@/components/charts/SuccessTrendChart'));

// Helper functions
function calculateAvgVelocity(sprints: any[]): number {
  if (sprints.length === 0) return 0;
  const total = sprints.reduce((sum, sprint) => sum + (sprint.metrics?.completedPoints || sprint.metrics?.velocity || 0), 0);
  return Math.round(total / sprints.length);
}

function calculateAvgCompletion(sprints: any[]): number {
  if (sprints.length === 0) return 0;
  const total = sprints.reduce((sum, sprint) => sum + (sprint.metrics?.completionRate || 0), 0);
  return Math.round(total / sprints.length);
}

function calculateAvgBugs(sprints: any[]): number {
  if (sprints.length === 0) return 0;
  const total = sprints.reduce((sum, sprint) => {
    // Get Bug SP from issueTypes if available
    const bugType = sprint.issueTypes?.find((t: any) => t.type === 'Bug');
    return sum + (bugType?.storyPoints || 0);
  }, 0);
  return Math.round(total / sprints.length);
}

export default function SprintComparisonPage() {
  const {
    selectedCustomer,
    clearError,
    customers: storeCustomers,
    setCustomers: setStoreCustomers,
    setCustomer,
  } = useDashboardStore();

  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allCustomersRef = useRef<string[]>([]);

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  // Fetch last 6 sprints
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams({ sprints: '6' });
        if (selectedCustomer) {
          params.append('customer', selectedCustomer);
        }
        
        const response = await fetchWithAuth(`/api/jira/sprints?${params.toString()}`);
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.sprints && data.sprints.length > 0) {
          console.log('Fetched sprints:', data.sprints.length);
          
          // Debug sprint metrics
          data.sprints.forEach((sprint: any, idx: number) => {
            console.log(`Sprint ${idx}: ${sprint.name}, Velocity=${sprint.metrics?.completedPoints || sprint.metrics?.velocity || 0}, Completion=${sprint.metrics?.completionRate || 0}%, Bugs=${sprint.metrics?.bugCount || 0}`);
          });
          
          setSprints(data.sprints);
          
          // Cache all customers on first load
          if (allCustomersRef.current.length === 0 && data.customers) {
            const customerTargets = await fetch('/customer-targets.json').then(r => r.json());
            const targetCustomers = Array.isArray(customerTargets) 
              ? customerTargets.map((c: any) => c.customer || c.name)
              : (customerTargets.customers || []).map((c: any) => c.customer || c.name);
            
            const filteredCustomers = (data.customers || []).filter((c: string) => 
              targetCustomers.includes(c)
            );
            
            allCustomersRef.current = filteredCustomers;
            setStoreCustomers(filteredCustomers);
          } else {
            setStoreCustomers(allCustomersRef.current);
          }
          
          setLoading(false);
        } else {
          setLoading(false);
          setError(data.error || 'Failed to fetch sprints');
        }
      } catch (error: any) {
        console.error('Failed to fetch sprints:', error);
        setLoading(false);
        setError(error.message || 'Failed to fetch sprints');
      }
    };
    
    fetchSprints();
  }, [selectedCustomer]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <PageHeader title="Sprint Comparison" />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <CustomerSelector />
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="px-6 py-4">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={clearError}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="px-6 py-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
              Sprint verileri yükleniyor...
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <main className="px-6 py-8">
          <h2 className="text-xl font-bold mb-6">Son 6 Sprint Karşılaştırması{selectedCustomer ? ` - ${selectedCustomer}` : ''}</h2>
          
          {/* Metrics Row - 3 cards - Use all 6 sprints for averages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <MetricCard
              title="Avg Velocity"
              value={calculateAvgVelocity(sprints)}
              icon={<TrendingUp className="h-4 w-4" />}
              suffix=" SP"
            />
            <MetricCard
              title="Avg Completion"
              value={calculateAvgCompletion(sprints)}
              icon={<Target className="h-4 w-4" />}
              suffix="%"
            />
            <MetricCard
              title="Avg Bugs"
              value={calculateAvgBugs(sprints)}
              icon={<Bug className="h-4 w-4" />}
              suffix=" SP"
            />
          </div>

          {/* Success Trend Chart - Use all 6 sprints */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Son 6 Sprint Başarı Trendi{selectedCustomer ? ` - ${selectedCustomer}` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-500">Grafik yükleniyor...</div>}>
                <SuccessTrendChart sprints={sprints} selectedCustomer={selectedCustomer} />
              </Suspense>
            </CardContent>
            <div className="px-6 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t pt-3">
                Son 6 sprintin başarı oranı trendi. Tamamlanan SP / Hedeflenen SP formülü ile hesaplanır.
              </p>
            </div>
          </Card>

          {/* Velocity and Completion Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Velocity Trendi</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-500">Grafik yükleniyor...</div>}>
                  <VelocityChart sprints={sprints} selectedCustomer={selectedCustomer} />
                </Suspense>
              </CardContent>
              <div className="px-6 pb-4 mt-auto">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t pt-3">
                  Sprint bazında planlanan ve tamamlanan story point değerlerini gösterir.
                </p>
              </div>
            </Card>
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Tamamlanma Oranı</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-gray-500">Grafik yükleniyor...</div>}>
                  <CompletionChart sprints={sprints} selectedCustomer={selectedCustomer} />
                </Suspense>
              </CardContent>
              <div className="px-6 pb-4 mt-auto">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t pt-3">
                  Sprint bazında tamamlanma oranını (%) gösterir.
                </p>
              </div>
            </Card>
          </div>
        </main>
      )}
    </div>
  );
}
