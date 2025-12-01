'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/PageHeader';

interface OverworkIssue {
  key: string;
  summary: string;
  status: string;
  storyPoints: number;
  customer: string;
  assignee?: string;
  taskOwner?: string;
  issueType?: string;
  priority?: string;
  created?: string;
  daysOpen: number;
  daysSinceUpdate: number;
  timeEstimate: number;
  timeSpent: number;
  workratio: number;
  dueDate?: string;
}

export default function OverworkIssuesPage() {
  const [issues, setIssues] = useState<OverworkIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverworkIssues = async () => {
      try {
        setLoading(true);
        console.log('Fetching from /api/jira/overwork...');
        const response = await fetch('/api/jira/overwork');
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          setError(`API error: ${response.status} ${response.statusText}`);
          setLoading(false);
          return;
        }
        
        const result = await response.json();
        console.log('API result:', result);

        if (result.success) {
          setIssues(result.issues);
          console.log('Issues loaded:', result.issues.length);
        } else {
          setError(result.error || 'Failed to fetch overwork issues');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to fetch from Jira: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOverworkIssues();
  }, []);

  const getStatusColor = (status: string) => {
    if (!status) return 'outline';
    const normalized = status.toLowerCase();
    if (normalized.includes('done') || normalized.includes('closed')) return 'default';
    if (normalized.includes('progress')) return 'secondary';
    return 'outline';
  };

  const getPriorityColor = (priority: string) => {
    if (!priority) return 'outline';
    const normalized = priority.toLowerCase();
    if (normalized === 'highest' || normalized === 'critical') return 'secondary';
    if (normalized === 'high') return 'secondary';
    return 'outline';
  };

  const getJiraUrl = (issueKey: string) => {
    return `https://inveon.atlassian.net/browse/${issueKey}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0h';
    const hours = Math.round(seconds / 3600);
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <PageHeader title="Overwork Issues" description="Tahminden fazla çalışılan görevleri izleyin" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold mt-2">{issues.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Time Ratio</p>
              <p className="text-2xl font-bold mt-2">
                {issues.length > 0 ? Math.round(issues.reduce((sum, i) => sum + (i.workratio || 0), 0) / issues.length) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Days Open</p>
              <p className="text-2xl font-bold mt-2">
                {issues.length > 0 ? Math.round(issues.reduce((sum, i) => sum + i.daysOpen, 0) / issues.length) : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Time Spent</p>
              <p className="text-2xl font-bold mt-2">
                {formatTime(issues.reduce((sum, i) => sum + (i.timeSpent || 0), 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Issues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Overwork Issues List ({issues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No overwork issues found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Time Ratio</TableHead>
                    <TableHead className="whitespace-nowrap">Est / Spent</TableHead>
                    <TableHead>Days Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues
                    .sort((a, b) => (b.workratio || 0) - (a.workratio || 0))
                    .map((issue) => (
                      <TableRow key={issue.key}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <a
                            href={getJiraUrl(issue.key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {issue.key}
                          </a>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={issue.summary}>
                            {issue.summary}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(issue.status)}>
                            {issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(issue.priority || '')}>
                            {issue.priority || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.customer}</TableCell>
                        <TableCell>{issue.assignee}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${
                            (issue.workratio || 0) > 150
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {issue.workratio || 0}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatTime(issue.timeEstimate)} / {formatTime(issue.timeSpent)}
                        </TableCell>
                        <TableCell className={`text-sm font-semibold ${
                          issue.daysOpen > 20
                            ? 'text-purple-500 dark:text-purple-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {issue.daysOpen}d
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
