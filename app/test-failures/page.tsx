"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useDashboardStore } from "@/lib/store";
import SprintSelector from "@/components/dashboard/SprintSelector";
import { PageHeader } from "@/components/layout/PageHeader";

interface TestFailureData {
  key: string;
  summary: string;
  customer: string;
  taskOwner: string;
  issueType: string;
  currentStatus: string;
  failureCount: number;
  firstFailureDate: string;
  lastFailureDate: string;
  timeInTestFailed: number;
}

export default function TestFailuresPage() {
  const { setCustomer } = useDashboardStore();
  const [failures, setFailures] = useState<TestFailureData[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchFailures = async () => {
    if (!selectedSprintId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/jira/test-failures?sprintId=${selectedSprintId}`);
      const data = await response.json();
      setFailures(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch test failures:', error);
      setFailures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailures();
  }, [selectedSprintId]);

  const totalIssues = failures.length;
  const repeatedFailures = failures.filter(f => f.failureCount > 1).length;
  const maxTimeInFailed = totalIssues > 0 
    ? Math.max(...failures.map(f => f.timeInTestFailed))
    : 0;
  
  const selectedSprint = allSprints.find(s => s.id.toString() === selectedSprintId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <PageHeader title="Test Failures" />
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Failed Geçen Task Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIssues}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tekrarlayan Task Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{repeatedFailures}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Uzun Bekleme Süresi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{maxTimeInFailed}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Çok Tekrarlayan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {failures[0]?.failureCount || 0} kez
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {failures[0]?.key || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Failed Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Issue Key</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Task Owner</th>
                  <th className="px-4 py-3 text-left font-medium">Issue Type</th>
                  <th className="px-4 py-3 text-left font-medium">Tekrar</th>
                  <th className="px-4 py-3 text-left font-medium">Süre (h)</th>
                  <th className="px-4 py-3 text-left font-medium">İlk Test Failed</th>
                  <th className="px-4 py-3 text-left font-medium">Mevcut Durum</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.key} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-mono">
                      <a 
                        href={`https://inveon.atlassian.net/browse/${failure.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {failure.key}
                      </a>
                    </td>
                    <td className="px-4 py-3">{failure.customer}</td>
                    <td className="px-4 py-3">{failure.taskOwner.replace(/ - Inveon$/, '')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{failure.issueType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        failure.failureCount > 2 ? 'text-red-600' :
                        failure.failureCount > 1 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {failure.failureCount} kez
                      </span>
                    </td>
                    <td className="px-4 py-3">{failure.timeInTestFailed}</td>
                    <td className="px-4 py-3 text-xs">
                      {format(new Date(failure.firstFailureDate), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={failure.currentStatus === 'Done' ? 'default' : 'secondary'}
                      >
                        {failure.currentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          )}

          {!loading && failures.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {selectedSprint 
                ? `Bu sprintte (${selectedSprint.name}) hiçbir task test failed statüsüne uğramadı`
                : 'Test Failed statüsünden geçen task bulunamadı'
              }
            </div>
          )}
        </CardContent>
      </Card>
        </main>
    </div>
  );
}
