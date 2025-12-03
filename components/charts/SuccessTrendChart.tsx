'use client';

import { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface Sprint {
  id: number;
  name: string;
  metrics?: {
    completionRate?: number;
    completedPoints?: number;
    velocity?: number;
    totalPoints?: number;
    targetPoints?: number;
  };
}

interface SprintTarget {
  sprintId: number;
  sprintName: string;
  targetPoints: number;
}

interface SuccessTrendChartProps {
  sprints: Sprint[];
  selectedCustomer?: string | null;
}

export default function SuccessTrendChart({ sprints, selectedCustomer }: SuccessTrendChartProps) {
  const [targets, setTargets] = useState<SprintTarget[]>([]);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const response = await fetch('/api/settings/sprint-targets');
        const data = await response.json();
        // API returns { success: true, targets: [...] }
        setTargets(Array.isArray(data.targets) ? data.targets : (Array.isArray(data) ? data : []));
      } catch (error) {
        console.error('Failed to fetch sprint targets:', error);
      }
    };
    fetchTargets();
  }, []);

  const chartData = useMemo(() => {
    console.log('SuccessTrendChart - Received sprints:', sprints.length);
    // Use all sprints passed (should be 6)
    return sprints
      .slice(0, 6)
      .reverse()
      .map((sprint) => {
        // Find target for this sprint
        const target = targets.find(t => t.sprintId === sprint.id);
        const targetPoints = target?.targetPoints || sprint.metrics?.targetPoints || 0;
        const completedPoints = sprint.metrics?.completedPoints || sprint.metrics?.velocity || 0;
        const totalPoints = sprint.metrics?.totalPoints || 0;
        
        // Calculate success rate: Completed SP / Target SP (or Total SP if no target)
        let successRate = 0;
        if (targetPoints > 0) {
          successRate = Math.round((completedPoints / targetPoints) * 100);
        } else if (totalPoints > 0) {
          // Fallback: use total points if no target
          successRate = Math.round((completedPoints / totalPoints) * 100);
        }
        
        console.log(`Sprint ${sprint.name}: Completed=${completedPoints}, Target=${targetPoints}, Total=${totalPoints}, Success=${successRate}%`);
        
        return {
          name: sprint.name.split('|')[1]?.trim() || sprint.name,
          success: Math.min(successRate, 100), // Cap at 100%
          completed: completedPoints,
          target: targetPoints,
        };
      });
  }, [sprints, targets]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400">Sprint Başarısı:</span>{' '}
            <span className="font-medium">{data.success}%</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tamamlanan: {data.completed} SP / Hedef: {data.target} SP
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
    <div>
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
            domain={[0, 'auto']}
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
    </div>
  );
}
