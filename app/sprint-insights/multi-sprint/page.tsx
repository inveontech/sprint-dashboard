"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface IssueDetail {
  key: string;
  summary: string;
  status: string;
  created: string;
  updated: string;
  daysOpen: number;
  daysSinceUpdate: number;
  assignee: string | null;
  storyPoints: number;
  customer: string;
  sprintCount: number;
  taskOwner: string | null;
  reporter: string | null;
}

interface MultiSprintIssues {
  totalCount: number;
  issues: IssueDetail[];
}

export default function MultiSprintPage() {
  const [issues, setIssues] = useState<IssueDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());

  const fetchMultiSprintIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jira/multi-sprint-issues`);
      const data: MultiSprintIssues = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to fetch multi-sprint issues:', error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMultiSprintIssues();
  }, []);

  // Group issues by status
  const issuesByStatus = issues.reduce((acc, issue) => {
    if (!acc[issue.status]) {
      acc[issue.status] = [];
    }
    acc[issue.status].push(issue);
    return acc;
  }, {} as Record<string, IssueDetail[]>);

  // Define status order
  const statusOrder = [
    'Waiting Estimates',
    'To Do',
    'In Progress',
    'PM Approval',
    'Waiting PM',
    'Waiting for Customer',
    'Waiting for Environment',
    'Waiting Domain',
    'PR Requested',
    'Merge Requested',
    'Merged'
  ];

  // Sort statuses for display using defined order
  const statuses = Object.keys(issuesByStatus).sort((a, b) => {
    const indexA = statusOrder.indexOf(a);
    const indexB = statusOrder.indexOf(b);
    // If status is not in the order list, put it at the end
    const orderA = indexA === -1 ? statusOrder.length : indexA;
    const orderB = indexB === -1 ? statusOrder.length : indexB;
    return orderA - orderB;
  });

  const toggleStatus = (status: string) => {
    const newSet = new Set(expandedStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setExpandedStatuses(newSet);
  };

  // Calculate totals
  const totalTasks = issues.length;
  const totalStoryPoints = issues.reduce((sum, issue) => sum + issue.storyPoints, 0);
  const avgDaysOpen = issues.length > 0 
    ? (issues.reduce((sum, issue) => sum + issue.daysOpen, 0) / issues.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <PageHeader title="Multi-Sprint Insights" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Toplam İş</p>
            <div className="text-3xl font-semibold">{totalTasks}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">adet task</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Toplam Story Points</p>
            <div className="text-3xl font-semibold">{totalStoryPoints}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">SP</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ort. Açık Süresi</p>
            <div className="text-3xl font-semibold">{avgDaysOpen}<span className="text-lg text-gray-500">g</span></div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">gün</p>
          </div>
        </Card>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          Veriler yükleniyor...
        </div>
      )}

      {!loading && issues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Veri bulunamadı
        </div>
      )}

      {/* Issues by Status */}
      {!loading && issues.length > 0 && (
        <div className="space-y-3">
          {statuses.map((status) => (
            <Card key={status} className="overflow-hidden">
              <div
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-4 flex items-center justify-between transition-colors"
                onClick={() => toggleStatus(status)}
              >
                <div className="flex-1">
                  <p className="font-medium">{status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {issuesByStatus[status].length} task • {issuesByStatus[status].reduce((sum, i) => sum + i.storyPoints, 0)} SP
                  </p>
                </div>

                <div className="text-gray-400">
                  {expandedStatuses.has(status) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {expandedStatuses.has(status) && issuesByStatus[status].length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
                  <div className="space-y-2">
                    {issuesByStatus[status].map((issue) => (
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
                            <span>{issue.customer}</span>
                            <span className="font-medium">{issue.daysOpen}g açık</span>
                            <span className="font-medium">{issue.daysSinceUpdate}g güncellenmedi</span>
                          </div>
                          {issue.assignee && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Assignee:</span> {issue.assignee}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <div className="text-right text-xs">
                            <Badge variant="outline" className="block mb-1">{issue.sprintCount} sprints</Badge>
                            <Badge variant="outline" className="block mb-1">{issue.storyPoints}SP</Badge>
                            <Badge variant="outline">{issue.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
