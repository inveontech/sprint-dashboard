"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useDashboardStore } from "@/lib/store";
import SprintSelector from "@/components/dashboard/SprintSelector";
import { PageHeader } from "@/components/layout/PageHeader";

interface OverdueIssue {
  key: string;
  summary: string;
  dueDate: string;
  resolutionDate: string;
  overdueDays: number;
  customer: string;
}

interface DeveloperOverdueData {
  developer: string;
  totalTasks: number;
  overdueTasks: number;
  overduePercentage: number;
  avgOverdueDays: number;
  issues: OverdueIssue[];
}

export default function OverdueTasksPage() {
  const { setCustomer } = useDashboardStore();
  const [developers, setDevelopers] = useState<DeveloperOverdueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDev, setExpandedDev] = useState<string | null>(null);
  const [allSprints, setAllSprints] = useState<any[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  // Fetch all sprints for selector
  useEffect(() => {
    const fetchAllSprints = async () => {
      try {
        const response = await fetch('/api/jira/sprints?sprints=6');
        const data = await response.json();
        if (data.sprints && data.sprints.length > 0) {
          setAllSprints(data.sprints);
          if (!selectedSprintId) {
            setSelectedSprintId(data.sprints[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Failed to fetch sprints:', error);
      }
    };
    fetchAllSprints();
  }, []);

  const fetchOverdue = async () => {
    if (!selectedSprintId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/jira/overdue?sprintId=${selectedSprintId}`);
      const data = await response.json();
      // Ensure data is an array
      setDevelopers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error);
      setDevelopers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, [selectedSprintId]);

  const totalOverdue = Array.isArray(developers) ? developers.reduce((sum, d) => sum + d.overdueTasks, 0) : 0;
  const totalTasks = Array.isArray(developers) ? developers.reduce((sum, d) => sum + d.totalTasks, 0) : 0;
  const avgPercentage = totalTasks > 0 ? Math.round((totalOverdue / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <PageHeader title="Overdue Tasks" />
            <SprintSelector
            sprints={allSprints}
            selectedMode={selectedSprintId}
            onModeChange={setSelectedSprintId}
            loading={loading}
          />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Toplam Gecikmeli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">/ {totalTasks} görev</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ortalama Gecikme Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{avgPercentage}%</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tüm developerlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Yüksek Gecikme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{developers[0]?.overduePercentage || 0}%</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {developers[0]?.developer || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Developer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Developer Bazlı Gecikme Oranları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Developer</th>
                  <th className="px-4 py-3 text-left font-medium">Toplam Görev</th>
                  <th className="px-4 py-3 text-left font-medium">Gecikmeli</th>
                  <th className="px-4 py-3 text-left font-medium">Gecikme %</th>
                  <th className="px-4 py-3 text-left font-medium">Ort. Gecikme (Gün)</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {developers.map((dev) => (
                  <>
                    <tr key={dev.developer} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium">{dev.developer}</td>
                      <td className="px-4 py-3">{dev.totalTasks}</td>
                      <td className="px-4 py-3 text-red-600">{dev.overdueTasks}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          dev.overduePercentage > 30 ? 'text-red-600' :
                          dev.overduePercentage > 15 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {dev.overduePercentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{dev.avgOverdueDays}</td>
                      <td className="px-4 py-3">
                        {dev.issues.length > 0 && (
                          <button
                            onClick={() => setExpandedDev(expandedDev === dev.developer ? null : dev.developer)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {expandedDev === dev.developer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedDev === dev.developer && dev.issues.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="text-xs">
                            <div className="font-medium mb-2">En Gecikmeli Görevler:</div>
                            <table className="w-full">
                              <thead className="border-b">
                                <tr>
                                  <th className="py-2 text-left">Issue Key</th>
                                  <th className="py-2 text-left">Customer</th>
                                  <th className="py-2 text-left">Due Date</th>
                                  <th className="py-2 text-left">Tamamlanma</th>
                                  <th className="py-2 text-left">Gecikme</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dev.issues.map((issue) => (
                                  <tr key={issue.key} className="border-b">
                                    <td className="py-2 font-mono">
                                      <a 
                                        href={`https://inveon.atlassian.net/browse/${issue.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {issue.key}
                                      </a>
                                    </td>
                                    <td className="py-2">{issue.customer}</td>
                                    <td className="py-2">{format(new Date(issue.dueDate), 'dd MMM yyyy')}</td>
                                    <td className="py-2">{format(new Date(issue.resolutionDate), 'dd MMM yyyy')}</td>
                                    <td className="py-2 text-red-600 font-medium">+{issue.overdueDays} gün</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          )}

          {!loading && developers.length === 0 && (
            <div className="text-center py-8 text-gray-500">Gecikmeli görev bulunamadı</div>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
