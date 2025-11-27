'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface Sprint {
  id: number;
  name: string;
  customer?: string;
  metrics?: {
    completionRate: number;
    completedPoints: number;
    totalPoints: number;
  };
}

interface CompletionChartProps {
  sprints: Sprint[];
  selectedCustomer?: string | null;
}

const formatSprintName = (name: string) => {
  const parts = name.split('|');
  if (parts.length === 2) {
    const date = parts[0].trim().split('.').slice(1).join('.');
    const sprintNum = parts[1].trim().replace('Sprint ', 'S');
    return `${date} ${sprintNum}`;
  }
  return name.substring(0, 15);
};

export default function CompletionChart({ sprints, selectedCustomer }: CompletionChartProps) {
  const filteredSprints = selectedCustomer
    ? sprints.filter((s) => s.customer === selectedCustomer)
    : sprints;
  const data = filteredSprints.slice(0, 10).reverse().map(sprint => ({
    name: formatSprintName(sprint.name),
    rate: sprint.metrics?.completionRate || 0,
    customer: sprint.customer || 'Unknown',
    completed: sprint.metrics?.completedPoints || 0,
    total: sprint.metrics?.totalPoints || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
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
          domain={[0, 100]}
          label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
          formatter={(value: any, name: any, props: any) => {
            if (name === 'rate') {
              return [
                `${value}% (${props.payload.completed}/${props.payload.total} SP)`,
                'Completion Rate'
              ];
            }
            return [value, name];
          }}
        />
        <ReferenceLine 
          y={80} 
          stroke="#666" 
          strokeDasharray="3 3" 
          label={{ value: 'Target 80%', position: 'right' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="rate" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Completion Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

