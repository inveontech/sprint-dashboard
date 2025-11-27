"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import CustomerSelector from "@/components/dashboard/CustomerSelector";

interface PMMetrics {
  customer: string;
  totalTasks: number;
  pmApproval: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  waitingPM: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  merged: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  issues: Array<{
    key: string;
    summary: string;
    status: string;
    created: string;
    daysOpen: number;
    daysSinceUpdate: number;
    assignee: string | null;
  }>;
}

export default function PMDashboardPage() {
  const { selectedCustomer, setCustomer } = useDashboardStore();
  const [metrics, setMetrics] = useState<PMMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCustomer) {
        params.append('customer', selectedCustomer);
      }
      
      const response = await fetch(`/api/jira/pm-metrics?${params.toString()}`);
      const data = await response.json();
      setMetrics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch PM metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedCustomer]);

  const totalTasks = metrics.reduce((sum, m) => sum + m.totalTasks, 0);
  const avgPMApproval = metrics.reduce((sum, m) => sum + m.pmApproval.avgWaitDays, 0) / (metrics.length || 1);
  const avgWaitingPM = metrics.reduce((sum, m) => sum + m.waitingPM.avgWaitDays, 0) / (metrics.length || 1);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">PM Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Marka bazında PM statülerinde bekleme süreleri
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <CustomerSelector />
            <Button onClick={fetchMetrics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Toplam Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">PM statülerinde</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ort. PM Approval Bekleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{avgPMApproval.toFixed(1)} gün</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Ortalama</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ort. Waiting PM Bekleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgWaitingPM.toFixed(1)} gün</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Ortalama</p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          Veriler yükleniyor...
        </div>
      )}

      {!loading && metrics.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Veri bulunamadı
        </div>
      )}

      {/* Customer Metrics Table */}
      {!loading && metrics.length > 0 && (
        <div className="space-y-4">
          {metrics.map((customerMetrics) => (
            <Card key={customerMetrics.customer}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setExpandedCustomer(
                  expandedCustomer === customerMetrics.customer ? null : customerMetrics.customer
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{customerMetrics.customer}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {customerMetrics.totalTasks} task
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 flex-1">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">PM Approval</div>
                      <div className="text-lg font-bold text-orange-600">
                        {customerMetrics.pmApproval.avgWaitDays.toFixed(1)}d
                      </div>
                      <div className="text-xs text-gray-500">{customerMetrics.pmApproval.count} task</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Waiting PM</div>
                      <div className="text-lg font-bold text-blue-600">
                        {customerMetrics.waitingPM.avgWaitDays.toFixed(1)}d
                      </div>
                      <div className="text-xs text-gray-500">{customerMetrics.waitingPM.count} task</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Merged</div>
                      <div className="text-lg font-bold text-green-600">
                        {customerMetrics.merged.avgWaitDays.toFixed(1)}d
                      </div>
                      <div className="text-xs text-gray-500">{customerMetrics.merged.count} task</div>
                    </div>
                  </div>
                  {expandedCustomer === customerMetrics.customer ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </CardHeader>

              {expandedCustomer === customerMetrics.customer && customerMetrics.issues.length > 0 && (
                <CardContent>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">PM Statüsündeki Tasklar</h3>
                    <div className="space-y-2">
                      {customerMetrics.issues.map((issue) => (
                        <div key={issue.key} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex-1">
                            <a
                              href={`https://inveon.atlassian.net/browse/${issue.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {issue.key}
                            </a>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {issue.summary}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>Oluşturulma: {new Date(issue.created).toLocaleDateString('tr-TR')}</span>
                              <span className="text-orange-600 font-medium">{issue.daysOpen} gün açık</span>
                              <span className="text-red-600 font-medium">{issue.daysSinceUpdate} gün güncellenmedi</span>
                              {issue.assignee && (
                                <span className="text-blue-600 font-medium">👤 {issue.assignee}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <Badge variant="outline">{issue.status}</Badge>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
                                {issue.daysOpen.toFixed(1)} gün
                              </div>
                              <div className="text-xs text-gray-500">toplam açık</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
