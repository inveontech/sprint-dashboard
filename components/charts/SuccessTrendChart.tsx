'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface Sprint {
  id: number;
  name: string;
  metrics?: {
    completionRate?: number;
  };
}

interface SuccessTrendChartProps {
  sprints: Sprint[];
  selectedCustomer?: string | null;
}

export default function SuccessTrendChart({ sprints, selectedCustomer }: SuccessTrendChartProps) {
  const chartData = useMemo(() => {
    console.log('SuccessTrendChart - Received sprints:', sprints.length);
    // Use all sprints passed (should be 6)
    return sprints
      .slice(0, 6)
      .reverse()
      .map((sprint) => {
        const successRate = sprint.metrics?.completionRate || 0;
        return {
          name: sprint.name.split('|')[1]?.trim() || sprint.name,
          success: successRate,
        };
      });
  }, [sprints]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400">Sprint Başarısı:</span>{' '}
            <span className="font-medium">{payload[0]?.value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Veri yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          label={{ value: 'Sprint Başarısı (%)', angle: -90, position: 'insideLeft' }}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="success" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Sprint Başarısı (%)"
          dot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
