'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface VelocityChartProps {
  sprints: any[];
  selectedCustomer?: string | null;
}

// Format sprint name: "10.20 | Sprint 39" → "10.20 S39"
function formatSprintName(name: string): string {
  if (!name) return '';
  
  // Split by "|" if exists
  const parts = name.split('|').map(p => p.trim());
  
  if (parts.length > 1) {
    // Format: "10.20 | Sprint 39" → "10.20 S39"
    const datePart = parts[0];
    const sprintPart = parts[1];
    
    // Extract sprint number from "Sprint 39" → "S39"
    const sprintMatch = sprintPart.match(/sprint\s*(\d+)/i);
    if (sprintMatch) {
      return `${datePart} S${sprintMatch[1]}`;
    }
    return `${datePart} ${sprintPart.substring(0, 10)}`;
  }
  
  // If no "|", try to extract date and sprint number
  const sprintMatch = name.match(/(\d+\.\d+).*?sprint\s*(\d+)/i);
  if (sprintMatch) {
    return `${sprintMatch[1]} S${sprintMatch[2]}`;
  }
  
  // Fallback: return first 15 chars
  return name.substring(0, 15);
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const planned = data.planned || 0;
    const completed = data.completed || 0;
    const delta = completed - planned;
    const customer = data.customer || 'N/A';

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer: {customer}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400">Total SP:</span>{' '}
            <span className="font-medium">{data.total} SP</span>
          </p>
          <p className="text-sm">
            <span className="text-green-600 dark:text-green-400">Completed:</span>{' '}
            <span className="font-medium">{completed} SP</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Completion:</span>{' '}
            <span className="font-medium">{data.total > 0 ? Math.round((completed / data.total) * 100) : 0}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Simple theme hook
function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTheme = () => {
      const isDarkMode =
        window.matchMedia('(prefers-color-scheme: dark)').matches ||
        document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    checkTheme();

    // Watch for class changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  return { isDark };
}

export default function VelocityChart({ sprints, selectedCustomer }: VelocityChartProps) {
  const { isDark } = useTheme();

  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const data = useMemo(() => {
    const filteredSprints = selectedCustomer
      ? sprints.filter((s) => s.customer === selectedCustomer)
      : sprints;
    return filteredSprints.slice(0, 10).map((sprint) => ({
      name: formatSprintName(sprint.name),
      total: sprint.metrics?.totalPoints || 0,
      completed: sprint.metrics?.completedPoints || 0,
      customer: sprint.customer || 'N/A',
    }));
  }, [sprints, selectedCustomer]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fill: textColor, fontSize: 12 }}
        />
        <YAxis
          label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fill: textColor }}
          tick={{ fill: textColor }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
          formatter={(value) => (
            <span style={{ color: textColor }}>{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#0066FF"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Total Points"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke="#00C853"
          strokeWidth={2}
          name="Completed Points"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
