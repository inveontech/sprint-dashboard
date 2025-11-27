'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IssueTypeChart } from './IssueTypeChart';
import { useDashboardStore } from '@/lib/store';

interface CustomerIssueData {
  customer: string;
  totalPoints: number;
  completedPoints: number;
  issuesByType: Array<{
    issueType: string;
    points: number;
    percentage: number;
  }>;
}

interface CustomerTarget {
  name: string;
  targetSP: number;
  percentage: string;
}

export default function CustomerIssueTypeCharts() {
  const { dateRange, selectedCustomer } = useDashboardStore();
  const [customers, setCustomers] = useState<CustomerIssueData[]>([]);
  const [targets, setTargets] = useState<CustomerTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch customer targets first
        let targetCustomerNames: string[] = [];
        try {
          const targetsResponse = await fetch('/customer-targets.json');
          const targetsData = await targetsResponse.json();
          const targetsArray = Array.isArray(targetsData) ? targetsData : targetsData.customers || [];
          setTargets(targetsArray);
          targetCustomerNames = targetsArray.map((t: any) => t.customer || t.name);
        } catch (err) {
          console.error('Failed to fetch customer targets:', err);
        }
        
        // Fetch customer issues - ONLY for the latest sprint (1)
        const issuesResponse = await fetch(`/api/jira/customer-issues?sprints=1`);
        const issuesData = await issuesResponse.json();
        
        // Filter customers to only show those with targets
        const filteredCustomers = (issuesData.customers || []).filter((c: CustomerIssueData) => 
          targetCustomerNames.includes(c.customer)
        );
        
        setCustomers(filteredCustomers);
      } catch (error) {
        console.error('Failed to fetch customer issues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);
  
  const getCustomerTarget = (customerName: string): number | null => {
    const target = targets.find((t: any) => (t.name || t.customer) === customerName);
    return target ? target.targetSP : null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Marka verisi bulunamadı
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {customers
        .filter(customer => !selectedCustomer || customer.customer === selectedCustomer)
        .map((customer) => {
        const targetSP = getCustomerTarget(customer.customer);
        // Compare latest sprint's completed points with single-sprint target
        const targetProgress = targetSP ? Math.round((customer.completedPoints / targetSP) * 100) : null;
        
        return (
          <Card key={customer.customer}>
            <CardHeader>
              <CardTitle className="text-lg">{customer.customer}</CardTitle>
              <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Done SP (Son Sprint):</span>
                  <span className="font-medium">{customer.completedPoints}</span>
                </div>
                {targetSP && targetProgress !== null && (
                  <>
                    <div className="flex justify-between">
                      <span>Sprint Hedefi:</span>
                      <span className="font-medium">{targetSP} SP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sprint Başarısı:</span>
                      <span className={`font-medium ${
                        targetProgress >= 100 
                          ? 'text-green-600 dark:text-green-400' 
                          : targetProgress >= 80 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {targetProgress}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <IssueTypeChart 
                data={customer.issuesByType}
                title="Done Issue Type Dağılımı (SP)"
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
