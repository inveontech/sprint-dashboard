'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardStore } from '@/lib/store';

interface Sprint {
  id: number;
  name: string;
  completeDate?: string;
  customers?: string[];
  customer?: string;
  metrics?: {
    completionRate: number;
  };
}

interface MonthlyTrendProps {
  sprints: Sprint[];
}

const COLORS = [
  '#0066FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFAAA7'
];

export default function MonthlyTrend({ sprints }: MonthlyTrendProps) {
  const { dateRange } = useDashboardStore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [uniqueCustomers, setUniqueCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerTrends = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jira/customer-trends?sprints=${dateRange}`);
        const data = await response.json();
        
        if (data.sprints) {
          // Transform data for chart
          const chartData = data.sprints.map((sprint: any) => {
            const dataPoint: any = {
              name: sprint.name.split('|')[0].trim()
            };
            Object.entries(sprint.customerRates).forEach(([customer, rate]) => {
              dataPoint[customer] = rate;
            });
            return dataPoint;
          }).reverse(); // Most recent last
          
          // Get unique customers
          const customersSet = new Set<string>();
          data.sprints.forEach((sprint: any) => {
            Object.keys(sprint.customerRates).forEach(customer => customersSet.add(customer));
          });
          
          setChartData(chartData);
          setUniqueCustomers(Array.from(customersSet));
        }
      } catch (error) {
        console.error('Failed to fetch customer trends:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sprints.length > 0) {
      fetchCustomerTrends();
    }
  }, [sprints, dateRange]);

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        Veri bulunamadı
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            dataKey="name" 
            className="text-xs"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            className="text-xs"
            label={{ value: 'Hedefe Ulaşma %', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: any, name: any) => [`${value}%`, name]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          {uniqueCustomers.map((customer, index) => (
            <Line
              key={customer}
              type="monotone"
              dataKey={customer}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

