'use client';

import { useEffect, useState, useRef } from 'react';
import { Calendar, TrendingUp, Target, Bug } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import MetricCard from '@/components/dashboard/MetricCard';
import CustomerSelector from '@/components/dashboard/CustomerSelector';
import SprintSelector from '@/components/dashboard/SprintSelector';
import { PageHeader } from '@/components/layout/PageHeader';
// DateRangeTabs removed
import RefreshButton from '@/components/dashboard/RefreshButton';
import VelocityChart from '@/components/charts/VelocityChart';
import CompletionChart from '@/components/charts/CompletionChart';
import MonthlyTrend from '@/components/charts/MonthlyTrend';
import CustomerIssueTypeCharts from '@/components/charts/CustomerIssueTypeCharts';
import SuccessTrendChart from '@/components/charts/SuccessTrendChart';
import WaitingIssuesCharts from '@/components/charts/WaitingIssuesCharts';
import SprintComparisonCards from '@/components/dashboard/SprintComparisonCards';
import { EnvWarningBanner } from '@/components/dashboard/EnvWarningBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Helper functions
function calculateAvgVelocity(sprints: any[]): number {
  if (sprints.length === 0) return 0;
  const total = sprints.reduce((sum, sprint) => sum + (sprint.metrics?.velocity || 0), 0);
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

export default function DashboardPage() {
  const {
    selectedCustomer,
    clearError,
    customers: storeCustomers,
    setCustomers: setStoreCustomers,
    setCustomer,
    fetchSprintDetails,
    analyzeSprint,
  } = useDashboardStore();

  const [sprints, setSprints] = useState<any[]>([]);
  const [allSprints, setAllSprints] = useState<any[]>([]); // All available sprints for selector
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(''); // Selected sprint ID
  const [envStatus, setEnvStatus] = useState<any>(null); // Environment status
  const allCustomersRef = useRef<string[]>([]);

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  // Fetch sprints based on selected sprint ID
  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch last 6 sprints for selector (only once)
        if (allSprints.length === 0) {
          const allSprintsResponse = await fetch('/api/jira/sprints?sprints=6');
          const allSprintsData = await allSprintsResponse.json();
          
          // Store env status for UI warnings
          if (allSprintsData.envStatus) {
            setEnvStatus(allSprintsData.envStatus);
          }
          
          if (allSprintsData.sprints && allSprintsData.sprints.length > 0) {
            setAllSprints(allSprintsData.sprints);
            // Set default selection to latest sprint if not selected yet
            if (!selectedSprintId && allSprintsData.sprints[0]) {
              setSelectedSprintId(allSprintsData.sprints[0].id.toString());
              return; // This will trigger another useEffect call
            }
          }
        }
        
        // If no sprint selected yet, wait for default selection
        if (!selectedSprintId) {
          setLoading(false);
          return;
        }
        
        // Fetch only the selected sprint
        const params = new URLSearchParams();
        if (selectedCustomer) {
          params.append('customer', selectedCustomer);
        }
        
        // Use sprint/[id] endpoint to get specific sprint data
        const response = await fetch(`/api/jira/sprint/${selectedSprintId}?${params.toString()}`);
        const data = await response.json();
        
        console.log('API Response for sprint', selectedSprintId, ':', data);
        
        // Set the single sprint data
        if (data.success && data.sprint) {
          const sprintData = {
            ...data.sprint,
            metrics: data.metrics,
            issues: data.issues,
            issueTypes: data.issueTypes,
            customers: data.customers,
            comparison: data.comparison
          };
          console.log(`Fetched sprint: ${sprintData.name}, Completion=${sprintData.metrics?.completionRate}%, Done=${sprintData.metrics?.completedPoints}SP, Target=${sprintData.metrics?.targetPoints}SP`);
          setSprints([sprintData]);
          
          // Cache all customers on first load
          if (allCustomersRef.current.length === 0 && data.customers) {
            // Filter customers to only show those with targets
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
            // Use cached customer list
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
  }, [selectedCustomer, selectedSprintId, allSprints.length]);

  const selectSprint = async (sprintId: number) => {
    try {
      console.log('Analyzing sprint:', sprintId);
      // Find the sprint in our current data
      const sprint = sprints.find(s => s.id === sprintId);
      if (!sprint) {
        console.error('Sprint not found:', sprintId);
        return;
      }
      
      // Call analyze directly with the sprint data we already have
      await analyzeSprint(sprintId);
    } catch (error) {
      console.error('Error in selectSprint:', error);
    }
  };

  const viewSprintDetails = (sprintId: number) => {
    const params = new URLSearchParams();
    if (selectedCustomer) {
      params.append('customer', selectedCustomer);
    }
    const url = params.toString() 
      ? `/sprint-details/${sprintId}?${params.toString()}`
      : `/sprint-details/${sprintId}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <PageHeader title="Sprint Reports" description="Aktif sprint durumunu ve görev ilerleme durumunu görüntüleyin" />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <SprintSelector
              sprints={allSprints}
              selectedMode={selectedSprintId}
              onModeChange={setSelectedSprintId}
              loading={loading}
            />
            <div className="h-6 w-px bg-gray-300" />
            <CustomerSelector />
          </div>
        </div>
      </header>

      {/* Environment Warnings */}
      <div className="px-6 pt-4">
        <EnvWarningBanner envStatus={envStatus} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-6 py-8">
          <div className="space-y-6">
            {/* Loading Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
            {/* Loading Charts */}
            <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
              Sprint verileri yükleniyor...
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
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

      {/* Main Content */}
      {!loading && !error && (
        <main className="px-6 py-8">
              {/* Current Sprint Overview */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Son Sprint Detayları{selectedCustomer ? ` - ${selectedCustomer}` : ''}</h2>
                <SprintComparisonCards sprints={sprints} selectedCustomer={selectedCustomer ?? undefined} />
              </div>

              {/* Waiting Issues Charts - PM Approval and WFS - Only show when no customer filter */}
              {!selectedCustomer && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Bekleyen İşler - PM Approval ve WFS</h2>
                  <WaitingIssuesCharts />
                </div>
              )}

              {/* Customer Issue Type Distribution */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Marka Bazlı Issue Type Dağılımı (Done)</h2>
                <CustomerIssueTypeCharts />
              </div>

              {/* Sprint List Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Sprint History{selectedCustomer ? ` - ${selectedCustomer}` : ''}</CardTitle>
                </CardHeader>
                <CardContent>
                  {sprints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No sprints found. Try adjusting your filters.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sprint</TableHead>
                          {!selectedCustomer && <TableHead>Customer</TableHead>}
                          <TableHead>Date</TableHead>
                          <TableHead>Velocity</TableHead>
                          <TableHead>Completion</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sprints.slice(0, 1).map((sprint) => (
                          <TableRow
                            key={sprint.id}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <TableCell className="font-medium">{sprint.name}</TableCell>
                            {!selectedCustomer && (
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {sprint.customers && sprint.customers.length > 0 ? (
                                    sprint.customers.slice(0, 3).map((cust: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {cust}
                                      </Badge>
                                    ))
                                  ) : sprint.metrics?.customers && sprint.metrics.customers.length > 0 ? (
                                    sprint.metrics.customers.slice(0, 3).map((cust: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {cust}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="secondary">{sprint.customer || 'N/A'}</Badge>
                                  )}
                                  {((sprint.customers?.length || 0) > 3 || (sprint.metrics?.customers?.length || 0) > 3) && (
                                    <Badge variant="outline" className="text-xs">
                                      +{Math.max(sprint.customers?.length || 0, sprint.metrics?.customers?.length || 0) - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              {sprint.endDate ? formatDate(sprint.endDate, 'dd MMM yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>{sprint.metrics?.velocity || 0} SP</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={sprint.metrics?.completionRate || 0}
                                  className="w-24"
                                />
                                <span className="text-sm">
                                  {sprint.metrics?.completionRate || 0}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => viewSprintDetails(sprint.id)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
        </main>
      )}
    </div>
  );
}
