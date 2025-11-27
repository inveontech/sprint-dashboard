'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Issue {
  key: string;
  summary: string;
  status: string;
  storyPoints: number;
  customer: string;
  assignee?: string;
  priority?: string;
  issueType?: string;
}

interface SprintData {
  sprint: {
    id: number;
    name: string;
    state: string;
    startDate: string;
    endDate: string;
  };
  issues: Issue[];
  metrics: {
    totalPoints: number;
    completedPoints: number;
    completionRate: number;
    bugCount: number;
  };
}

export default function SprintDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sprintId = params.id as string;
  const customerFilter = searchParams.get('customer');

  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get unique issue types and statuses
  const issueTypes = data ? ['all', ...Array.from(new Set(data.issues.map(i => i.issueType).filter(Boolean)))] : ['all'];
  const statuses = data ? ['all', ...Array.from(new Set(data.issues.map(i => i.status).filter(Boolean)))] : ['all'];

  // Filter issues by issue type and status
  const filteredIssues = data?.issues.filter(issue => 
    (issueTypeFilter === 'all' || issue.issueType === issueTypeFilter) &&
    (statusFilter === 'all' || issue.status === statusFilter)
  ) || [];

  useEffect(() => {
    const fetchSprintData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (customerFilter) {
          queryParams.append('customer', customerFilter);
        }
        const url = `/api/jira/sprint/${sprintId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch sprint data');
        }
      } catch (err) {
        setError('Failed to fetch sprint data');
      } finally {
        setLoading(false);
      }
    };

    fetchSprintData();
  }, [sprintId, customerFilter]);

  const getStatusColor = (status: string) => {
    if (!status) return 'outline';
    const normalized = status.toLowerCase();
    if (normalized.includes('done') || normalized.includes('closed')) return 'default';
    if (normalized.includes('progress')) return 'secondary';
    return 'outline';
  };

  const getJiraUrl = (issueKey: string) => {
    return `https://inveon.atlassian.net/browse/${issueKey}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'No data found'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {customerFilter && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Marka Filtresi: {customerFilter}
              </p>
            )}
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'Tümü' : status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Issue Type:</label>
                <select
                  value={issueTypeFilter}
                  onChange={(e) => setIssueTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  {issueTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'Tümü' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold mt-2">{filteredIssues.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Story Points</p>
              <p className="text-2xl font-bold mt-2">{data.metrics.totalPoints} SP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed Story Points</p>
              <p className="text-2xl font-bold mt-2">{data.metrics.completedPoints} SP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold mt-2">{data.metrics.completionRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Issues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sprint Task Listesi ({filteredIssues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>SP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues
                    .sort((a, b) => {
                      const statusOrder = [
                        'grooming',
                        'to do',
                        'in progress',
                        'waiting for environment',
                        'pm approval',
                        'waiting pm',
                        'waiting domain',
                        'pr requested',
                        'merge requested',
                        'merged',
                        'done',
                        'canceled',
                        'wont do',
                        'cr rejected'
                      ];
                      const statusA = (a.status || '').toLowerCase();
                      const statusB = (b.status || '').toLowerCase();
                      const indexA = statusOrder.indexOf(statusA);
                      const indexB = statusOrder.indexOf(statusB);
                      
                      // If both found in order list, sort by order
                      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                      // If only A found, A comes first
                      if (indexA !== -1) return -1;
                      // If only B found, B comes first
                      if (indexB !== -1) return 1;
                      // If neither found, alphabetical sort
                      return statusA.localeCompare(statusB, 'tr', { sensitivity: 'base' });
                    })
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
                      <TableCell className="max-w-md">
                        <div className="truncate" title={issue.summary}>
                          {issue.summary}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(issue.status)}>
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{issue.customer}</TableCell>
                      <TableCell>{issue.issueType || 'N/A'}</TableCell>
                      <TableCell>{issue.assignee || 'Unassigned'}</TableCell>
                      <TableCell>{issue.storyPoints}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 dark:bg-gray-800 font-bold border-t-2">
                    <TableCell colSpan={6} className="text-right">Toplam SP:</TableCell>
                    <TableCell>{filteredIssues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
