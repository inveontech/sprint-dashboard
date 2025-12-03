"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import CustomerSelector from "@/components/dashboard/CustomerSelector";
import { PageHeader } from "@/components/layout/PageHeader";

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
  waitingForCustomer: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  waitingForEnvironment: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  mergeRequested: {
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
  const [sprintName, setSprintName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedTopIssues, setExpandedTopIssues] = useState(false);

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
      
      if (data.sprintName) {
        setSprintName(data.sprintName);
        setMetrics(Array.isArray(data.metrics) ? data.metrics : []);
      } else {
        // Backward compatibility
        setMetrics(Array.isArray(data) ? data : []);
      }
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
  const avgWaitingForCustomer = metrics.reduce((sum, m) => sum + m.waitingForCustomer.avgWaitDays, 0) / (metrics.length || 1);
  const avgMergeRequested = metrics.reduce((sum, m) => sum + m.mergeRequested.avgWaitDays, 0) / (metrics.length || 1);
  const avgMerged = metrics.reduce((sum, m) => sum + m.merged.avgWaitDays, 0) / (metrics.length || 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <PageHeader title="PM Dashboard" />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <CustomerSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ort. Waiting PM</p>
          <div className="text-3xl font-semibold">{avgWaitingPM.toFixed(1)}<span className="text-lg text-gray-500">g</span></div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Ortalama bekleme süresi</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ort. Waiting Customer</p>
          <div className="text-3xl font-semibold">{avgWaitingForCustomer.toFixed(1)}<span className="text-lg text-gray-500">g</span></div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Ortalama bekleme süresi</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ort. Merge Req</p>
          <div className="text-3xl font-semibold">{avgMergeRequested.toFixed(1)}<span className="text-lg text-gray-500">g</span></div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Ortalama bekleme süresi</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ort. Merged</p>
          <div className="text-3xl font-semibold">{avgMerged.toFixed(1)}<span className="text-lg text-gray-500">g</span></div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Ortalama bekleme süresi</p>
        </div>
      </div>

      {/* Top 5 Waiting Issues */}
      {!loading && metrics.length > 0 && (
        <div className="mb-8">
          <div
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between transition-colors"
            onClick={() => setExpandedTopIssues(!expandedTopIssues)}
          >
            <div>
              <h2 className="text-lg font-semibold">Top 5 En Çok Bekleyen İşler</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">En uzun süre güncellenmemiş 5 işi gösterir</p>
            </div>
            <div className="text-gray-400">
              {expandedTopIssues ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>

          {expandedTopIssues && (
            <div className="mt-3 space-y-2">
              {(() => {
                // Collect all issues from all customers and sort by daysSinceUpdate
                const allIssues = metrics.flatMap(m => m.issues);
                const topIssues = allIssues
                  .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
                  .slice(0, 5);
                
                return topIssues.map((issue) => (
                  <div key={issue.key} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded text-sm">
                    <div className="flex-1">
                      <a
                        href={`https://inveon.atlassian.net/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {issue.key}
                      </a>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {issue.summary}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{issue.daysOpen}g açık</span>
                        <span className="font-medium">{issue.daysSinceUpdate}g güncellenmedi</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">{issue.status}</Badge>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

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
        <div className="space-y-3">
          {metrics.map((customerMetrics) => (
            <div key={customerMetrics.customer} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 flex items-center justify-between transition-colors"
                onClick={() => setExpandedCustomer(
                  expandedCustomer === customerMetrics.customer ? null : customerMetrics.customer
                )}
              >
                <div className="flex-1">
                  <p className="font-medium">{customerMetrics.customer}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{customerMetrics.totalTasks} task</p>
                </div>
                
                <div className="grid grid-cols-5 gap-3 flex-1 mx-6">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">PM Approval</p>
                    <p className="font-semibold">{customerMetrics.pmApproval.avgWaitDays.toFixed(1)}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{customerMetrics.pmApproval.count} task</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">Waiting PM</p>
                    <p className="font-semibold">{customerMetrics.waitingPM.avgWaitDays.toFixed(1)}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{customerMetrics.waitingPM.count} task</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">Waiting Customer</p>
                    <p className="font-semibold">{customerMetrics.waitingForCustomer.avgWaitDays.toFixed(1)}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{customerMetrics.waitingForCustomer.count} task</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">Merge Req</p>
                    <p className="font-semibold">{customerMetrics.mergeRequested.avgWaitDays.toFixed(1)}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{customerMetrics.mergeRequested.count} task</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 whitespace-nowrap">Merged</p>
                    <p className="font-semibold">{customerMetrics.merged.avgWaitDays.toFixed(1)}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{customerMetrics.merged.count} task</p>
                  </div>
                </div>

                <div className="text-gray-400">
                  {expandedCustomer === customerMetrics.customer ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {expandedCustomer === customerMetrics.customer && customerMetrics.issues.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
                  <div className="space-y-2">
                    {customerMetrics.issues.map((issue) => (
                      <div key={issue.key} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded text-sm">
                        <div className="flex-1">
                          <a
                            href={`https://inveon.atlassian.net/browse/${issue.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {issue.key}
                          </a>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {issue.summary}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{issue.daysOpen}g açık</span>
                            <span className="font-medium">{issue.daysSinceUpdate}g güncellenmedi</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{issue.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
