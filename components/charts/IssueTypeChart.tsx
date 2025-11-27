"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface IssueTypeData {
  issueType: string;
  points: number;
  percentage: number;
}

interface IssueTypeChartProps {
  data: IssueTypeData[];
  title?: string;
}

const COLORS = {
  Bug: '#ef4444',           // red
  'Change Request': '#3b82f6', // blue
  Development: '#10b981',   // green
  Deploy: '#8b5cf6',        // purple
  'Technical Debt': '#f59e0b', // amber
  'Second Level Support': '#ec4899', // pink
  Task: '#06b6d4',          // cyan
  Story: '#14b8a6',         // teal
  'Sub-task': '#f97316',    // orange
  Other: '#6b7280',         // gray
};

export function IssueTypeChart({ data, title }: IssueTypeChartProps) {
  const chartData = data.map(item => ({
    name: item.issueType,
    value: item.points,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">
            {payload[0].name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {payload[0].value} SP ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Hide labels for small slices
    
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

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Veri yok
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Issue Type List */}
      <div className="mt-4 space-y-2">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] || COLORS.Other }}
              />
              <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              {entry.value} SP ({entry.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
