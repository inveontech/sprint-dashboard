'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDashboardStore } from '@/lib/store';

interface IssueData {
  customer: string;
  count: number;
  storyPoints: number;
  percentage: number;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#f43f5e', '#0ea5e9', '#8b5cf6', '#d946ef',
  '#06b6d4', '#f97316', '#eab308', '#22c55e', '#6b7280',
];

export default function WaitingIssuesCharts() {
  const [pmApprovalData, setPmApprovalData] = useState<IssueData[]>([]);
  const [wfsData, setWfsData] = useState<IssueData[]>([]);
  const [pmTotalSP, setPmTotalSP] = useState(0);
  const [wfsTotalSP, setWfsTotalSP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWaitingIssues = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ sprints: '1' });
        // No customer filter - always fetch all customers
        
        const response = await fetch(`/api/jira/sprints?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.sprints && data.sprints.length > 0) {
          const sprint = data.sprints[0];
          
          // Fetch sprint details to get issues with status (no customer filter)
          const detailResponse = await fetch(`/api/jira/sprint/${sprint.id}`);
          const detailData = await detailResponse.json();

          if (detailData.success && detailData.issues) {
            // Filter PM Approval issues
            const pmApprovalIssues = detailData.issues.filter((issue: any) => 
              issue.status?.toLowerCase() === 'pm approval'
            );

            // Filter WFS issues (Waiting for Environment, Waiting Domain, Waiting PM)
            const wfsIssues = detailData.issues.filter((issue: any) => {
              const status = issue.status?.toLowerCase() || '';
              return status === 'waiting for environment' || 
                     status === 'waiting domain' || 
                     status === 'waiting pm';
            });

            // Aggregate by customer for PM Approval
            const pmCustomerMap = new Map<string, { count: number; storyPoints: number }>();
            pmApprovalIssues.forEach((issue: any) => {
              const customer = issue.customer || 'Unknown';
              const current = pmCustomerMap.get(customer) || { count: 0, storyPoints: 0 };
              pmCustomerMap.set(customer, {
                count: current.count + 1,
                storyPoints: current.storyPoints + (issue.storyPoints || 0),
              });
            });

            const pmTotal = pmApprovalIssues.length;
            const pmTotalSP = pmApprovalIssues.reduce((sum: number, issue: any) => sum + (issue.storyPoints || 0), 0);
            const pmChartData: IssueData[] = Array.from(pmCustomerMap.entries())
              .map(([customer, data]) => ({
                customer,
                count: data.count,
                storyPoints: data.storyPoints,
                percentage: pmTotal > 0 ? Math.round((data.count / pmTotal) * 100) : 0,
              }))
              .sort((a, b) => a.customer.localeCompare(b.customer, 'tr', { sensitivity: 'base' }));

            // Aggregate by customer for WFS
            const wfsCustomerMap = new Map<string, { count: number; storyPoints: number }>();
            wfsIssues.forEach((issue: any) => {
              const customer = issue.customer || 'Unknown';
              const current = wfsCustomerMap.get(customer) || { count: 0, storyPoints: 0 };
              wfsCustomerMap.set(customer, {
                count: current.count + 1,
                storyPoints: current.storyPoints + (issue.storyPoints || 0),
              });
            });

            const wfsTotal = wfsIssues.length;
            const wfsTotalSP = wfsIssues.reduce((sum: number, issue: any) => sum + (issue.storyPoints || 0), 0);
            const wfsChartData: IssueData[] = Array.from(wfsCustomerMap.entries())
              .map(([customer, data]) => ({
                customer,
                count: data.count,
                storyPoints: data.storyPoints,
                percentage: wfsTotal > 0 ? Math.round((data.count / wfsTotal) * 100) : 0,
              }))
              .sort((a, b) => a.customer.localeCompare(b.customer, 'tr', { sensitivity: 'base' }));

            setPmApprovalData(pmChartData);
            setWfsData(wfsChartData);
            setPmTotalSP(pmTotalSP);
            setWfsTotalSP(wfsTotalSP);
          }
        }
      } catch (error) {
        console.error('Failed to fetch waiting issues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWaitingIssues();
  }, []); // No dependencies - only fetch once on mount

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">
            {payload[0].payload.customer}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {payload[0].payload.count} issue ({payload[0].payload.percentage}%)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {payload[0].payload.storyPoints} SP
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage}%`}
      </text>
    );
  };

  const renderChart = (data: IssueData[], title: string) => {
    if (data.length === 0) {
      return (
        <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          Veri yok
        </div>
      );
    }

    const chartData = data.map(item => ({
      name: item.customer,
      value: item.count,
      percentage: item.percentage,
      customer: item.customer,
      count: item.count,
      storyPoints: item.storyPoints,
    }));

    return (
      <>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 space-y-2">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {entry.count} ({entry.percentage}%) - {entry.storyPoints} SP
              </span>
            </div>
          ))}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PM Approval - Marka Dağılımı</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Toplam: {pmApprovalData.reduce((sum, item) => sum + item.count, 0)} issue ({pmTotalSP} SP)
          </p>
        </CardHeader>
        <CardContent>
          {renderChart(pmApprovalData, 'PM Approval')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">WFS (Waiting) - Marka Dağılımı</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Toplam: {wfsData.reduce((sum, item) => sum + item.count, 0)} issue ({wfsTotalSP} SP)
          </p>
        </CardHeader>
        <CardContent>
          {renderChart(wfsData, 'WFS')}
        </CardContent>
      </Card>
    </div>
  );
}
