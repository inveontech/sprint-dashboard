'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Target, Bug } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import MetricCard from '@/components/dashboard/MetricCard';
import CustomerSelector from '@/components/dashboard/CustomerSelector';
import RefreshButton from '@/components/dashboard/RefreshButton';
import VelocityChart from '@/components/charts/VelocityChart';
import CompletionChart from '@/components/charts/CompletionChart';
import SuccessTrendChart from '@/components/charts/SuccessTrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

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
  const total = sprints.reduce((sum, sprint) => sum + (sprint.metrics?.bugCount || 0), 0);
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
        
        const response = await fetch(`/api/jira/sprints?${params.toString()}`);
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
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sprint Geçmişi ve Karşılaştırma
            </h1>
            <RefreshButton />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <CustomerSelector />
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
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
        <div className="max-w-7xl mx-auto px-4 py-8">
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
        <main className="max-w-7xl mx-auto px-4 py-8">
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
            />
          </div>

          {/* Success Trend Chart - Use all 6 sprints */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Son 6 Sprint Başarı Trendi{selectedCustomer ? ` - ${selectedCustomer}` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <SuccessTrendChart sprints={sprints} selectedCustomer={selectedCustomer} />
            </CardContent>
          </Card>

          {/* Velocity and Completion Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Velocity Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <VelocityChart sprints={sprints} selectedCustomer={selectedCustomer} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tamamlanma Oranı</CardTitle>
              </CardHeader>
              <CardContent>
                <CompletionChart sprints={sprints} selectedCustomer={selectedCustomer} />
              </CardContent>
            </Card>
          </div>
        </main>
      )}
    </div>
  );
}
